// lib/signaling.ts
export type SignalMessage = {
  type: string;
  payload?: any;
  senderId?: string;
  roomId?: string;
  ts?: number;
};

export function subscribeToRoom(
  roomId: string,
  onMessage: (msg: SignalMessage) => void
) {
  const url = `/api/signal?roomId=${encodeURIComponent(roomId)}`;
  const es = new EventSource(url);
  es.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      onMessage(data);
    } catch (err) {
      console.error("invalid sse payload", err);
    }
  };
  es.onerror = (e) => {
    // Note: EventSource will auto-retry. You can optionally call onMessage with a 'DISCONNECT' event.
    console.warn("sse error", e);
  };
  return es; // caller should call es.close()
}

export async function publishToRoom(
  roomId: string,
  type: string,
  payload?: any,
  senderId?: string
) {
  await fetch("/api/signal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, type, payload, senderId }),
  });
}
