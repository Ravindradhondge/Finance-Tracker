import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { Wallet, ArrowRight, TrendingUp, Shield, Smartphone, Loader2, Eye, EyeOff } from "lucide-react";

type Mode = "signin" | "signup";

export default function LoginScreen() {
  const { login } = useUser();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrors({});
    setPassword("");
    setConfirmPassword("");
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (mode === "signup" && (!name.trim() || name.trim().length < 2))
      e.name = "Enter your full name (at least 2 characters).";
    if (!/^[6-9]\d{9}$/.test(mobile.trim()))
      e.mobile = "Enter a valid 10-digit Indian mobile number.";
    if (password.length < 6)
      e.password = "Password must be at least 6 characters.";
    if (mode === "signup" && password !== confirmPassword)
      e.confirmPassword = "Passwords do not match.";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});

    const endpoint = mode === "signup" ? "/api/auth/register" : "/api/auth/login";
    const body = mode === "signup"
      ? { mobile: mobile.trim(), name: name.trim(), password }
      : { mobile: mobile.trim(), password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors({ general: data.error || "Something went wrong. Please try again." });
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
    { icon: Shield, label: "Password-protected account" },
    { icon: Smartphone, label: "Works on all devices" },
  ];

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left branding panel */}
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

      {/* Right form panel */}
      <div className={`flex-1 flex items-center justify-center px-6 py-12 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Wallet size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">FinTrack</h1>
              <p className="text-xs text-muted-foreground">Personal Finance</p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-xl bg-muted p-1 mb-8">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                mode === "signin"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                mode === "signup"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground tracking-tight mb-1">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "signin"
                ? "Sign in with your mobile number and password"
                : "Set up your account to start tracking finances"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name — sign up only */}
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground" htmlFor="name-input">Full Name</label>
                <input
                  id="name-input"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Raj Sharma"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
                  className={`w-full px-4 py-3 rounded-xl border-2 bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-4 transition-all text-sm font-medium ${errors.name ? "border-destructive focus:border-destructive focus:ring-destructive/10" : "border-border focus:border-primary focus:ring-primary/10"}`}
                />
                {errors.name && <p className="text-xs text-destructive font-medium">{errors.name}</p>}
              </div>
            )}

            {/* Mobile */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground" htmlFor="mobile-input">Mobile Number</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground select-none">+91</span>
                <input
                  id="mobile-input"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={mobile}
                  onChange={(e) => { setMobile(e.target.value.replace(/\D/g, "").slice(0, 10)); setErrors((p) => ({ ...p, mobile: "" })); }}
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-4 transition-all text-sm font-medium ${errors.mobile ? "border-destructive focus:border-destructive focus:ring-destructive/10" : "border-border focus:border-primary focus:ring-primary/10"}`}
                />
              </div>
              {errors.mobile && <p className="text-xs text-destructive font-medium">{errors.mobile}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground" htmlFor="password-input">Password</label>
              <div className="relative">
                <input
                  id="password-input"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  placeholder={mode === "signup" ? "Min. 6 characters" : "Your password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })); }}
                  className={`w-full pl-4 pr-12 py-3 rounded-xl border-2 bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-4 transition-all text-sm font-medium ${errors.password ? "border-destructive focus:border-destructive focus:ring-destructive/10" : "border-border focus:border-primary focus:ring-primary/10"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive font-medium">{errors.password}</p>}
            </div>

            {/* Confirm password — sign up only */}
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground" htmlFor="confirm-input">Confirm Password</label>
                <div className="relative">
                  <input
                    id="confirm-input"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: "" })); }}
                    className={`w-full pl-4 pr-12 py-3 rounded-xl border-2 bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-4 transition-all text-sm font-medium ${errors.confirmPassword ? "border-destructive focus:border-destructive focus:ring-destructive/10" : "border-border focus:border-primary focus:ring-primary/10"}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive font-medium">{errors.confirmPassword}</p>}
              </div>
            )}

            {/* General error */}
            {errors.general && (
              <div className="text-xs text-destructive font-medium bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2.5">
                {errors.general}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl bg-primary text-white font-semibold text-sm transition-all hover:bg-primary/90 active:scale-[0.98] shadow-lg shadow-primary/30 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> {mode === "signup" ? "Creating account…" : "Signing in…"}</>
              ) : (
                <>{mode === "signup" ? "Create Account" : "Sign In"} <ArrowRight size={16} strokeWidth={2.5} /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed">
            {mode === "signin" ? (
              <>Don't have an account?{" "}
                <button onClick={() => switchMode("signup")} className="font-semibold text-primary hover:underline">Create one</button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button onClick={() => switchMode("signin")} className="font-semibold text-primary hover:underline">Sign in</button>
              </>
            )}
          </p>
          <p className="text-center text-xs text-muted-foreground mt-2">
            <span className="font-medium text-primary">All amounts in Indian Rupees (₹)</span>
          </p>
        </div>
      </div>
    </div>
  );
}
