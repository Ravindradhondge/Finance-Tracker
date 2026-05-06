import { useMonthContext } from "@/hooks/use-month";
import {
  useGetMonthlyTrends, getGetMonthlyTrendsQueryKey,
  useGetCategorySummary, getGetCategorySummaryQueryKey,
  useGetTransactions, getGetTransactionsQueryKey,
  useGetMonthlySummary, getGetMonthlySummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, getDay } from "date-fns";
import { TrendingUp, TrendingDown, BarChart3, PieChart as PieIcon, Calendar } from "lucide-react";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CHART_COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))"
];

export default function Reports() {
  const { month } = useMonthContext();

  const { data: trends, isLoading: isLoadingTrends } = useGetMonthlyTrends(
    undefined,
    { query: { queryKey: getGetMonthlyTrendsQueryKey() } }
  );
  const { data: categorySummary, isLoading: isLoadingCats } = useGetCategorySummary(
    { month },
    { query: { queryKey: getGetCategorySummaryQueryKey({ month }) } }
  );
  const { data: transactions, isLoading: isLoadingTx } = useGetTransactions(
    { month },
    { query: { queryKey: getGetTransactionsQueryKey({ month }) } }
  );
  const { data: summary, isLoading: isLoadingSummary } = useGetMonthlySummary(
    { month },
    { query: { queryKey: getGetMonthlySummaryQueryKey({ month }) } }
  );

  // Spending by day of week
  const spendByDay = Array(7).fill(0).map((_, i) => ({ day: DAY_NAMES[i], amount: 0, count: 0 }));
  transactions?.filter(t => t.type === "expense").forEach(tx => {
    const dow = getDay(parseISO(tx.date));
    spendByDay[dow].amount += tx.amount;
    spendByDay[dow].count += 1;
  });

  // Savings rate trend
  const savingsTrend = trends?.map(t => ({
    month: t.month,
    savings: t.income - t.expenses,
    savingsRate: t.income > 0 ? Math.round(((t.income - t.expenses) / t.income) * 100) : 0,
  })) || [];

  // Net income by month (bar chart)
  const incomeExpenseData = trends?.map(t => ({
    month: t.month,
    income: t.income,
    expenses: t.expenses,
    net: t.income - t.expenses,
  })) || [];

  const expensesByCategory = categorySummary?.filter(c => c.total > 0).slice(0, 6) || [];
  const totalExpenses = summary?.totalExpenses || 0;

  const maxDaySpend = Math.max(...spendByDay.map(d => d.amount), 1);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Financial Reports</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Deep insights into your spending and saving patterns
        </p>
      </div>

      {/* Summary metrics */}
      {!isLoadingSummary && summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card className="shadow-sm border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp size={14} className="text-emerald-500" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Savings</span>
              </div>
              <p className={`text-2xl font-bold ${summary.savings >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {summary.savings >= 0 ? "+" : ""}₹{summary.savings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">this month</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 size={14} className="text-primary" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Save Rate</span>
              </div>
              <p className={`text-2xl font-bold ${(summary.savingsRate || 0) >= 20 ? "text-emerald-500" : "text-orange-500"}`}>
                {(summary.savingsRate || 0).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">{(summary.savingsRate || 0) >= 20 ? "Great job!" : "Aim for 20%+"}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-border/60 col-span-2 md:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <TrendingDown size={14} className="text-orange-500" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg/Day</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                ₹{(totalExpenses / new Date().getDate()).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">daily spending avg</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Income vs Expenses bar chart */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-primary" />
            <CardTitle className="text-base font-bold">Income vs Expenses</CardTitle>
          </div>
          <CardDescription>Monthly comparison over time</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTrends ? (
            <Skeleton className="h-[260px] w-full rounded-xl" />
          ) : incomeExpenseData.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeExpenseData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }} barGap={4} barCategoryGap="30%">
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
                    formatter={(v: number, name) => [`₹${v.toLocaleString("en-IN")}`, name === "income" ? "Income" : "Expenses"]}
                    labelFormatter={(l) => { try { return format(parseISO(`${l}-01`), "MMMM yyyy"); } catch { return l; } }}
                  />
                  <Legend formatter={(v) => <span className="text-xs capitalize font-medium">{v}</span>} />
                  <Bar dataKey="income" name="income" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="expenses" name="expenses" fill="hsl(var(--chart-4))" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">No data yet</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-column row: savings rate trend + spending by category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Savings Rate Trend */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" />
              <CardTitle className="text-base font-bold">Savings Rate Trend</CardTitle>
            </div>
            <CardDescription>% of income saved each month</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTrends ? (
              <Skeleton className="h-[220px] w-full rounded-xl" />
            ) : savingsTrend.length > 0 ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={savingsTrend} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
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
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: "10px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                      formatter={(v: number) => [`${v}%`, "Savings Rate"]}
                      labelFormatter={(l) => { try { return format(parseISO(`${l}-01`), "MMMM yyyy"); } catch { return l; } }}
                    />
                    <Line
                      type="monotone" dataKey="savingsRate"
                      stroke="hsl(var(--chart-2))" strokeWidth={2.5}
                      dot={{ r: 4, fill: "hsl(var(--chart-2))", strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                <p className="text-sm">Not enough data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category breakdown */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <PieIcon size={16} className="text-primary" />
              <CardTitle className="text-base font-bold">Category Breakdown</CardTitle>
            </div>
            <CardDescription>Where your money goes this month</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingCats ? (
              <Skeleton className="h-[220px] w-full rounded-xl" />
            ) : expensesByCategory.length > 0 ? (
              <div className="space-y-3">
                {expensesByCategory.map((cat, i) => {
                  const pct = totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0;
                  return (
                    <div key={cat.categoryName}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.categoryColor || CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="font-medium text-foreground">{cat.categoryName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground font-medium">{pct.toFixed(1)}%</span>
                          <span className="font-bold text-foreground">₹{cat.total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: cat.categoryColor || CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <PieIcon size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No expenses this month</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Spending by day of week */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-primary" />
            <CardTitle className="text-base font-bold">Spending by Day of Week</CardTitle>
          </div>
          <CardDescription>Which days you spend the most this month</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTx ? (
            <Skeleton className="h-[180px] w-full rounded-xl" />
          ) : (
            <div className="flex items-end justify-around gap-2 h-[180px] px-2">
              {spendByDay.map((day) => {
                const heightPct = maxDaySpend > 0 ? (day.amount / maxDaySpend) * 100 : 0;
                const isMax = day.amount === maxDaySpend && day.amount > 0;
                return (
                  <div key={day.day} className="flex flex-col items-center gap-2 flex-1">
                    <div className="text-xs font-bold text-foreground">
                      {day.amount > 0 ? `₹${day.amount >= 1000 ? `${(day.amount / 1000).toFixed(0)}k` : day.amount.toFixed(0)}` : ""}
                    </div>
                    <div className="w-full flex items-end" style={{ height: "110px" }}>
                      <div
                        className={`w-full rounded-t-lg transition-all duration-700 ${isMax ? "bg-primary" : "bg-primary/30"}`}
                        style={{ height: `${Math.max(heightPct, day.amount > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                    <div className="text-xs font-semibold text-muted-foreground">{day.day}</div>
                    {day.count > 0 && (
                      <div className="text-[10px] text-muted-foreground/60">{day.count} txn</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
