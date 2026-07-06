import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = ["/app", "/onboarding"];
const authPaths = ["/sign-in", "/sign-up"];

export async function proxy(request: NextRequest) {
  const configured =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Local demo mode intentionally remains fully navigable.
  if (!configured) return NextResponse.next();
  if (process.env.NODE_ENV !== "production" && request.nextUrl.searchParams.get("demo") === "1") {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const protectedRoute = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const authRoute = authPaths.includes(pathname);

  if (protectedRoute && !user) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("next", pathname);
    return NextResponse.redirect(signIn);
  }

  if (authRoute && user) return NextResponse.redirect(new URL("/app", request.url));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
