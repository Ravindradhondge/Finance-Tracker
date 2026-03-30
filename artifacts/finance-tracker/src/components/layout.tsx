import { Link, useLocation } from "wouter";
import { useMonthContext } from "@/hooks/use-month";
import { ChevronLeft, ChevronRight, LayoutDashboard, ReceiptText, Target, Tags, BookOpen } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { month, prevMonth, nextMonth } = useMonthContext();

  const navItems = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/transactions", label: "Journal", icon: ReceiptText },
    { href: "/budgets", label: "Intentions", icon: Target },
    { href: "/categories", label: "Categories", icon: Tags },
  ];

  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground selection:bg-primary/20">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/50 bg-card/30 hidden md:flex flex-col">
        <div className="p-8 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <BookOpen size={18} className="text-primary" />
          </div>
          <span className="font-serif font-medium text-xl tracking-tight text-foreground">Ledger</span>
        </div>
        <nav className="flex-1 px-4 space-y-1.5 mt-4">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}>
                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 flex items-center justify-between px-6 md:px-12 border-b border-border/30 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-2xl font-serif font-medium tracking-tight text-foreground/90">
            {navItems.find(i => i.href === location)?.label || "Ledger"}
          </h2>
          <div className="flex items-center gap-2 bg-card/60 px-2 py-1.5 rounded-2xl border border-border/50 shadow-sm transition-all hover:shadow-md">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted" onClick={prevMonth}>
              <ChevronLeft size={16} />
            </Button>
            <span className="w-32 text-center font-medium text-sm tracking-wide">
              {format(parseISO(`${month}-01`), "MMMM yyyy")}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted" onClick={nextMonth}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </header>
        <div className="flex-1 p-6 md:p-12 overflow-x-hidden">
          <div className="max-w-5xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
      
      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border/50 bg-background/80 backdrop-blur-md z-20 pb-safe">
        <nav className="flex justify-around p-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-1 p-2 rounded-xl flex-1 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  );
}
