import { useState } from "react";
import { useMonthContext } from "@/hooks/use-month";
import { 
  useGetTransactions, getGetTransactionsQueryKey,
  useDeleteTransaction,
  useGetCategories, getGetCategoriesQueryKey
} from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, ArrowDownRight, Plus, MoreHorizontal, Pencil, Trash2, Search, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TransactionFormDialog } from "@/components/transactions/TransactionFormDialog";
import PhonePeImportDialog from "@/components/import/PhonePeImportDialog";
import { useToast } from "@/hooks/use-toast";

export default function Transactions() {
  const { month } = useMonthContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const { data: transactions, isLoading } = useGetTransactions(
    { month },
    { query: { queryKey: getGetTransactionsQueryKey({ month }) } }
  );

  const deleteMutation = useDeleteTransaction();

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to remove this entry?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey({ month }) });
          toast({ description: "Entry removed gracefully." });
        }
      });
    }
  };

  const filteredTransactions = transactions?.filter(tx => {
    if (filterType !== "all" && tx.type !== filterType) return false;
    if (search && !tx.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }) || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 bg-card/50 p-1 rounded-xl border border-border/50 shadow-sm w-full sm:w-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`rounded-lg ${filterType === 'all' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
            onClick={() => setFilterType('all')}
          >
            All
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`rounded-lg ${filterType === 'expense' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
            onClick={() => setFilterType('expense')}
          >
            Expenses
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`rounded-lg ${filterType === 'income' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
            onClick={() => setFilterType('income')}
          >
            Income
          </Button>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input 
              placeholder="Search entries..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card/50 border-border/50 rounded-xl"
            />
          </div>
          <Button
            variant="outline"
            className="rounded-xl px-4 gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
            onClick={() => setIsImportOpen(true)}
          >
            <FileUp size={16} /> Import PDF
          </Button>
          <Button 
            className="rounded-xl shadow-sm px-4" 
            onClick={() => { setEditingId(null); setIsFormOpen(true); }}
          >
            <Plus size={18} className="mr-1.5" /> Write
          </Button>
        </div>
      </div>

      <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="divide-y divide-border/30">
            {filteredTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 sm:p-5 hover:bg-muted/30 transition-colors group">
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className={`w-12 h-12 rounded-full flex shrink-0 items-center justify-center ${tx.type === 'income' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {tx.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                  </div>
                  <div>
                    <p className="font-medium text-base text-foreground/90">{tx.description}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-sm font-medium text-muted-foreground">{format(parseISO(tx.date), "MMM d, yyyy")}</span>
                      {tx.categoryName && (
                        <>
                          <span className="text-muted-foreground/30 text-xs hidden sm:inline">•</span>
                          <Badge variant="outline" className="bg-background/50 text-xs font-medium border-border/50 py-0 h-5" style={tx.categoryColor ? { color: tx.categoryColor, borderColor: `${tx.categoryColor}40`, backgroundColor: `${tx.categoryColor}10` } : {}}>
                            {tx.categoryName}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 sm:gap-6">
                  <span className={`font-serif text-lg tracking-tight ${tx.type === 'income' ? 'text-primary' : 'text-foreground'}`}>
                    {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                  </span>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100">
                        <MoreHorizontal size={18} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 rounded-xl">
                      <DropdownMenuItem onClick={() => { setEditingId(tx.id); setIsFormOpen(true); }}>
                        <Pencil size={16} className="mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(tx.id)}>
                        <Trash2 size={16} className="mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Search size={24} className="opacity-20" />
            </div>
            <p className="text-lg font-serif">No entries found.</p>
            <p className="text-sm mt-1">Try adjusting your filters or write a new one.</p>
          </div>
        )}
      </div>

      <TransactionFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        transactionId={editingId} 
        month={month}
      />

      <PhonePeImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
      />
    </div>
  );
}
