"use client";

import { useState } from "react";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { LogIn, LogOut } from "lucide-react";
import { SignInDialog, getAuthCopy } from "@/components/auth/sign-in-dialog";

export function AuthButton({ locale }: { locale: "en" | "ar" }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const [open, setOpen] = useState(false);
  const c = getAuthCopy(locale);

  if (isLoading) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => (isAuthenticated ? signOut() : setOpen(true))}
        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {isAuthenticated ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
        <span className="hidden sm:inline">{isAuthenticated ? c.signOut : c.signIn}</span>
      </button>
      <SignInDialog open={open} onClose={() => setOpen(false)} locale={locale} />
    </>
  );
}
