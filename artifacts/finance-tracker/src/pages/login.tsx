import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { BookOpen, ArrowRight, IndianRupee } from "lucide-react";

export default function LoginScreen() {
  const { setName } = useUser();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Please enter your name to continue.");
      return;
    }
    setName(trimmed);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Decorative background circles */}
      <div className="absolute top-[-120px] right-[-120px] w-[420px] h-[420px] rounded-full bg-primary/6 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-80px] left-[-80px] w-[320px] h-[320px] rounded-full bg-primary/5 blur-2xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-[200px] h-[200px] rounded-full bg-accent/30 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm mx-auto px-6">
        {/* Logo mark */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 shadow-sm">
            <BookOpen size={30} className="text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="font-serif text-3xl font-medium text-foreground/90 tracking-tight">Ledger</h1>
          <p className="text-muted-foreground text-sm mt-2 text-center leading-relaxed">
            Your personal space for tracking<br />income, expenses &amp; savings
          </p>
        </div>

        {/* Card */}
        <div className="bg-card/70 backdrop-blur-sm border border-border/50 rounded-3xl p-8 shadow-md">
          <div className="mb-6">
            <h2 className="font-serif text-xl font-medium text-foreground/90 mb-1">Welcome</h2>
            <p className="text-sm text-muted-foreground">Tell us your name to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground/80" htmlFor="name-input">
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
                className="w-full px-4 py-3 rounded-xl border border-border bg-background/60 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all text-sm"
              />
              {error && (
                <p className="text-xs text-destructive mt-1">{error}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm transition-all hover:opacity-90 active:scale-[0.98] shadow-sm"
            >
              Open my Ledger
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground/60 mt-6 flex items-center justify-center gap-1.5">
          <IndianRupee size={12} />
          All amounts in Indian Rupees
        </p>
      </div>
    </div>
  );
}
