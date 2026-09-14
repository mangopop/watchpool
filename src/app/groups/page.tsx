import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import "../auth-theme.css";
import { createInvite, revokeInvite } from "./actions";
import { CreateGroupForm, JoinGroupForm } from "./GroupsForm";
import { isInviteActive } from "./invite-active";

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await searchParams;

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, role")
    .eq("user_id", user.id);

  const groupIds = (memberships ?? []).map((m) => m.group_id);

  const { data: groups } =
    groupIds.length > 0
      ? await supabase.from("groups").select("id, name").in("id", groupIds)
      : { data: [] };

  const rows = (memberships ?? []).map((m) => ({
    role: m.role,
    group: groups?.find((g) => g.id === m.group_id),
  }));

  const adminGroupIds = rows
    .filter((r) => r.role === "admin" && r.group)
    .map((r) => r.group!.id);

  const { data: allInvites } =
    adminGroupIds.length > 0
      ? await supabase
          .from("group_invites")
          .select("code, group_id, expires_at")
          .in("group_id", adminGroupIds)
      : { data: [] };

  const invites = (allInvites ?? []).filter((i) => isInviteActive(i.expires_at));

  return (
    <div className="auth-page">
      <div className="card">
        <h1 className="mark">Your groups</h1>
        <p className="lede">An invite joins one group, never the whole app</p>

        {error && <div className="error">{error}</div>}

        {rows.length > 0 && (
          <div className="group-list">
            {rows.map((r) => {
              if (!r.group) return null;
              const invite = invites.find((i) => i.group_id === r.group!.id);
              return (
                <div className="group-row" key={r.group.id}>
                  <div>
                    <div className="name">{r.group.name}</div>
                    <div className="role">
                      {r.role === "admin"
                        ? invite
                          ? `Invite: ${invite.code} · expires ${new Date(invite.expires_at!).toLocaleDateString()}`
                          : "Admin"
                        : "Member"}
                    </div>
                  </div>
                  {r.role === "admin" &&
                    (invite ? (
                      <form action={revokeInvite.bind(null, invite.code)}>
                        <button type="submit" className="btn-ghost">
                          Revoke invite
                        </button>
                      </form>
                    ) : (
                      <form action={createInvite.bind(null, r.group.id)}>
                        <button type="submit" className="btn-ghost">
                          Create invite
                        </button>
                      </form>
                    ))}
                </div>
              );
            })}
            <Link href="/" className="btn-solid" style={{ textAlign: "center", textDecoration: "none" }}>
              Go to your pool →
            </Link>
          </div>
        )}

        <div className="divider">Create a group</div>
        <CreateGroupForm />

        <div className="divider">Or join one</div>
        <JoinGroupForm />
      </div>
    </div>
  );
}
