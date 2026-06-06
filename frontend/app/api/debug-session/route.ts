import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET() {
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();
  const supabaseCookies = allCookies.filter(c => c.name.includes("supabase") || c.name.includes("sb-"));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { session }, error } = await supabase.auth.getSession();

  return NextResponse.json({
    totalCookies: allCookies.length,
    cookieNames: allCookies.map(c => c.name),
    supabaseCookieCount: supabaseCookies.length,
    hasSession: !!session,
    sessionUserId: session?.user?.id ?? null,
    error: error?.message ?? null,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
