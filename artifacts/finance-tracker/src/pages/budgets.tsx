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
import { Badge } from "@/components/ui/badge";
import { Target, AlertCircle, CheckCircle2, PlusCircle, TrendingDown } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

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
          toast({ description: "Budget updated." });
        },
        onError: () => {
          toast({ variant: "destructive", description: "Failed to update budget." });
        }
      }
    );
  };

  const expenseCategories = categories?.filter(c => c.type === "expense" || c.type === "both") || [];

  const totalBudgeted = budgets?.reduce((s, b) => s + (b.amount || 0), 0) || 0;
  const totalSpent = budgets?.reduce((s, b) => s + (b.spent || 0), 0) || 0;
  const categoriesWithBudget = budgets?.filter(b => b.amount > 0).length || 0;
  const overspentCount = budgets?.filter(b => b.amount > 0 && (b.spent || 0) > b.amount).length || 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Monthly Budgets</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Set spending limits for <span className="font-semibold text-foreground">{format(parseISO(`${month}-01`), "MMMM yyyy")}</span>
        </p>
      </div>

      {/* Summary cards */}
      {!isBudgetsLoading && categoriesWithBudget > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="shadow-sm border-border/60">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Budget</p>
              <p className="text-xl font-bold text-foreground mt-1">₹{totalBudgeted.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/60">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Spent</p>
              <p className={`text-xl font-bold mt-1 ${totalSpent > totalBudgeted ? "text-red-500" : "text-foreground"}`}>
                ₹{totalSpent.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/60">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Remaining</p>
              <p className={`text-xl font-bold mt-1 ${totalBudgeted - totalSpent < 0 ? "text-red-500" : "text-emerald-500"}`}>
                ₹{Math.abs(totalBudgeted - totalSpent).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                {totalBudgeted - totalSpent < 0 && " over"}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/60">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xl font-bold text-foreground">{categoriesWithBudget}</p>
                <Badge variant="secondary" className={`text-xs ${overspentCount > 0 ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-600"}`}>
                  {overspentCount > 0 ? `${overspentCount} over` : "On track"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Budget cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isBudgetsLoading || isCategoriesLoading ? (
          Array(6).fill(0).map((_, i) => (
            <Card key={i} className="shadow-sm border-border/60">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : expenseCategories.length > 0 ? (
          expenseCategories.map(category => {
            const budget = budgets?.find(b => b.categoryId === category.id);
            const isEditing = editingId === category.id;
            const amount = budget?.amount || 0;
            const spent = budget?.spent || 0;
            const percentUsed = amount > 0 ? (spent / amount) * 100 : 0;
            const remaining = amount - spent;
            const overspent = spent > amount && amount > 0;
            const isGood = amount > 0 && percentUsed <= 75;
            const isWarning = amount > 0 && percentUsed > 75 && percentUsed <= 100;

            return (
              <Card key={category.id} className={`shadow-sm border-border/60 hover:shadow-md transition-all ${
                overspent ? "border-red-500/30 bg-red-500/5" : ""
              }`}>
                <CardContent className="p-5">
                  {/* Category header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${category.color}20`, color: category.color }}
                      >
                        <Target size={16} strokeWidth={2.5} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{category.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{category.type}</p>
                      </div>
                    </div>

                    {/* Amount / edit */}
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          autoFocus
                          placeholder="0"
                          className="w-24 h-8 text-right bg-background border-border/60 rounded-lg text-sm"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveBudget(category.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                        />
                        <Button size="sm" className="h-8 rounded-lg px-3" onClick={() => handleSaveBudget(category.id)}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 rounded-lg px-2" onClick={() => setEditingId(null)}>
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <button
                        className="text-right hover:opacity-70 transition-opacity"
                        onClick={() => { setEditingId(category.id); setEditAmount(amount > 0 ? amount.toString() : ""); }}
                      >
                        {amount > 0 ? (
                          <div>
                            <p className="text-base font-bold text-foreground">₹{amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                            <p className="text-xs text-muted-foreground">budget</p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-primary text-xs font-semibold">
                            <PlusCircle size={13} />
                            Set budget
                          </div>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Progress */}
                  {amount > 0 && (
                    <div className="space-y-2">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            overspent ? "bg-red-500" : isWarning ? "bg-orange-400" : "bg-primary"
                          }`}
                          style={{ width: `${Math.min(percentUsed, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium">
                          ₹{spent.toLocaleString("en-IN", { maximumFractionDigits: 0 })} spent
                        </span>
                        {overspent ? (
                          <span className="text-red-500 font-bold flex items-center gap-1">
                            <AlertCircle size={11} />
                            ₹{Math.abs(remaining).toLocaleString("en-IN", { maximumFractionDigits: 0 })} over
                          </span>
                        ) : isGood ? (
                          <span className="text-emerald-500 font-bold flex items-center gap-1">
                            <CheckCircle2 size={11} />
                            ₹{remaining.toLocaleString("en-IN", { maximumFractionDigits: 0 })} left
                          </span>
                        ) : (
                          <span className="text-orange-500 font-bold">
                            ₹{remaining.toLocaleString("en-IN", { maximumFractionDigits: 0 })} left
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="w-full bg-muted rounded-full h-1" />
                        <span className={`text-xs font-bold ml-2 shrink-0 ${
                          overspent ? "text-red-500" : isWarning ? "text-orange-500" : "text-muted-foreground"
                        }`}>{Math.round(percentUsed)}%</span>
                      </div>
                    </div>
                  )}

                  {amount === 0 && (
                    <div className="mt-2 py-2 border border-dashed border-border/60 rounded-xl text-center">
                      <p className="text-xs text-muted-foreground">No budget set · click to add one</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full">
            <Card className="shadow-sm border-border/60 border-dashed">
              <CardContent className="py-16 text-center text-muted-foreground">
                <TrendingDown size={32} className="mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-base text-foreground">No expense categories yet</p>
                <p className="text-sm mt-1">Create categories first, then set budgets for them.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
