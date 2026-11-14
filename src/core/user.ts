export function avatarUrl(user: { id: string; avatarKey: string | null }) {
  return user.avatarKey ? `/api/avatars/${user.id}?v=${encodeURIComponent(user.avatarKey.split("/").pop()!)}` : null;
}
export function visibleEmail(email: string) {
  return /@(oauth|accounts)\.local$/.test(email) ? null : email;
}
export function publicUser(user: { id: string; username: string; email: string; displayName: string; avatarKey: string | null }) {
  return { id: user.id, username: user.username, email: visibleEmail(user.email), displayName: user.displayName, avatarUrl: avatarUrl(user) };
}
