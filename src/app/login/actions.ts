"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

export type SendMagicLinkState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "sent"; email: string };

export async function sendMagicLink(
  _prevState: SendMagicLinkState,
  formData: FormData,
): Promise<SendMagicLinkState> {
  const email = String(formData.get("email") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!email) {
    return { status: "error", message: "Enter your email." };
  }

  const origin = (await headers()).get("origin");
  if (!origin) {
    return { status: "error", message: "Couldn't determine this site's URL — try again." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Only used the first time this email signs up — handle_new_user()
      // falls back to the email's local part if this is blank.
      data: displayName ? { display_name: displayName } : undefined,
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  return { status: "sent", email };
}
