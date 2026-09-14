"use client";

import { useActionState } from "react";
import { createGroup, joinGroup, type GroupActionState } from "./actions";

const initialState: GroupActionState = { status: "idle" };

export function CreateGroupForm() {
  const [state, action, pending] = useActionState(createGroup, initialState);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="field">
        <label htmlFor="groupName">Group name</label>
        <input
          id="groupName"
          name="groupName"
          type="text"
          placeholder="e.g. Friday Night Crew"
          required
        />
      </div>
      {state.status === "error" && <div className="error">{state.message}</div>}
      <button type="submit" className="btn-solid" disabled={pending}>
        {pending ? "Creating…" : "Create group"}
      </button>
    </form>
  );
}

export function JoinGroupForm({ defaultCode }: { defaultCode?: string }) {
  const [state, action, pending] = useActionState(joinGroup, initialState);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="field">
        <label htmlFor="inviteCode">Invite code</label>
        <input
          id="inviteCode"
          name="inviteCode"
          type="text"
          placeholder="8-character code from a friend"
          defaultValue={defaultCode}
          required
        />
      </div>
      {state.status === "error" && <div className="error">{state.message}</div>}
      <button type="submit" className="btn-ghost" disabled={pending}>
        {pending ? "Joining…" : "Join group"}
      </button>
    </form>
  );
}
