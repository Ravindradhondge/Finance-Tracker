import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { Wallet, ArrowRight, TrendingUp, Shield, Smartphone, Loader2 } from "lucide-react";

export default function LoginScreen() {
  const { login } = useUser();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [errors, setErrors] = useState<{ name?: string; mobile?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const validate = () => {
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = "Please enter your name.";
    if (!/^[6-9]\d{9}$/.test(mobile.trim()))
      errs.mobile = "Enter a valid 10-digit Indian mobile number.";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mobile: mobile.trim(), name: name.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ general: data.error || "Login failed. Please try again." });
        return;
      }

      login({ id: data.id, name: data.name, mobile: data.mobile });
    } catch {
      setErrors({ general: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
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
      <div className={`flex-1 flex items-center justify-center px-6 py-12 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
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
            <h2 className="text-3xl font-bold text-foreground tracking-tight mb-2">Welcome</h2>
            <p className="text-muted-foreground">Sign in or create your account with your mobile number</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground" htmlFor="name-input">
                Your Name
              </label>
              <input
                id="name-input"
                type="text"
                autoComplete="given-name"
                placeholder="e.g. Raj, Priya, Arjun..."
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                }}
                className={`w-full px-4 py-3.5 rounded-xl border-2 bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-4 transition-all text-sm font-medium ${
                  errors.name
                    ? "border-destructive focus:border-destructive focus:ring-destructive/10"
                    : "border-border focus:border-primary focus:ring-primary/10"
                }`}
              />
              {errors.name && (
                <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-destructive/10 flex items-center justify-center text-[10px]">!</span>
                  {errors.name}
                </p>
              )}
            </div>

            {/* Mobile */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground" htmlFor="mobile-input">
                Mobile Number
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground select-none">
                  +91
                </span>
                <input
                  id="mobile-input"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={mobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setMobile(val);
                    if (errors.mobile) setErrors((p) => ({ ...p, mobile: undefined }));
                  }}
                  className={`w-full pl-12 pr-4 py-3.5 rounded-xl border-2 bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-4 transition-all text-sm font-medium ${
                    errors.mobile
                      ? "border-destructive focus:border-destructive focus:ring-destructive/10"
                      : "border-border focus:border-primary focus:ring-primary/10"
                  }`}
                />
              </div>
              {errors.mobile && (
                <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-destructive/10 flex items-center justify-center text-[10px]">!</span>
                  {errors.mobile}
                </p>
              )}
            </div>

            {errors.general && (
              <p className="text-xs text-destructive font-medium bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                {errors.general}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl bg-primary text-white font-semibold text-sm transition-all hover:bg-primary/90 active:scale-[0.98] shadow-lg shadow-primary/30 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Open Dashboard
                  <ArrowRight size={16} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-8 leading-relaxed">
            Your number identifies your account — no OTP needed.<br />
            <span className="font-medium text-primary">All amounts in Indian Rupees (₹)</span>
          </p>
        </div>
      </div>
    </div>
  );
}
