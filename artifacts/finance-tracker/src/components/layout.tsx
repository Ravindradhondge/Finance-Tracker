import { Link, useLocation } from "wouter";
import { useMonthContext } from "@/hooks/use-month";
import { useUser } from "@/hooks/use-user";
import {
  ChevronLeft, ChevronRight, LayoutDashboard, ReceiptText,
  Target, Tags, Wallet, LogOut, BarChart3, Moon, Sun, Plus
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { month, prevMonth, nextMonth } = useMonthContext();
  const { name, logout } = useUser();
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") setIsDark(true);
  }, []);

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/transactions", label: "Transactions", icon: ReceiptText },
    { href: "/budgets", label: "Budgets", icon: Target },
    { href: "/reports", label: "Reports", icon: BarChart3 },
    { href: "/categories", label: "Categories", icon: Tags },
  ];

  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground selection:bg-primary/20">
      {/* Sidebar — dark navy */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground hidden md:flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-6 py-7 flex items-center gap-3 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md">
            <Wallet size={18} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-sidebar-foreground">FinTrack</span>
            <p className="text-xs text-sidebar-foreground/40 leading-none">Personal Finance</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                  isActive
                    ? "bg-primary text-white shadow-sm shadow-primary/30"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <item.icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-3 border-t border-sidebar-border space-y-2">
          {/* Month Navigator */}
          <div className="flex items-center gap-1 bg-sidebar-accent rounded-xl px-1 py-1">
            <button
              className="p-1.5 rounded-lg hover:bg-sidebar-foreground/10 text-sidebar-foreground/60 transition-colors"
              onClick={prevMonth}
            >
              <ChevronLeft size={15} />
            </button>
            <span className="flex-1 text-center text-xs font-medium text-sidebar-foreground/80 tracking-wide">
              {format(parseISO(`${month}-01`), "MMM yyyy")}
            </span>
            <button
              className="p-1.5 rounded-lg hover:bg-sidebar-foreground/10 text-sidebar-foreground/60 transition-colors"
              onClick={nextMonth}
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* User profile */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-sidebar-accent transition-colors">
            <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center shrink-0 text-xs font-bold text-primary-foreground">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">{name}</p>
              <p className="text-xs text-sidebar-foreground/40 truncate">Personal</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors p-1 rounded-lg"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-border bg-background sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile logo */}
            <div className="md:hidden w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Wallet size={15} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-foreground">
              {navItems.find((i) => i.href === location)?.label ?? "FinTrack"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Month navigator (desktop header) */}
            <div className="hidden sm:flex items-center gap-1 bg-muted rounded-xl px-1 py-1 border border-border/60">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={prevMonth}>
                <ChevronLeft size={14} />
              </Button>
              <span className="w-24 text-center text-xs font-semibold tracking-wide">
                {format(parseISO(`${month}-01`), "MMM yyyy")}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={nextMonth}>
                <ChevronRight size={14} />
              </Button>
            </div>

            {/* Dark mode toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl"
              onClick={() => setIsDark(!isDark)}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </Button>

            {/* Mobile user avatar */}
            <div className="md:hidden w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{initials}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8 max-w-6xl mx-auto w-full pb-24 md:pb-8">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-lg z-40">
        {/* Mobile month navigator */}
        <div className="flex items-center justify-center gap-2 px-4 pt-2 pb-0">
          <button
            className="p-1 rounded-lg text-muted-foreground"
            onClick={prevMonth}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-semibold text-muted-foreground tracking-wide">
            {format(parseISO(`${month}-01`), "MMMM yyyy")}
          </span>
          <button
            className="p-1 rounded-lg text-muted-foreground"
            onClick={nextMonth}
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="flex justify-around items-center px-2 py-1 pb-safe">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl flex-1 min-w-0 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon size={19} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[9px] font-semibold tracking-wide truncate">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={logout}
            className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl flex-1 text-muted-foreground"
          >
            <LogOut size={19} strokeWidth={2} />
            <span className="text-[9px] font-semibold tracking-wide">Logout</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
