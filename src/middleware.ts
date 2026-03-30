import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicEnv } from "@/lib/supabase/config";

const LOGIN_PATH = "/login";
const DASHBOARD_PATH = "/dashboard";
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/produtos",
  "/clientes",
  "/condicionais",
  "/caixa",
  "/configuracoes",
  "/listas"
];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isRecoverableAuthError(message: string) {
  return /auth session missing|session missing|jwt expired|refresh token/i.test(message);
}

function copyCookies(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
}

function buildLoginRedirect(request: NextRequest, response: NextResponse, reason?: string) {
  const url = request.nextUrl.clone();
  url.pathname = LOGIN_PATH;
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  if (reason) {
    url.searchParams.set("error", reason);
  }

  const redirectResponse = NextResponse.redirect(url);
  copyCookies(response, redirectResponse);
  return redirectResponse;
}

function buildDashboardRedirect(request: NextRequest, response: NextResponse) {
  const url = request.nextUrl.clone();
  const nextParam = request.nextUrl.searchParams.get("next");

  url.pathname =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : DASHBOARD_PATH;
  url.search = "";

  const redirectResponse = NextResponse.redirect(url);
  copyCookies(response, redirectResponse);
  return redirectResponse;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  try {
    const { url, anonKey } = getSupabasePublicEnv();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options) {
          request.cookies.set({ name, value: "", ...options });
          response.cookies.set({ name, value: "", ...options, maxAge: 0 });
        }
      }
    });

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      if (isProtectedPath(request.nextUrl.pathname)) {
        return buildLoginRedirect(request, response, "auth");
      }
      return response;
    }

    const { data: memberships, error: membershipError } = await supabase
      .from("tenant_memberships")
      .select("id")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: true })
      .limit(2);

    if (membershipError) {
      return isProtectedPath(request.nextUrl.pathname)
        ? buildLoginRedirect(request, response, "tenant")
        : response;
    }

    const membershipCount = memberships?.length ?? 0;
    const hasSingleTenant = membershipCount === 1;

    // Se estiver no login e tiver acesso, manda para o dashboard
    if (request.nextUrl.pathname === LOGIN_PATH && hasSingleTenant) {
      return buildDashboardRedirect(request, response);
    }

    // Se estiver na raiz e tiver acesso, manda para o dashboard
    if (request.nextUrl.pathname === "/" && hasSingleTenant) {
        return buildDashboardRedirect(request, response);
    }

    if (!isProtectedPath(request.nextUrl.pathname)) {
      return response;
    }

    if (membershipCount === 0) {
      return buildLoginRedirect(request, response, "no-tenant");
    }

    if (membershipCount > 1) {
      return buildLoginRedirect(request, response, "multi-tenant");
    }

    return response;
  } catch (err) {
    console.error("Middleware error:", err);
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
