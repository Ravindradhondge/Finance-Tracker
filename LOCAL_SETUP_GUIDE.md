# Ledger Finance Tracker — Local Setup Guide

## Step 1: Install PostgreSQL

Download and install PostgreSQL from: https://www.postgresql.org/download/
- During installation, you will be asked to SET A PASSWORD for the `postgres` user.
- **Write this password down — you will need it.**
- Default port: `5432` (leave this as-is)

---

## Step 2: Open the SQL Shell (psql)

After installing PostgreSQL, open **pgAdmin** or the **SQL Shell (psql)** from your Start Menu (Windows) or Applications (Mac).

In the SQL Shell, it will ask:
```
Server [localhost]:        → just press Enter
Database [postgres]:       → just press Enter
Port [5432]:               → just press Enter
Username [postgres]:       → just press Enter
Password for user postgres: → type the password you set during installation
```

---

## Step 3: Run These SQL Commands (copy-paste exactly)

Once you are inside the SQL shell (`postgres=#`), run these commands **one by one**:

### 3a. Create the database
```sql
CREATE DATABASE ledger;
```

### 3b. Connect to it
```sql
\c ledger
```

### 3c. Create the categories table
```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT,
  type TEXT NOT NULL DEFAULT 'both',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3d. Create the transactions table
```sql
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  amount NUMERIC(12, 2) NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3e. Create the budgets table
```sql
CREATE TABLE budgets (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT budgets_category_month_unique UNIQUE (category_id, month)
);
```

### 3f. Seed the default categories
```sql
INSERT INTO categories (name, color, icon, type) VALUES
  ('Salary', '#10b981', 'briefcase', 'income'),
  ('Freelance', '#3b82f6', 'code', 'income'),
  ('Food & Dining', '#f97316', 'utensils', 'expense'),
  ('Transport', '#8b5cf6', 'car', 'expense'),
  ('Housing', '#ef4444', 'home', 'expense'),
  ('Entertainment', '#ec4899', 'tv', 'expense'),
  ('Shopping', '#f59e0b', 'shopping-bag', 'expense'),
  ('Health', '#14b8a6', 'heart', 'expense'),
  ('Utilities', '#6366f1', 'zap', 'expense'),
  ('Education', '#8b5cf6', 'book', 'expense'),
  ('Personal', '#f59e0b', 'users', 'expense'),
  ('Loan Repayment', '#ef4444', 'credit-card', 'expense');
```

---

## Step 4: Create the .env file

In the project folder, create a file called `.env` and paste this inside it (replace YOUR_PASSWORD with the password you set in Step 1):

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ledger
SESSION_SECRET=mysecretkey123
PORT=3000
```

Example if your password is `mypass123`:
```
DATABASE_URL=postgresql://postgres:mypass123@localhost:5432/ledger
SESSION_SECRET=mysecretkey123
PORT=3000
```

The .env file should go in these locations:
- `artifacts/api-server/.env`

---

## Step 5: Install Node.js and pnpm

1. Download Node.js (v18 or newer): https://nodejs.org
2. After installing Node.js, open a terminal/command prompt and run:
   ```
   npm install -g pnpm
   ```

---

## Step 6: Start the App

Open TWO terminal windows in the project folder:

**Terminal 1 — Backend (API):**
```bash
pnpm install
pnpm --filter @workspace/api-server run dev
```

**Terminal 2 — Frontend (Website):**
```bash
pnpm --filter @workspace/finance-tracker run dev
```

Then open your browser and go to: **http://localhost:5173**

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `password authentication failed` | Check your password in the .env DATABASE_URL |
| `database "ledger" does not exist` | Run `CREATE DATABASE ledger;` in psql again |
| `port already in use` | Change `PORT=3001` in the .env file |
| `pnpm not found` | Run `npm install -g pnpm` first |
| `cannot connect to server` | Make sure PostgreSQL is running (check Services on Windows) |
