// A small fixed palette, picked to stay legible on both the dark and light
// themes, used to give every collaborator a stable color (avatar + live
// cursor) derived purely from their user id — no per-user color needs to be
// stored anywhere.
const PALETTE = [
  "#ff5a1f", // accent orange
  "#2f6feb", // blue
  "#22c55e", // green
  "#e879f9", // pink
  "#eab308", // amber
  "#14b8a6", // teal
  "#a78bfa", // violet
  "#f43f5e", // rose
];

export function getUserColor(userId) {
  const key = String(userId ?? "");
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
