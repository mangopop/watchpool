// Guards a user-supplied "next" redirect target against off-site redirects.
// "//evil.com" and "/\evil.com" both parse as protocol-relative URLs, so a
// leading "/" alone isn't enough — reject those forms explicitly.
export function safeNext(next: string | null | undefined): string {
  if (!next) return "/";
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
