import { useMonthContext } from "@/hooks/use-month";
import { useUser } from "@/hooks/use-user";
import { 
  useGetMonthlySummary, getGetMonthlySummaryQueryKey, 
  useGetCategorySummary, getGetCategorySummaryQueryKey, 
  useGetMonthlyTrends, getGetMonthlyTrendsQueryKey, 
  useGetTransactions, getGetTransactionsQueryKey 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts";
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, HelpCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";

export default function Dashboard() {
  const { month } = useMonthContext();
  const { name } = useUser();

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
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

  const recentTransactions = transactions?.slice(0, 5) || [];
  const expensesByCategory = categorySummary?.filter(c => c.total > 0) || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Greeting */}
      {name && (
        <div>
          <h2 className="font-serif text-2xl font-medium text-foreground/90 tracking-tight">
            {greeting}, {name.split(" ")[0]} 👋
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Here's how your finances look this month.</p>
        </div>
      )}
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Income" 
          amount={summary?.totalIncome} 
          icon={ArrowUpRight} 
          trend="positive" 
          isLoading={isLoadingSummary} 
        />
        <StatCard 
          title="Expenses" 
          amount={summary?.totalExpenses} 
          icon={ArrowDownRight} 
          trend="negative" 
          isLoading={isLoadingSummary} 
        />
        <StatCard 
          title="Savings" 
          amount={summary?.savings} 
          icon={Wallet} 
          trend="neutral" 
          subtitle={summary?.savingsRate !== undefined ? `${summary.savingsRate.toFixed(1)}% save rate` : undefined} 
          isLoading={isLoadingSummary} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Expenses Chart */}
        <Card className="lg:col-span-1 shadow-sm border-border/50 bg-card/40 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-serif font-medium">Where it went</CardTitle>
            <CardDescription>Spending by category</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingCats ? (
              <Skeleton className="h-[240px] w-full rounded-xl" />
            ) : expensesByCategory.length > 0 ? (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="total"
                      stroke="none"
                    >
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.categoryColor || "hsl(var(--muted))"} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Amount']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[240px] flex flex-col items-center justify-center text-muted-foreground gap-3">
                <HelpCircle size={32} className="opacity-20" />
                <p className="text-sm">No expenses this month</p>
              </div>
            )}
            <div className="space-y-3 mt-4">
              {expensesByCategory.slice(0, 4).map(cat => (
                <div key={cat.categoryName} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.categoryColor || "var(--muted)" }} />
                    <span className="text-muted-foreground">{cat.categoryName}</span>
                  </div>
                  <span className="font-medium">₹{cat.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trend Chart */}
        <Card className="lg:col-span-2 shadow-sm border-border/50 bg-card/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-serif font-medium">6-Month Trajectory</CardTitle>
            <CardDescription>Income vs Expenses</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTrends ? (
              <Skeleton className="h-[300px] w-full rounded-xl" />
            ) : trends && trends.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(val) => {
                        try { return format(parseISO(`${val}-01`), "MMM"); } catch { return val; }
                      }}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(val) => `₹${val}`}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                      formatter={(value: number) => [`₹${value.toFixed(2)}`, '']}
                      labelFormatter={(label) => {
                        try { return format(parseISO(`${label}-01`), "MMMM yyyy"); } catch { return label; }
                      }}
                    />
                    <Area type="monotone" dataKey="income" name="Income" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                    <Area type="monotone" dataKey="expenses" name="Expenses" stroke="hsl(var(--destructive))" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <p>Not enough data for trends</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div>
        <h3 className="font-serif font-medium text-lg mb-4 text-foreground/90">Recent Entries</h3>
        <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden shadow-sm">
          {isLoadingTx ? (
            <div className="p-6 space-y-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : recentTransactions.length > 0 ? (
            <div className="divide-y divide-border/30">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {tx.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tx.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{format(parseISO(tx.date), "MMM d")}</span>
                        {tx.categoryName && (
                          <>
                            <span className="text-muted-foreground/30 text-xs">•</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full block" style={{ backgroundColor: tx.categoryColor || "currentColor" }} />
                              {tx.categoryName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`font-medium ${tx.type === 'income' ? 'text-primary' : 'text-foreground'}`}>
                    {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <p>Your journal is empty this month.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, amount, icon: Icon, trend, subtitle, isLoading }: { title: string, amount?: number, icon: any, trend: 'positive' | 'negative' | 'neutral', subtitle?: string, isLoading?: boolean }) {
  return (
    <Card className="shadow-sm border-border/50 bg-card/60 backdrop-blur-sm transition-all hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground tracking-wide">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-3xl font-serif text-foreground/90 tracking-tight">
                ₹{(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
            {subtitle && !isLoading && (
              <p className="text-xs text-muted-foreground font-medium">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-2xl ${
            trend === 'positive' ? 'bg-primary/10 text-primary' : 
            trend === 'negative' ? 'bg-destructive/10 text-destructive' : 
            'bg-muted text-muted-foreground'
          }`}>
            <Icon size={20} strokeWidth={2.5} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
