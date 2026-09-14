"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACTIVE_GROUP_COOKIE } from "@/app/active-group";
import { createClient } from "@/lib/supabase/server";

export async function setActiveGroup(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  if (!groupId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)
    .eq("group_id", groupId)
    .maybeSingle();
  if (!membership) return;

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_GROUP_COOKIE, groupId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/");
}
