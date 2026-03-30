import { useState } from "react";
import { useMonthContext } from "@/hooks/use-month";
import { 
  useGetBudgets, getGetBudgetsQueryKey,
  useCreateBudget,
  useGetCategories,
  getGetMonthlySummaryQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Budgets() {
  const { month } = useMonthContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: budgets, isLoading: isBudgetsLoading } = useGetBudgets(
    { month },
    { query: { queryKey: getGetBudgetsQueryKey({ month }) } }
  );

  const { data: categories, isLoading: isCategoriesLoading } = useGetCategories();
  
  const createMutation = useCreateBudget();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const handleSaveBudget = (categoryId: number) => {
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: "destructive", description: "Please enter a valid amount." });
      return;
    }

    createMutation.mutate(
      { data: { categoryId, month, amount } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetBudgetsQueryKey({ month }) });
          queryClient.invalidateQueries({ queryKey: getGetMonthlySummaryQueryKey({ month }) });
          setEditingId(null);
          toast({ description: "Intention updated." });
        },
        onError: () => {
          toast({ variant: "destructive", description: "Failed to update intention." });
        }
      }
    );
  };

  const expenseCategories = categories?.filter(c => c.type === 'expense' || c.type === 'both') || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-serif font-medium tracking-tight mb-3">Monthly Intentions</h2>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Set gentle limits for your spending categories. This isn't about restriction, but aligning your money with your values.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {isBudgetsLoading || isCategoriesLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="bg-card/40 backdrop-blur-sm border-border/50 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))
        ) : expenseCategories.length > 0 ? (
          expenseCategories.map(category => {
            const budget = budgets?.find(b => b.categoryId === category.id);
            const isEditing = editingId === category.id;
            
            // If no budget is set, amount is 0, percent is 0
            const amount = budget?.amount || 0;
            const spent = budget?.spent || 0;
            const percentUsed = budget?.percentUsed || 0;
            const remaining = amount > 0 ? amount - spent : 0;
            const overspent = spent > amount && amount > 0;

            return (
              <Card key={category.id} className="bg-card/40 backdrop-blur-sm border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-background border border-border/50 shadow-sm" style={{ color: category.color }}>
                        <Target size={16} />
                      </div>
                      <span className="font-medium text-lg text-foreground/90">{category.name}</span>
                    </div>
                    
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number" 
                          autoFocus
                          placeholder="Amount" 
                          className="w-24 h-8 text-right bg-background border-border/50 rounded-lg"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveBudget(category.id)}
                        />
                        <Button size="sm" className="h-8 rounded-lg" onClick={() => handleSaveBudget(category.id)}>Save</Button>
                        <Button size="sm" variant="ghost" className="h-8 rounded-lg" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="text-right cursor-pointer group" onClick={() => { setEditingId(category.id); setEditAmount(amount ? amount.toString() : ""); }}>
                        {amount > 0 ? (
                          <>
                            <p className="font-serif text-lg tracking-tight group-hover:text-primary transition-colors">${amount.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Budget</p>
                          </>
                        ) : (
                          <span className="text-sm text-primary underline underline-offset-4 decoration-primary/30 hover:decoration-primary transition-colors">Set Intention</span>
                        )}
                      </div>
                    )}
                  </div>

                  {amount > 0 && (
                    <div className="space-y-3 mt-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">${spent.toFixed(2)} spent</span>
                        {overspent ? (
                          <span className="text-destructive font-medium flex items-center gap-1">
                            <AlertCircle size={14} /> ${Math.abs(remaining).toFixed(2)} over
                          </span>
                        ) : (
                          <span className="text-muted-foreground">${remaining.toFixed(2)} left</span>
                        )}
                      </div>
                      <Progress 
                        value={Math.min(percentUsed, 100)} 
                        className="h-2 bg-muted overflow-hidden rounded-full" 
                        indicatorClassName={overspent ? "bg-destructive" : percentUsed > 85 ? "bg-orange-400" : "bg-primary"}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        ) : (
          <div className="col-span-full p-12 text-center text-muted-foreground bg-card/40 rounded-2xl border border-border/50">
            <p className="text-lg font-serif">No expense categories yet.</p>
            <p className="text-sm mt-1">Create some categories to start setting intentions.</p>
          </div>
        )}
      </div>
    </div>
  );
}
