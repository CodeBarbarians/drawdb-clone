import { useCallback, useEffect, useRef, useState } from "react";

import { API_BASE_URL } from "../api/client";

const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

// Lightweight live presence: who else has this diagram open right now, and
// where their viewport is. Actual edits still go through the normal
// save/load REST flow — this channel only carries "I'm here, my camera is at
// X" so a "follow" button can snap your view to a collaborator's in real time.
export function usePresence(diagramId, token, enabled) {
  const [users, setUsers] = useState([]);
  const [followUserId, setFollowUserId] = useState(null);
  const wsRef = useRef(null);
  const viewportRef = useRef(null);

  useEffect(() => {
    if (!enabled || !diagramId || !token) return undefined;

    const ws = new WebSocket(`${WS_BASE_URL}/ws/diagrams/${diagramId}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "presence") setUsers(msg.users || []);
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [diagramId, token, enabled]);

  const sendViewport = useCallback((viewport) => {
    viewportRef.current = viewport;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "viewport", viewport }));
    }
  }, []);

  const stopFollowing = useCallback(() => setFollowUserId(null), []);

  return { users, followUserId, setFollowUserId, stopFollowing, sendViewport };
}
