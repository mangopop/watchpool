import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { confirmMagicLink } from "./actions";
import "../../auth-theme.css";

// Landing point for the magic-link email. The email template links here
// directly with a token_hash (see supabase/templates/magic_link.html) so
// sign-in works regardless of which device opens the email — the PKCE
// `code` flow's code-verifier cookie only exists on the device that
// requested the link, so it's kept only as a fallback for other providers.
//
// This renders an interstitial requiring a click rather than verifying on
// GET: corporate email security scanners (Safe Links, Mimecast, etc.)
// prefetch every link in an HTML email, which would otherwise burn the
// one-time-use token before the real user opens it.
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
    code?: string;
    next?: string;
  }>;
}) {
  const { token_hash, type, code, next: rawNext } = await searchParams;
  const next = safeNext(rawNext);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }
    redirect(next);
  }

  if (!token_hash || !type) {
    redirect("/login?error=Invalid or expired link");
  }

  return (
    <div className="auth-page">
      <div className="card">
        <h1 className="mark">A Few Good Films</h1>
        <p className="lede">Click below to finish signing in.</p>
        <form action={confirmMagicLink} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input type="hidden" name="token_hash" value={token_hash} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="next" value={next} />
          <button type="submit" className="btn-solid">
            Confirm sign-in
          </button>
        </form>
      </div>
    </div>
  );
}
