import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, CheckCircle2, XCircle, Loader2, X, IndianRupee, ArrowUpRight, ArrowDownRight, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ParsedTx = {
  date: string;
  description: string;
  type: "income" | "expense";
  amount: number;
  categoryId: number | null;
  categoryName: string | null;
  selected: boolean;
};

type Step = "upload" | "preview" | "done";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function PhonePeImportDialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<ParsedTx[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reset = () => {
    setStep("upload");
    setLoading(false);
    setError(null);
    setTransactions([]);
    setImporting(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(reset, 300);
  };

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".pdf") && file.type !== "application/pdf") {
      setError("Please upload a PhonePe PDF statement file.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      const res = await fetch(`${API_BASE}/api/import/phonepe/preview`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse PDF");
      const txs: ParsedTx[] = data.transactions.map((tx: Omit<ParsedTx, "selected">) => ({
        ...tx,
        selected: true,
      }));
      setTransactions(txs);
      setStep("preview");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const toggleAll = (val: boolean) => setTransactions((prev) => prev.map((tx) => ({ ...tx, selected: val })));
  const toggleOne = (i: number) => setTransactions((prev) => prev.map((tx, idx) => idx === i ? { ...tx, selected: !tx.selected } : tx));

  const selectedCount = transactions.filter((t) => t.selected).length;

  const confirmImport = async () => {
    const selected = transactions.filter((t) => t.selected);
    if (!selected.length) return;
    setImporting(true);
    try {
      const res = await fetch(`${API_BASE}/api/import/phonepe/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: selected.map(({ selected: _, ...tx }) => tx) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      queryClient.invalidateQueries();
      setStep("done");
      toast({ description: `✅ ${data.imported} transactions imported successfully!` });
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "Import failed" });
    } finally {
      setImporting(false);
    }
  };

  const expenseCount = transactions.filter((t) => t.type === "expense" && t.selected).length;
  const incomeCount = transactions.filter((t) => t.type === "income" && t.selected).length;
  const totalExpense = transactions.filter((t) => t.type === "expense" && t.selected).reduce((s, t) => s + t.amount, 0);
  const totalIncome = transactions.filter((t) => t.type === "income" && t.selected).reduce((s, t) => s + t.amount, 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-3xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText size={18} className="text-primary" />
            </div>
            <div>
              <DialogTitle className="font-serif text-lg">Import PhonePe Statement</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Upload your PDF statement to auto-import transactions</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* ── UPLOAD STEP ── */}
          {step === "upload" && (
            <div className="p-6 space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all
                  ${dragging ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/50 hover:bg-muted/30"}`}
              >
                {loading ? (
                  <>
                    <Loader2 size={36} className="text-primary animate-spin" />
                    <p className="text-sm font-medium text-foreground/70">Reading your statement…</p>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Upload size={24} className="text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-foreground/80">Drag & drop your PhonePe PDF here</p>
                      <p className="text-sm text-muted-foreground mt-1">or click to browse your files</p>
                    </div>
                    <span className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full">PDF files only</span>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={onFileChange} />

              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/8 border border-destructive/20 text-sm text-destructive">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <div className="bg-muted/40 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">How to get your statement</p>
                <ol className="text-sm text-muted-foreground space-y-1.5 list-none">
                  <li className="flex gap-2"><span className="text-primary font-bold">1.</span> Open PhonePe app → tap your profile photo</li>
                  <li className="flex gap-2"><span className="text-primary font-bold">2.</span> Go to <strong>Transaction History</strong></li>
                  <li className="flex gap-2"><span className="text-primary font-bold">3.</span> Tap <strong>Download Statement</strong> → select date range → PDF</li>
                  <li className="flex gap-2"><span className="text-primary font-bold">4.</span> Upload that PDF here</li>
                </ol>
              </div>
            </div>
          )}

          {/* ── PREVIEW STEP ── */}
          {step === "preview" && (
            <div className="flex flex-col">
              {/* Summary bar */}
              <div className="px-6 py-4 bg-muted/30 border-b border-border/30 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <ArrowDownRight size={14} className="text-destructive" />
                    <span>{expenseCount} expenses</span>
                    <strong className="text-foreground">₹{totalExpense.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong>
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <ArrowUpRight size={14} className="text-primary" />
                    <span>{incomeCount} income</span>
                    <strong className="text-foreground">₹{totalIncome.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong>
                  </span>
                </div>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => toggleAll(true)} className="text-primary hover:underline font-medium">Select all</button>
                  <span className="text-muted-foreground">·</span>
                  <button onClick={() => toggleAll(false)} className="text-muted-foreground hover:underline">Deselect all</button>
                </div>
              </div>

              {/* Transaction list */}
              <div className="divide-y divide-border/30">
                {transactions.map((tx, i) => (
                  <div
                    key={i}
                    onClick={() => toggleOne(i)}
                    className={`flex items-center gap-3 px-6 py-3 cursor-pointer transition-colors hover:bg-muted/30 ${!tx.selected ? "opacity-40" : ""}`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${tx.selected ? "bg-primary border-primary" : "border-border"}`}>
                      {tx.selected && <CheckCircle2 size={14} className="text-primary-foreground" />}
                    </div>
                    <div className={`w-1.5 h-8 rounded-full shrink-0 ${tx.type === "expense" ? "bg-destructive/60" : "bg-primary/60"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{tx.date} · {tx.categoryName || "Uncategorized"}</p>
                    </div>
                    <div className={`text-sm font-semibold shrink-0 ${tx.type === "expense" ? "text-destructive/80" : "text-primary"}`}>
                      {tx.type === "expense" ? "-" : "+"}₹{tx.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── DONE STEP ── */}
          {step === "done" && (
            <div className="p-10 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-primary" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-medium text-foreground/90">All done!</h3>
                <p className="text-sm text-muted-foreground mt-1">{selectedCount} transactions have been added to your Ledger.</p>
              </div>
              <Button onClick={handleClose} className="mt-2 rounded-xl px-6">Close</Button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {step === "preview" && (
          <div className="px-6 py-4 border-t border-border/40 flex items-center justify-between gap-3 shrink-0 bg-background/80">
            <Button variant="ghost" onClick={reset} className="rounded-xl text-muted-foreground">
              ← Upload different file
            </Button>
            <Button
              onClick={confirmImport}
              disabled={selectedCount === 0 || importing}
              className="rounded-xl px-6 gap-2"
            >
              {importing ? <Loader2 size={16} className="animate-spin" /> : <IndianRupee size={16} />}
              Import {selectedCount} transaction{selectedCount !== 1 ? "s" : ""}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
