import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { WatchPool } from "@/components/watch-pool/WatchPool";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { count } = await supabase
    .from("group_members")
    .select("group_id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (!count) {
    redirect("/groups");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  return <WatchPool viewerName={profile?.display_name ?? user.email ?? ""} onSignOut={signOut} />;
}
