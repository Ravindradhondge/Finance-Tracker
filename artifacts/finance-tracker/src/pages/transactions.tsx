import { useState } from "react";
import { useMonthContext } from "@/hooks/use-month";
import {
  useGetTransactions, getGetTransactionsQueryKey,
  useDeleteTransaction,
  useGetCategories, getGetCategoriesQueryKey
} from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, ArrowDownRight, Plus, Pencil, Trash2, Search, FileUp, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionFormDialog } from "@/components/transactions/TransactionFormDialog";
import PhonePeImportDialog from "@/components/import/PhonePeImportDialog";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

export default function Transactions() {
  const { month } = useMonthContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const { data: transactions, isLoading } = useGetTransactions(
    { month },
    { query: { queryKey: getGetTransactionsQueryKey({ month }) } }
  );

  const deleteMutation = useDeleteTransaction();

  const handleDelete = (id: number) => {
    if (confirm("Remove this transaction?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey({ month }) });
          toast({ description: "Transaction removed." });
        }
      });
    }
  };

  const filtered = (transactions || [])
    .filter(tx => {
      if (filterType !== "all" && tx.type !== filterType) return false;
      if (search && !tx.description.toLowerCase().includes(search.toLowerCase()) &&
        !(tx.categoryName || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "amount") return b.amount - a.amount;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  const totalIncome = filtered.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, tx) => {
    const d = tx.date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(tx);
    return acc;
  }, {});

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        {/* Search + actions row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-card border-border/60 rounded-xl text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl h-10 gap-1.5 border-border/60 shrink-0"
            onClick={() => setIsImportOpen(true)}
          >
            <FileUp size={14} />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button
            size="sm"
            className="rounded-xl h-10 gap-1.5 shadow-sm shrink-0"
            onClick={() => { setEditingId(null); setIsFormOpen(true); }}
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type filter pills */}
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1 border border-border/40">
            {(["all", "income", "expense"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterType === type
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {type === "all" ? "All" : type === "income" ? "Income" : "Expenses"}
              </button>
            ))}
          </div>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "date" | "amount")}>
            <SelectTrigger className="w-auto h-9 text-xs rounded-xl border-border/60 bg-card gap-1.5">
              <SlidersHorizontal size={13} />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="date" className="text-xs">Sort: Date</SelectItem>
              <SelectItem value="amount" className="text-xs">Sort: Amount</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground font-medium">
            {filterType !== "expense" && (
              <span className="text-emerald-500 font-bold">+₹{totalIncome.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
            )}
            {filterType !== "income" && (
              <span className="text-red-500 font-bold">-₹{totalExpense.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
            )}
          </div>
        </div>
      </div>

      {/* Transaction list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, txs]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {format(parseISO(date), "EEEE, MMM d")}
                </p>
                <div className="flex-1 h-px bg-border/60" />
                <p className="text-xs font-semibold text-muted-foreground">
                  {txs.filter(t => t.type === "expense").length > 0 &&
                    `-₹${txs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
                  }
                </p>
              </div>
              <Card className="shadow-sm border-border/60 overflow-hidden">
                <CardContent className="p-0">
                  {txs.map((tx, idx) => (
                    <div
                      key={tx.id}
                      className={`flex items-center justify-between px-4 py-3.5 hover:bg-muted/40 active:bg-muted/60 transition-colors group ${
                        idx < txs.length - 1 ? "border-b border-border/40" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-10 h-10 rounded-xl flex shrink-0 items-center justify-center ${
                          tx.type === "income" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                        }`}>
                          {tx.type === "income" ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{tx.description}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {tx.categoryName && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-md font-semibold"
                                style={tx.categoryColor ? { color: tx.categoryColor, backgroundColor: `${tx.categoryColor}18` } : {}}
                              >
                                {tx.categoryName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-bold text-sm tabular-nums ${tx.type === "income" ? "text-emerald-500" : "text-foreground"}`}>
                          {tx.type === "income" ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </span>

                        {/* Edit/Delete — always visible on mobile, hover-only on desktop */}
                        <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                            onClick={() => { setEditingId(tx.id); setIsFormOpen(true); }}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(tx.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <Card className="shadow-sm border-border/60">
          <CardContent className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <div className="w-14 h-14 rounded-2xl bg-muted/70 flex items-center justify-center">
              <Search size={22} className="opacity-30" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-base text-foreground">No transactions found</p>
              <p className="text-sm mt-1">Try adjusting your filters or add a new transaction.</p>
            </div>
            <Button
              size="sm"
              className="rounded-xl mt-1"
              onClick={() => { setEditingId(null); setIsFormOpen(true); }}
            >
              <Plus size={15} className="mr-1.5" /> Add Transaction
            </Button>
          </CardContent>
        </Card>
      )}

      <TransactionFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        transactionId={editingId}
        month={month}
      />
      <PhonePeImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  );
}
