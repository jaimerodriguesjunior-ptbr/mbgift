"use client";

import { Eye, EyeOff, LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const LOCAL_STORAGE_KEY = "mbgift_last_store_name";
const DEFAULT_BRAND = "MBGift";

function resolveRedirectPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/dashboard";
  }

  return nextPath;
}

function resolveFeedbackMessage(errorCode: string | null) {
  switch (errorCode) {
    case "auth":
      return "Entre com seu e-mail e sua senha para acessar o painel.";
    case "no-tenant":
      return "Este usuário ainda não está vinculado a uma loja.";
    case "multi-tenant":
      return "Este acesso ainda não suporta mais de uma loja por usuário.";
    case "tenant":
      return "Não foi possível validar a loja deste usuário.";
    default:
      return null;
  }
}

async function fetchAndCacheStoreName(): Promise<void> {
  try {
    const response = await fetch("/api/tenant/current", { cache: "no-store" });
    if (!response.ok) return;

    const payload = await response.json().catch(() => null);
    const name: string | null = payload?.tenant?.displayName ?? payload?.tenant?.logoLabel ?? null;

    if (name) {
      localStorage.setItem(LOCAL_STORAGE_KEY, name);
    }
  } catch {
    // Silently ignore — redirect will happen anyway
  }
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(() => resolveFeedbackMessage(searchParams.get("error")));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storeName, setStoreName] = useState<string>(DEFAULT_BRAND);

  // On mount, check if a store name was saved from a previous session
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        setStoreName(saved);
      }
    } catch {
      // localStorage may be unavailable in some environments
    }
  }, []);

  const redirectPath = useMemo(
    () => resolveRedirectPath(searchParams.get("next")),
    [searchParams]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        throw error;
      }

      // After successful auth, fetch and persist the store name for next visit
      await fetchAndCacheStoreName();

      router.replace(redirectPath);
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao autenticar usuário.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isPersonalized = storeName !== DEFAULT_BRAND;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#1e1612] px-4 py-8 sm:px-6">
      <div className="absolute inset-0 bg-[url('/loginpage.png')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,12,10,0.56),rgba(18,12,10,0.46))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,242,222,0.18),transparent_42%)]" />

      <section className="relative w-full max-w-md rounded-[30px] border border-white/12 bg-[rgba(20,14,11,0.28)] p-7 text-white shadow-[0_34px_100px_rgba(20,12,8,0.42)] backdrop-blur-xl sm:p-8">
        <div className="mb-8 text-center">
          {isPersonalized ? (
            <>
              <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#ead8be]">
                MBGift
              </p>
              <h1 className="mt-3 font-serif text-4xl leading-none text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.30)]">
                {storeName}
              </h1>
            </>
          ) : (
            <>
              <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#ead8be]">
                Gestão de Lojas
              </p>
              <h1 className="mt-3 font-serif text-4xl leading-none text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.30)]">
                MBGift
              </h1>
            </>
          )}
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-[11px] font-black uppercase tracking-[0.26em] text-[#ead8be]">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="w-full rounded-2xl border border-white/12 bg-[rgba(255,255,255,0.14)] px-4 py-3 text-sm text-white placeholder:text-white/42 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] outline-none transition hover:bg-[rgba(255,255,255,0.18)] focus:border-[#d8c2a1] focus:bg-[rgba(255,255,255,0.18)] focus:ring-2 focus:ring-[#d8c2a1]/20"
              placeholder="voce@loja.com"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-[11px] font-black uppercase tracking-[0.26em] text-[#ead8be]">
              Senha
            </span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-2xl border border-white/12 bg-[rgba(255,255,255,0.14)] px-4 py-3 pr-12 text-sm text-white placeholder:text-white/42 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] outline-none transition hover:bg-[rgba(255,255,255,0.18)] focus:border-[#d8c2a1] focus:bg-[rgba(255,255,255,0.18)] focus:ring-2 focus:ring-[#d8c2a1]/20"
                placeholder="Digite sua senha"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-white/60 transition hover:text-white"
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {feedback ? (
            <div className="rounded-2xl border border-[#d8c2a1]/24 bg-[rgba(255,248,240,0.12)] px-4 py-3 text-sm text-[#fff1df]">
              {feedback}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-[#8c6d45] px-6 py-3 text-[11px] font-black uppercase tracking-[0.3em] text-white shadow-[0_16px_30px_rgba(140,109,69,0.30)] transition hover:bg-[#725a38] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <LogIn className="h-4 w-4" />
            {isSubmitting ? "Entrando..." : "Acessar painel"}
          </button>
        </form>
      </section>
    </main>
  );
}
