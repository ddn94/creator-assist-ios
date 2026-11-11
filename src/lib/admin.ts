/** Same emails as website ADMIN_EMAILS — used only to show the Waitlist link.
 *  The website API still enforces ADMIN_EMAILS server-side. */
export function getAdminEmails(): string[] {
  return (process.env.EXPO_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email: string) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}
