import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "./LoginForm";
import "../auth-theme.css";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const { next, error } = await searchParams;

  return (
    <div className="auth-page">
      <div className="card">
        <h1 className="mark">A Few Good Films</h1>
        <p className="lede">Sign in with a magic link — no password to remember</p>
        {error && <div className="error">{error}</div>}
        <LoginForm next={safeNext(next)} />
      </div>
    </div>
  );
}
