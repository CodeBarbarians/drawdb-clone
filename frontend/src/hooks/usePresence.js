import { useCallback, useEffect, useRef, useState } from "react";

import { API_BASE_URL } from "../api/client";

const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

// Lightweight live presence: who else has this diagram open right now, and
// where their viewport is. Actual edits still go through the normal
// save/load REST flow — this channel only carries "I'm here, my camera is at
// X" so a "follow" button can snap your view to a collaborator's in real time.
//
// Two ways in: a logged-in editor connects with {diagramId, token}; an
// anonymous view-only visitor connects with {shareToken, guestName} instead
// (they have no account, just a name they typed in).
export function usePresence({ diagramId, token, shareToken, guestName, enabled }) {
  const [users, setUsers] = useState([]);
  const [selfId, setSelfId] = useState(null);
  const [followUserId, setFollowUserId] = useState(null);
  const [remoteUpdate, setRemoteUpdate] = useState(null);
  const wsRef = useRef(null);
  const viewportRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;

    let wsUrl = null;
    if (diagramId && token) {
      wsUrl = `${WS_BASE_URL}/ws/diagrams/${diagramId}?token=${encodeURIComponent(token)}`;
    } else if (shareToken && guestName) {
      wsUrl = `${WS_BASE_URL}/ws/share/${shareToken}?name=${encodeURIComponent(guestName)}`;
    }
    if (!wsUrl) return undefined;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "you") setSelfId(msg.user_id);
        if (msg.type === "presence") setUsers(msg.users || []);
        // Edits go through the normal REST save/load flow, not this socket —
        // this just tells other viewers a save happened so they can reload
        // instead of sitting on a stale canvas until they refresh manually.
        if (msg.type === "diagram_updated") setRemoteUpdate({ by: msg.by, at: Date.now() });
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [diagramId, token, shareToken, guestName, enabled]);

  const sendViewport = useCallback((viewport) => {
    viewportRef.current = viewport;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "viewport", viewport }));
    }
  }, []);

  const stopFollowing = useCallback(() => setFollowUserId(null), []);

  return { users, selfId, followUserId, setFollowUserId, stopFollowing, sendViewport, remoteUpdate };
}
