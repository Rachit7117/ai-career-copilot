"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Briefcase, Mail, Lock, Loader2 } from "lucide-react";

type Mode = "signin" | "signup" | "magic";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
        if (error) throw error;
        setMagicSent(true);
        toast.success("Magic link sent! Check your email.");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
        if (error) throw error;
        // If email confirmation is OFF, the user is signed in immediately
        if (data.session) {
          window.location.href = "/dashboard";
          return;
        }
        toast.success("Account created! Check your email to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/dashboard";
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
            <Briefcase className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">AI Career Copilot</h1>
          <p className="text-muted-foreground mt-1 text-sm">Your career operating system</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg mb-6">
            {(["signin", "signup", "magic"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setMagicSent(false); }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${mode === m ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {m === "signin" ? "Sign In" : m === "signup" ? "Sign Up" : "Magic Link"}
              </button>
            ))}
          </div>

          {magicSent ? (
            <div className="text-center py-4">
              <Mail className="w-12 h-12 text-primary mx-auto mb-3" />
              <p className="font-medium">Check your email</p>
              <p className="text-sm text-muted-foreground mt-1">We sent a magic link to <strong>{email}</strong></p>
              <button onClick={() => setMagicSent(false)} className="text-sm text-primary mt-4 hover:underline">Try again</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    required placeholder="you@example.com"
                    className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {mode !== "magic" && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      required minLength={8} placeholder="••••••••"
                      className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Magic Link"}
              </button>

            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
