// pages/api/signal.ts
import type { NextApiRequest, NextApiResponse } from "next";
import type { Player } from "../../app/type";
type Message = {
  roomId: string;
  type: string;
  payload?: any;
  senderId?: string;
};

// In-memory storage for SSE connections and players
declare global {
  var __SSE_ROOMS: Map<string, Set<import("http").ServerResponse>> | undefined;
  var __SSE_PLAYERS: Map<string, Player[]> | undefined;
}
if (!global.__SSE_ROOMS) global.__SSE_ROOMS = new Map();
if (!global.__SSE_PLAYERS) global.__SSE_PLAYERS = new Map();

function sendSSE(res: NextApiResponse, data: any) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// --- Helper functions ---
function addPlayer(roomId: string, player: Player) {
  const playerMap = global.__SSE_PLAYERS!;
  const list = playerMap.get(roomId) || [];
  if (!list.find((p) => p.id === player.id)) list.push(player);
  playerMap.set(roomId, list);
}

function updatePlayer(roomId: string, player: Player) {
  const playerMap = global.__SSE_PLAYERS!;
  const list = playerMap.get(roomId) || [];
  const idx = list.findIndex((p) => p.id === player.id);
  if (idx >= 0) list[idx] = player;
  playerMap.set(roomId, list);
}

function removePlayer(roomId: string, playerId: string) {
  const playerMap = global.__SSE_PLAYERS!;
  const list = playerMap.get(roomId) || [];
  playerMap.set(
    roomId,
    list.filter((p) => p.id !== playerId)
  );
}

function setPlayerSolved(roomId: string, playerId: string) {
  const playerMap = global.__SSE_PLAYERS!;
  const list = playerMap.get(roomId) || [];
  const idx = list.findIndex((p) => p.id === playerId);
  if (idx >= 0) list[idx] = { ...list[idx], solved: true };
  playerMap.set(roomId, list);
}

function broadcastToRoom(roomId: string, envelope: any) {
  const map = global.__SSE_ROOMS!;
  const subs = map.get(roomId);
  if (subs && subs.size > 0) {
    for (const r of Array.from(subs)) {
      try {
        (r as any).write(`data: ${JSON.stringify(envelope)}\n\n`);
      } catch {
        subs.delete(r as any);
      }
    }
  }
}

// --- Main handler ---
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const map = global.__SSE_ROOMS!;
  const playerMap = global.__SSE_PLAYERS!;

  if (req.method === "GET") {
    const { roomId } = req.query;
    if (!roomId || typeof roomId !== "string")
      return res.status(400).json({ error: "roomId required" });

    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    // Add this response to the room's listeners
    let set = map.get(roomId);
    if (!set) {
      set = new Set();
      map.set(roomId, set);
    }
    set.add(res as any);

    // Send FULL_STATE so new subscriber sees all existing players
    const players = playerMap.get(roomId) || [];
    sendSSE(res, { type: "FULL_STATE", payload: { players }, roomId });

    // heartbeat
    const keepAlive = setInterval(() => {
      try {
        res.write(":keepalive\n\n");
      } catch {}
    }, 15000);

    req.on("close", () => {
      clearInterval(keepAlive);
      const s = map.get(roomId);
      if (s) {
        s.delete(res as any);
        if (s.size === 0) map.delete(roomId);
      }
    });
  } else if (req.method === "POST") {
    const { roomId, type, payload, senderId } = req.body as Message;
    if (!roomId || !type)
      return res.status(400).json({ error: "roomId and type required" });

    // --- Event handling ---
    switch (type) {
      case "JOIN":
        addPlayer(roomId, payload.player);
        break;
      case "UPDATE":
        updatePlayer(roomId, payload.player);
        break;
      case "LEAVE":
        removePlayer(roomId, payload.playerId);
        break;
      case "RIDDLE_SOLVED":
        setPlayerSolved(roomId, payload.playerId);
        break;
      // Add more event types here as needed
      default:
        // No-op for unknown types
        break;
    }

    // --- Broadcast event ---
    const envelope = { type, payload, senderId, roomId, ts: Date.now() };
    broadcastToRoom(roomId, envelope);

    res.status(200).json({ ok: true });
  } else {
    res.setHeader("Allow", "GET,POST");
    res.status(405).end("Method Not Allowed");
  }
}
