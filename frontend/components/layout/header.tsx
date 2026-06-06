"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sun, Moon, LogOut, User } from "lucide-react";
import { useTheme } from "next-themes";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function Header({ user }: { user: SupabaseUser }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm shrink-0">
      <div />
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-sm">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground max-w-[140px] truncate">{user.email}</span>
        </div>
        <button
          onClick={signOut}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
