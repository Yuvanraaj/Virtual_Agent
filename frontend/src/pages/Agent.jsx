import React, { useEffect, useRef, useState } from 'react';
import AnamAvatar from '../components/AnamAvatar';
import { API_BASE_URL } from '../config';

export default function AgentPage() {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    /*
      WebSocket creation disabled to avoid browser-level console errors when the backend
      returns 503 during the handshake ("Error during WebSocket handshake: Unexpected response code: 503").

      To re-enable WebSocket behavior:
      - Ensure your backend WebSocket proxy is up and returns 101 on upgrade.
      - Replace this comment block with the original WebSocket setup above.
    */
    console.debug('[WS] WebSocket connection disabled in Agent.jsx');
  }, []);

  // No ping UI — diagnostics are read-only in this view

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <AnamAvatar />

        {/* WS diagnostics removed — page shows only the AnamAvatar */}
      </div>
    </div>
  );
}
