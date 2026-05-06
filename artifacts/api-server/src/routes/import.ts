import { Router } from "express";
import { createRequire } from "node:module";
import multer from "multer";
import { db } from "@workspace/db";
import { transactionsTable, categoriesTable } from "@workspace/db/schema";

const _require = createRequire(import.meta.url);
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = _require("pdf-parse");

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// --- Auto-categorizer ---
const CATEGORY_RULES: { keywords: string[]; name: string }[] = [
  { keywords: ["medical", "mediplus", "pharmacy", "wellness", "hospital", "doctor", "clinic", "kapaleshwaar", "jain medical", "health"], name: "Health" },
  { keywords: ["tea", "kitchen", "food", "snack", "restaurant", "cafe", "hotel", "tadka", "vadewala", "dairy", "vegetable", "tiffin", "dhaba", "bhojan", "wada", "chat", "pav", "chai", "sweets", "mithai", "juice", "bakery", "chota don", "tasty", "amrut", "jp food", "udupi", "k k s"], name: "Food & Dining" },
  { keywords: ["station", "petrol", "fuel", "automobile", "bike", "garage", "service station", "motor", "ola", "uber", "rapido", "metro"], name: "Transport" },
  { keywords: ["supermart", "supermarket", "market", "mart", "store", "stationary", "parcel", "shop", "enterprise", "purchase", "mahajan", "avenue", "matoshri"], name: "Shopping" },
  { keywords: ["hotstar", "netflix", "prime", "google play", "youtube", "spotify", "disney", "bookmyshow", "inox", "pvr", "gaming", "jiohotstar"], name: "Entertainment" },
  { keywords: ["recharge", "electricity", "bill", "broadband", "internet", "wifi", "bsnl", "airtel", "jio", "vodafone", "vi ", "dtv", "tata sky"], name: "Utilities" },
  { keywords: ["library", "tuition", "school", "college", "education", "cet", "commissioner", "exam", "fee", "course", "coaching", "books", "shreeram", "ganesh sir"], name: "Education" },
  { keywords: ["mpokket", "lazypay", "jar ", "loan", "emi", "repay", "finance", "credit", "bajaj", "hdfc loan", "sbi loan", "navi", "kreditbee", "cashe"], name: "Loan Repayment" },
  { keywords: ["salary", "payroll", "stipend", "wages", "company"], name: "Salary" },
];

function categorize(description: string, type: string): string | null {
  const lower = description.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.name;
    }
  }
  if (type === "income") return "Freelance";
  return "Personal";
}

const MONTH_MAP: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^\d.,]/g, "").replace(/,/g, "");
  return parseFloat(cleaned) || 0;
}

function parseDate(raw: string): string {
  const m = raw.match(/([A-Z][a-z]{2})\s+(\d{1,2}),?\s+(\d{4})/);
  if (!m) return "";
  const month = MONTH_MAP[m[1]];
  if (!month) return "";
  return `${m[3]}-${month}-${m[2].padStart(2, "0")}`;
}

function isInternalTransfer(desc: string): boolean {
  const lower = desc.toLowerCase();
  return (
    (lower.includes("transfer to") && /x{4,}/i.test(desc)) ||
    (lower.includes("transfer from") && /x{4,}/i.test(desc))
  );
}

// Returns true if string looks like a time value — "09 20 am", "10:28 PM", "09:20:00", etc.
function isTimeString(s: string): boolean {
  return /^\d{1,2}[\s:]\d{2}(\s*(am|pm))?(\s*:\d{2})?$/i.test(s.trim());
}

function cleanDescription(desc: string): string {
  return desc
    .replace(/^Paid to\s+/i, "")
    .replace(/^Payment to\s+/i, "")
    .replace(/^Received from\s+/i, "Received from ")
    .replace(/^Mobile recharged\s+\d+/i, "Mobile Recharge")
    .replace(/\s+/g, " ")
    .trim();
}

type ParsedTx = {
  date: string;
  description: string;
  type: "income" | "expense";
  amount: number;
  categoryName: string | null;
};

// Strategy 1: match full row on one line (with any currency symbol or none before number)
function strategy1(text: string): ParsedTx[] {
  const results: ParsedTx[] = [];
  const re = /([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})\s+(.+?)\s+(DEBIT|CREDIT)\s+[^\d\n\r]*([\d,]+\.?\d*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const date = parseDate(m[1]);
    if (!date) continue;
    const desc = m[2].replace(/\s+/g, " ").trim();
    if (!desc || desc.length < 2) continue;
    // Skip if description is just a time value
    if (isTimeString(desc)) continue;
    const type = m[3] === "CREDIT" ? "income" : "expense";
    const amount = parseAmount(m[4]);
    if (amount <= 0) continue;
    if (isInternalTransfer(desc)) continue;
    results.push({ date, description: cleanDescription(desc), type, amount, categoryName: categorize(desc, type) });
  }
  return results;
}

