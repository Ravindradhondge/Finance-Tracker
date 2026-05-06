import { useMonthContext } from "@/hooks/use-month";
import { useUser } from "@/hooks/use-user";
import {
  useGetMonthlySummary, getGetMonthlySummaryQueryKey,
  useGetCategorySummary, getGetCategorySummaryQueryKey,
  useGetMonthlyTrends, getGetMonthlyTrendsQueryKey,
  useGetTransactions, getGetTransactionsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, Legend
} from "recharts";
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, TrendingDown, Sparkles, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { Link } from "wouter";
import { TransactionFormDialog } from "@/components/transactions/TransactionFormDialog";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function Dashboard() {
  const { month } = useMonthContext();
  const { name } = useUser();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const { data: summary, isLoading: isLoadingSummary } = useGetMonthlySummary(
    { month },
    { query: { queryKey: getGetMonthlySummaryQueryKey({ month }) } }
  );
  const { data: categorySummary, isLoading: isLoadingCats } = useGetCategorySummary(
    { month },
    { query: { queryKey: getGetCategorySummaryQueryKey({ month }) } }
  );
  const { data: trends, isLoading: isLoadingTrends } = useGetMonthlyTrends(
    undefined,
    { query: { queryKey: getGetMonthlyTrendsQueryKey() } }
  );
  const { data: transactions, isLoading: isLoadingTx } = useGetTransactions(
    { month },
    { query: { queryKey: getGetTransactionsQueryKey({ month }) } }
  );

  const recentTransactions = transactions?.slice(0, 6) || [];
  const expensesByCategory = categorySummary?.filter(c => c.total > 0) || [];
  const topCategory = expensesByCategory[0];

  const income = summary?.totalIncome || 0;
  const expenses = summary?.totalExpenses || 0;
  const savings = summary?.savings || 0;
  const savingsRate = summary?.savingsRate || 0;
  const txCount = transactions?.length || 0;
  const dailyAvg = expenses > 0 && txCount > 0 ? expenses / new Date().getDate() : 0;

  const CHART_COLORS = [
    "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
    "hsl(var(--chart-4))", "hsl(var(--chart-5))"
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {name && (
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              {greeting}, {name.split(" ")[0]} 👋
            </h2>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            Here's your financial snapshot for <span className="font-semibold text-foreground">{format(parseISO(`${month}-01`), "MMMM yyyy")}</span>
          </p>
        </div>
        <Button
          className="rounded-xl shadow-sm shrink-0 gap-2"
          onClick={() => setIsFormOpen(true)}
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add Transaction</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          title="Income"
          amount={income}
          icon={ArrowUpRight}
          color="text-emerald-500"
          bg="bg-emerald-500/10"
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Expenses"
          amount={expenses}
          icon={ArrowDownRight}
          color="text-red-500"
          bg="bg-red-500/10"
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Savings"
          amount={savings}
          icon={Wallet}
          color="text-primary"
          bg="bg-primary/10"
          subtitle={savingsRate > 0 ? `${savingsRate.toFixed(0)}% rate` : undefined}
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Daily Avg"
          amount={dailyAvg}
          icon={TrendingDown}
          color="text-orange-500"
          bg="bg-orange-500/10"
          subtitle={`${txCount} transactions`}
          isLoading={isLoadingSummary || isLoadingTx}
        />
      </div>

      {/* Quick insights strip */}
      {!isLoadingSummary && !isLoadingCats && (topCategory || savingsRate > 0) && (
        <div className="flex flex-wrap gap-2">
          {topCategory && (
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5 text-sm shadow-sm">
              <Sparkles size={14} className="text-primary" />
              <span className="text-muted-foreground">Top spend:</span>
              <span className="font-semibold" style={{ color: topCategory.categoryColor || "currentColor" }}>
                {topCategory.categoryName}
              </span>
              <span className="font-bold text-foreground">₹{topCategory.total.toFixed(0)}</span>
            </div>
          )}
          {savingsRate > 0 && (
            <div className={`flex items-center gap-2 border rounded-xl px-4 py-2.5 text-sm shadow-sm ${
              savingsRate >= 20 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-orange-500/5 border-orange-500/20"
            }`}>
              <TrendingUp size={14} className={savingsRate >= 20 ? "text-emerald-500" : "text-orange-500"} />
              <span className="font-semibold text-foreground">{savingsRate.toFixed(1)}% saved</span>
              <Badge variant="secondary" className={`text-xs ${savingsRate >= 20 ? "bg-emerald-500/10 text-emerald-600" : "bg-orange-500/10 text-orange-600"}`}>
                {savingsRate >= 30 ? "Excellent" : savingsRate >= 20 ? "Good" : savingsRate >= 10 ? "Fair" : "Low"}
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        {/* Donut chart */}
        <Card className="lg:col-span-2 shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Spending Breakdown</CardTitle>
            <CardDescription>By category this month</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingCats ? (
              <Skeleton className="h-[200px] w-full rounded-xl" />
            ) : expensesByCategory.length > 0 ? (
              <>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={75}
                        paddingAngle={3} dataKey="total" stroke="none"
                      >
                        {expensesByCategory.map((entry, i) => (
                          <Cell key={i} fill={entry.categoryColor || CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => [`₹${v.toFixed(0)}`, "Amount"]}
                        contentStyle={{ borderRadius: "10px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-2">
                  {expensesByCategory.slice(0, 5).map((cat, i) => {
                    const pct = expenses > 0 ? (cat.total / expenses * 100) : 0;
                    return (
                      <div key={cat.categoryName} className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.categoryColor || CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-xs text-muted-foreground flex-1 truncate">{cat.categoryName}</span>
                        <span className="text-xs font-semibold text-muted-foreground">{pct.toFixed(0)}%</span>
                        <span className="text-xs font-bold text-foreground">₹{cat.total.toFixed(0)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <TrendingDown size={20} className="opacity-30" />
                </div>
                <p className="text-sm">No expenses yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trend chart */}
        <Card className="lg:col-span-3 shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">6-Month Trend</CardTitle>
            <CardDescription>Income vs Expenses over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTrends ? (
              <Skeleton className="h-[260px] w-full rounded-xl" />
            ) : trends && trends.length > 0 ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                    <XAxis
                      dataKey="month"
                      axisLine={false} tickLine={false}
                      tickFormatter={(v) => { try { return format(parseISO(`${v}-01`), "MMM"); } catch { return v; } }}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      dy={8}
                    />
                    <YAxis
                      axisLine={false} tickLine={false}
                      tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: "10px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                      formatter={(v: number, name) => [`₹${v.toFixed(0)}`, name === "income" ? "Income" : "Expenses"]}
                      labelFormatter={(l) => { try { return format(parseISO(`${l}-01`), "MMMM yyyy"); } catch { return l; } }}
                    />
                    <Area type="monotone" dataKey="income" name="Income" stroke="hsl(var(--chart-2))" strokeWidth={2.5} fill="url(#gIncome)" dot={false} />
                    <Area type="monotone" dataKey="expenses" name="Expenses" stroke="hsl(var(--chart-4))" strokeWidth={2.5} fill="url(#gExpense)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TrendingUp size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Add transactions to see trends</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Recent Transactions</CardTitle>
              <CardDescription>Latest activity this month</CardDescription>
            </div>
            <Link href="/transactions">
              <Button variant="ghost" size="sm" className="text-primary text-xs font-semibold rounded-lg">
                View all →
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoadingTx ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : recentTransactions.length > 0 ? (
            <div className="space-y-1">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.type === "income" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    }`}>
                      {tx.type === "income" ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{tx.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-muted-foreground">{format(parseISO(tx.date), "MMM d")}</span>
                        {tx.categoryName && (
                          <>
                            <span className="text-muted-foreground/30">·</span>
                            <span className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                              style={tx.categoryColor ? { color: tx.categoryColor, backgroundColor: `${tx.categoryColor}15` } : {}}>
                              {tx.categoryName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`font-bold text-sm tabular-nums ${tx.type === "income" ? "text-emerald-500" : "text-foreground"}`}>
                    {tx.type === "income" ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-muted-foreground">
              <Wallet size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No transactions this month</p>
              <p className="text-xs mt-1">Click "Add Transaction" to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey({ month }) });
            queryClient.invalidateQueries({ queryKey: getGetMonthlySummaryQueryKey({ month }) });
          }
        }}
        transactionId={null}
        month={month}
      />
    </div>
  );
}

function StatCard({ title, amount, icon: Icon, color, bg, subtitle, isLoading }: {
  title: string; amount: number; icon: any; color: string; bg: string; subtitle?: string; isLoading?: boolean;
}) {
  return (
    <Card className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">{title}</p>
            {isLoading ? (
              <Skeleton className="h-7 w-20 mt-2" />
            ) : (
              <p className="text-xl md:text-2xl font-bold text-foreground mt-1 tabular-nums">
                ₹{amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
            )}
            {subtitle && !isLoading && (
              <p className="text-xs text-muted-foreground mt-1 font-medium">{subtitle}</p>
            )}
          </div>
          <div className={`p-2.5 rounded-xl shrink-0 ${bg}`}>
            <Icon size={18} className={color} strokeWidth={2.5} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
