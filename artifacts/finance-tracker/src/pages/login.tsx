import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { Wallet, ArrowRight, TrendingUp, Shield, Smartphone } from "lucide-react";

export default function LoginScreen() {
  const { setName } = useUser();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Please enter your name to continue.");
      return;
    }
    setName(trimmed);
  };

  const features = [
    { icon: TrendingUp, label: "Track spending trends" },
    { icon: Shield, label: "Private & secure" },
    { icon: Smartphone, label: "Works on all devices" },
  ];

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col items-center justify-center p-16 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-80px] left-[-60px] w-[300px] h-[300px] rounded-full bg-primary/8 blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-sm text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-primary/30">
            <Wallet size={36} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-sidebar-foreground mb-4 tracking-tight">FinTrack</h1>
          <p className="text-sidebar-foreground/50 text-lg leading-relaxed mb-12">
            Your smart personal finance companion. Track income, manage expenses, hit your savings goals.
          </p>

          <div className="space-y-4">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-4 text-left bg-sidebar-accent/60 rounded-2xl px-5 py-3.5">
                <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <Icon size={17} className="text-primary" />
                </div>
                <span className="text-sm font-medium text-sidebar-foreground/70">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className={`flex-1 flex items-center justify-center px-6 py-12 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Wallet size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">FinTrack</h1>
              <p className="text-xs text-muted-foreground">Personal Finance</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground tracking-tight mb-2">
              Welcome back
            </h2>
            <p className="text-muted-foreground">
              Enter your name to access your financial dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="name-input">
                Your Name
              </label>
              <input
                id="name-input"
                type="text"
                autoFocus
                autoComplete="given-name"
                placeholder="e.g. Raj, Priya, Arjun..."
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError("");
                }}
                className="w-full px-4 py-3.5 rounded-xl border-2 border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm font-medium"
              />
              {error && (
                <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-destructive/10 flex items-center justify-center text-[10px]">!</span>
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl bg-primary text-white font-semibold text-sm transition-all hover:bg-primary/90 active:scale-[0.98] shadow-lg shadow-primary/30"
            >
              Open Dashboard
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-8 leading-relaxed">
            No account needed. Your data stays on this device.<br />
            <span className="font-medium text-primary">All amounts in Indian Rupees (₹)</span>
          </p>
        </div>
      </div>
    </div>
  );
}
