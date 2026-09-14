"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type GroupActionState = { status: "idle" } | { status: "error"; message: string };

const idle: GroupActionState = { status: "idle" };

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export async function createGroup(
  _prevState: GroupActionState,
  formData: FormData,
): Promise<GroupActionState> {
  const groupName = String(formData.get("groupName") ?? "").trim();
  if (!groupName) {
    return { status: "error", message: "Give the group a name." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_group", { group_name: groupName });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/groups");
  revalidatePath("/");
  return idle;
}

export async function joinGroup(
  _prevState: GroupActionState,
  formData: FormData,
): Promise<GroupActionState> {
  const inviteCode = String(formData.get("inviteCode") ?? "").trim();
  if (!inviteCode) {
    return { status: "error", message: "Enter an invite code." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("join_group", { invite_code: inviteCode });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/groups");
  revalidatePath("/");
  return idle;
}

export async function createInvite(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("group_invites").insert({
    group_id: groupId,
    created_by: user.id,
    expires_at: new Date(Date.now() + INVITE_LIFETIME_MS).toISOString(),
  });

  if (error) {
    redirect(`/groups?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/groups");
}

export async function revokeInvite(code: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("group_invites").delete().eq("code", code);

  if (error) {
    redirect(`/groups?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/groups");
}