// Strategy 2: line-by-line scan — find lines containing a date, then look for
// DEBIT/CREDIT + amount on that same line or the next non-empty line
function strategy2(text: string): ParsedTx[] {
  const results: ParsedTx[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const dateRe = /^([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})\s+(.*)/;
  const typeAmtRe = /(DEBIT|CREDIT)[^\d]*([\d,]+\.?\d*)/;

  for (let i = 0; i < lines.length; i++) {
    const dateMatch = lines[i].match(dateRe);
    if (!dateMatch) continue;

    const date = parseDate(dateMatch[1]);
    if (!date) continue;

    const block = [lines[i]];
    for (let j = 1; j <= 3 && i + j < lines.length; j++) {
      const next = lines[i + j];
      if (/^[A-Z][a-z]{2}\s+\d{1,2},/.test(next)) break;
      block.push(next);
    }
    const blockText = block.join(" ");

    const taMatch = blockText.match(typeAmtRe);
    if (!taMatch) continue;

    const type = taMatch[1] === "CREDIT" ? "income" : "expense";
    const amount = parseAmount(taMatch[2]);
    if (amount <= 0) continue;

    const descMatch = blockText.match(/^[A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4}\s+(.+?)\s+(DEBIT|CREDIT)/);
    let desc = descMatch ? descMatch[1].trim() : dateMatch[2].trim();

    // If description is a time, try to get text from lines after DEBIT/CREDIT instead
    if (isTimeString(desc)) {
      const afterDebitIdx = blockText.search(/(DEBIT|CREDIT)[^\d]*([\d,]+\.?\d*)/);
      if (afterDebitIdx !== -1) {
        const afterDebit = blockText.substring(afterDebitIdx).replace(/(DEBIT|CREDIT)[^\d]*([\d,]+\.?\d*)\s*/i, "").trim();
        if (afterDebit.length >= 2 && !isTimeString(afterDebit)) {
          desc = afterDebit;
        }
      }
    }

    if (!desc || desc.length < 2 || isTimeString(desc)) continue;
    if (isInternalTransfer(desc)) continue;

    results.push({ date, description: cleanDescription(desc), type, amount, categoryName: categorize(desc, type) });
  }
  return results;
}

// Strategy 3: find all DEBIT/CREDIT occurrences, then look backwards for a date
// and also forwards for the merchant name (newer PhonePe format puts merchant AFTER the amount)
function strategy3(text: string): ParsedTx[] {
  const results: ParsedTx[] = [];
  const re = /(DEBIT|CREDIT)\s*[^\d\r\n]*([\d,]+\.?\d*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const amount = parseAmount(m[2]);
    if (amount <= 0) continue;
    const type = m[1] === "CREDIT" ? "income" : "expense";

    // Look backwards up to 300 chars for a date
    const before = text.substring(Math.max(0, m.index - 300), m.index);
    const dateMatches = [...before.matchAll(/([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})/g)];
    if (!dateMatches.length) continue;
    const lastDateStr = dateMatches[dateMatches.length - 1][1];
    const date = parseDate(lastDateStr);
    if (!date) continue;

    // Description: text between the date and DEBIT/CREDIT
    const dateEnd = before.lastIndexOf(lastDateStr) + lastDateStr.length;
    let desc = before.substring(dateEnd).replace(/\s+/g, " ").trim();

    // If description is a time or empty, look AFTER the amount for the merchant name
    if (!desc || desc.length < 2 || isTimeString(desc)) {
      const afterMatch = text.substring(m.index + m[0].length);
      // Grab the next line(s) after the amount — merchant names appear there in newer PhonePe format
      const lines = afterMatch.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      for (const line of lines.slice(0, 3)) {
        // Stop if we hit another date or another DEBIT/CREDIT
        if (/^[A-Z][a-z]{2}\s+\d{1,2},/.test(line)) break;
        if (/(DEBIT|CREDIT)/i.test(line)) break;
        // Skip pure time strings, pure numbers, very short strings
        if (isTimeString(line)) continue;
        if (/^[\d.,\s₹]+$/.test(line)) continue;
        if (line.length < 3) continue;
        desc = line;
        break;
      }
    }

    if (!desc || desc.length < 2 || isTimeString(desc)) continue;
    if (isInternalTransfer(desc)) continue;

    results.push({ date, description: cleanDescription(desc), type, amount, categoryName: categorize(desc, type) });
  }
  return results;
}

// Strategy 4: newer PhonePe format — date + time on one line, merchant on next, then DEBIT/CREDIT
// Example line pattern: "Apr 03, 2026  09:20 AM" followed by "Merchant Name" then "DEBIT  ₹20"
function strategy4(text: string): ParsedTx[] {
  const results: ParsedTx[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    // Look for a line that is just a date (possibly with time)
    const dateLineMatch = lines[i].match(/^([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})(\s+\d{1,2}[\s:]\d{2}(\s*(am|pm))?)?$/i);
    if (!dateLineMatch) continue;

    const date = parseDate(dateLineMatch[1]);
    if (!date) continue;

    // Next few lines: look for merchant name, then DEBIT/CREDIT + amount
    let desc = "";
    let type: "income" | "expense" | null = null;
    let amount = 0;

    for (let j = 1; j <= 5 && i + j < lines.length; j++) {
      const line = lines[i + j];

      // If it looks like a new date, stop
      if (/^[A-Z][a-z]{2}\s+\d{1,2},/.test(line)) break;

      const typeAmtMatch = line.match(/(DEBIT|CREDIT)\s*[^\d]*([\d,]+\.?\d*)/i);
      if (typeAmtMatch) {
        type = typeAmtMatch[1].toUpperCase() === "CREDIT" ? "income" : "expense";
        amount = parseAmount(typeAmtMatch[2]);
        break;
      }

      // Skip time-only lines
      if (isTimeString(line)) continue;
      // Skip lines that are just numbers/amounts
      if (/^[\d.,\s₹]+$/.test(line)) continue;
      // Use as description if we don't have one yet
      if (!desc && line.length >= 3) {
        desc = line;
      }
    }

    if (!desc || !type || amount <= 0) continue;
    if (isInternalTransfer(desc)) continue;

    results.push({ date, description: cleanDescription(desc), type, amount, categoryName: categorize(desc, type) });
  }
  return results;
}

function dedup(txs: ParsedTx[]): ParsedTx[] {
  const seen = new Set<string>();
  return txs.filter((tx) => {
    const key = `${tx.date}|${tx.type}|${tx.amount}|${tx.description.slice(0, 20)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parsePhonePeText(text: string): ParsedTx[] {
  const normalised = text.replace(/[ \t]+/g, " ");

  let results = strategy1(normalised);
  if (results.length > 0) {
    console.log(`[import] Strategy 1 matched ${results.length} transactions`);
    return dedup(results);
  }

  results = strategy2(normalised);
  if (results.length > 0) {
    console.log(`[import] Strategy 2 matched ${results.length} transactions`);
    return dedup(results);
  }

  results = strategy4(normalised);
  if (results.length > 0) {
    console.log(`[import] Strategy 4 matched ${results.length} transactions`);
    return dedup(results);
  }

  results = strategy3(normalised);
  console.log(`[import] Strategy 3 matched ${results.length} transactions`);
  return dedup(results);
}

// POST /api/import/phonepe/preview
router.post("/import/phonepe/preview", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const data = await pdfParse(req.file.buffer);

    console.log("[import] PDF text sample (first 1000 chars):\n", data.text.slice(0, 1000));
    console.log("[import] Total text length:", data.text.length);

    const parsed = parsePhonePeText(data.text);

    if (parsed.length === 0) {
      const sample = data.text.slice(0, 500).replace(/\n/g, " | ");
      return res.status(422).json({
        error: "No transactions found. Make sure you uploaded a PhonePe statement PDF.",
        debug_sample: sample,
      });
    }

    const categories = await db.select().from(categoriesTable);
    const catMap = Object.fromEntries(categories.map((c) => [c.name, c.id]));

    const transactions = parsed.map((tx) => ({
      ...tx,
      categoryId: tx.categoryName ? (catMap[tx.categoryName] ?? null) : null,
    }));

    return res.json({ transactions, total: transactions.length });
  } catch (err: any) {
    console.error("[import] Error:", err);
    return res.status(500).json({ error: err.message || "Failed to parse PDF" });
  }
});

// POST /api/import/phonepe/debug — returns raw extracted text (for troubleshooting)
router.post("/import/phonepe/debug", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const data = await pdfParse(req.file.buffer);
    return res.json({
      length: data.text.length,
      pages: data.numpages,
      sample: data.text.slice(0, 2000),
      charCodes: [...data.text.slice(0, 100)].map((c) => ({ char: c, code: c.charCodeAt(0) })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/import/phonepe/confirm
router.post("/import/phonepe/confirm", async (req, res) => {
  try {
    const { transactions } = req.body as {
      transactions: Array<{
        date: string;
        description: string;
        type: "income" | "expense";
        amount: number;
        categoryId: number | null;
      }>;
    };

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: "No transactions provided" });
    }

    // Validate each row before attempting inserts
    const rows = transactions
      .filter((tx) => tx.date && tx.description?.trim() && tx.type && tx.amount > 0)
      .map((tx) => ({
        amount: String(tx.amount),
        type: tx.type,
        description: tx.description.trim(),
        date: tx.date,
        categoryId: tx.categoryId ?? null,
      }));

    if (rows.length === 0) {
      return res.status(400).json({ error: "No valid transactions to import" });
    }

    // Batch inserts in chunks of 100 to avoid hitting PostgreSQL parameter limits
    const CHUNK_SIZE = 100;
    let totalInserted = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const inserted = await db
        .insert(transactionsTable)
        .values(chunk)
        .returning({ id: transactionsTable.id });
      totalInserted += inserted.length;
    }

    return res.json({ imported: totalInserted });
  } catch (err: any) {
    console.error("[import] confirm error:", err);
    return res.status(500).json({ error: err.message || "Failed to import transactions" });
  }
});

export default router;
