"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X } from "lucide-react";

export function getAuthCopy(locale: "en" | "ar") {
  if (locale === "ar") {
    return {
      signIn: "تسجيل الدخول",
      signOut: "خروج",
      signUp: "إنشاء حساب",
      signInTitle: "تسجيل الدخول",
      signUpTitle: "إنشاء حساب",
      subtitle: "احفظ عمليات الفحص وفعّل المراقبة.",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      toSignUp: "ليس لديك حساب؟ أنشئ حساباً",
      toSignIn: "لديك حساب؟ سجّل الدخول",
      error: "تعذّر تسجيل الدخول. تحقّق من بياناتك.",
    };
  }
  return {
    signIn: "Sign in",
    signOut: "Sign out",
    signUp: "Create account",
    signInTitle: "Sign in",
    signUpTitle: "Create account",
    subtitle: "Save your audits and enable monitoring.",
    email: "Email",
    password: "Password",
    toSignUp: "No account? Create one",
    toSignIn: "Have an account? Sign in",
    error: "Could not sign in. Check your details.",
  };
}

export function SignInDialog({
  open,
  onClose,
  locale,
}: {
  open: boolean;
  onClose: () => void;
  locale: "en" | "ar";
}) {
  const { signIn } = useAuthActions();
  const c = getAuthCopy(locale);
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signIn("password", { email, password, flow });
      onClose();
    } catch {
      setError(c.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-border/70 bg-card p-6 shadow-xl">
        <button type="button" onClick={onClose} className="absolute end-4 top-4 text-muted-foreground transition-colors hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
        <h2 className="font-heading text-xl font-semibold">{flow === "signIn" ? c.signInTitle : c.signUpTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{c.subtitle}</p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <Input type="email" required placeholder={c.email} value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-2xl bg-background" dir="ltr" />
          <Input type="password" required placeholder={c.password} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-2xl bg-background" dir="ltr" />
          {error ? <p className="text-sm text-rose-500">{error}</p> : null}
          <Button type="submit" size="lg" className="h-11 w-full rounded-2xl" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {flow === "signIn" ? c.signIn : c.signUp}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          className="mt-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {flow === "signIn" ? c.toSignUp : c.toSignIn}
        </button>
      </div>
    </div>
  );
}
