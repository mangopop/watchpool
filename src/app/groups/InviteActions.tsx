"use client";

import { useEffect, useState } from "react";

export function InviteActions({ code, groupName }: { code: string; groupName: string }) {
  const [copied, setCopied] = useState(false);
  // Matches SSR (no navigator) on first paint, then reveals if the device
  // actually supports the native share sheet — avoids a hydration mismatch.
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    // navigator.share doesn't exist during SSR — this is a one-time read of
    // browser-only capability after mount, not state synced from React.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanShare(typeof navigator.share === "function");
  }, []);

  function inviteLink() {
    return `${window.location.origin}/groups?code=${code}`;
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function share() {
    const link = inviteLink();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${groupName} on A Few Good Films`,
          text: `Join ${groupName} on A Few Good Films`,
          url: link,
        });
      } catch {
        // Cancelled by the user — nothing to do.
      }
    } else {
      await copyLink();
    }
  }

  return (
    <div className="invite-actions">
      <code className="invite-code">{code}</code>
      <div className="invite-buttons">
        {canShare && (
          <button type="button" className="btn-ghost" onClick={share}>
            Share invite
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={copyLink}>
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
