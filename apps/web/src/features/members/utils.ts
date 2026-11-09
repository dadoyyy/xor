// soft avatar colors, picked from the username so each person keeps theirs
const AVATARS = [
  "bg-grape text-white",
  "bg-sun text-ink",
  "bg-grape-tint text-grape",
  "bg-sun-tint text-sun-deep",
  "bg-lilac text-grape-deep",
];

export function avatarCls(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATARS[h % AVATARS.length];
}

export function initials(name: string) {
  return name.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "?";
}

export function formatJoinedDate(d: string) {
  return new Date(d).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

