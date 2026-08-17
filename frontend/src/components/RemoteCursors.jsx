import { useViewport } from "reactflow";

import { getUserColor } from "../lib/userColor";

// Renders every collaborator's live mouse position as a small arrow + name
// tag. Cursor positions travel over the presence socket in diagram (flow)
// coordinates, so mapping them back onto the screen just means re-applying
// the same pan/zoom transform React Flow itself uses for the canvas — that's
// what useViewport() gives us. The counter-scale by 1/zoom keeps the cursor
// glyph a constant on-screen size no matter how far the diagram is zoomed.
export default function RemoteCursors({ cursors, users, selfId }) {
  const { x: vx, y: vy, zoom } = useViewport();
  const entries = Object.entries(cursors).filter(([userId]) => userId !== String(selfId));
  if (entries.length === 0) return null;

  const nameFor = (userId) => {
    const user = users.find((u) => String(u.user_id) === userId);
    if (!user) return null;
    return user.is_guest ? user.email : user.username || user.email;
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {entries.map(([userId, pos]) => {
        const name = nameFor(userId);
        if (!name) return null;
        const color = getUserColor(userId);
        const screenX = pos.x * zoom + vx;
        const screenY = pos.y * zoom + vy;
        return (
          <div
            key={userId}
            className="absolute left-0 top-0 will-change-transform"
            style={{
              transform: `translate(${screenX}px, ${screenY}px)`,
              transition: "transform 80ms linear",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }}>
              <path d="M2 1.5 L15.5 8.5 L9 9.5 L6.5 16 Z" fill={color} stroke="white" strokeWidth="1" strokeLinejoin="round" />
            </svg>
            <span
              className="ml-3 mt-[-4px] inline-block whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[10px] font-medium text-white shadow"
              style={{ background: color }}
            >
              {name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
