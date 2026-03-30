import { Link, useLocation } from "wouter";
import { useMonthContext } from "@/hooks/use-month";
import { useUser } from "@/hooks/use-user";
import { ChevronLeft, ChevronRight, LayoutDashboard, ReceiptText, Target, Tags, BookOpen, LogOut, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { month, prevMonth, nextMonth } = useMonthContext();
  const { name, logout } = useUser();

  const navItems = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/transactions", label: "Journal", icon: ReceiptText },
    { href: "/budgets", label: "Intentions", icon: Target },
    { href: "/categories", label: "Categories", icon: Tags },
  ];

  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

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
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section at bottom of sidebar */}
        <div className="p-4 border-t border-border/40 mt-auto">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-primary">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{name}</p>
              <p className="text-xs text-muted-foreground">Personal account</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/60"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 flex items-center justify-between px-6 md:px-12 border-b border-border/30 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Mobile: show app logo */}
            <div className="md:hidden w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen size={14} className="text-primary" />
            </div>
            <h2 className="text-2xl font-serif font-medium tracking-tight text-foreground/90">
              {navItems.find((i) => i.href === location)?.label || "Ledger"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Month navigator */}
            <div className="flex items-center gap-2 bg-card/60 px-2 py-1.5 rounded-2xl border border-border/50 shadow-sm transition-all hover:shadow-md">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={prevMonth}
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="w-28 text-center font-medium text-sm tracking-wide">
                {format(parseISO(`${month}-01`), "MMMM yyyy")}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={nextMonth}
              >
                <ChevronRight size={16} />
              </Button>
            </div>

            {/* Mobile: user avatar with logout */}
            <div className="md:hidden flex items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                <span className="text-xs font-semibold text-primary">{initials}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 md:p-12 overflow-x-hidden">
          <div className="max-w-5xl mx-auto w-full">{children}</div>
        </div>
      </main>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border/50 bg-background/80 backdrop-blur-md z-20 pb-safe">
        <nav className="flex justify-around p-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl flex-1 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={logout}
            className="flex flex-col items-center gap-1 p-2 rounded-xl flex-1 text-muted-foreground"
          >
            <LogOut size={20} strokeWidth={2} />
            <span className="text-[10px] font-medium">Sign out</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
