import { NextResponse, type NextRequest } from "next/server";

// Auth protection is handled at the layout level (app/(dashboard)/layout.tsx)
// Middleware only handles static asset passthrough
export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
