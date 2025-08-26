// pages/api/signal.ts
import type { NextApiRequest, NextApiResponse } from "next";

type Player = { id: string; name: string; ready: boolean; isHost: boolean };
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

    // Update in-memory player list
    if (type === "JOIN") {
      const list = playerMap.get(roomId) || [];
      if (!list.find((p) => p.id === payload.player.id))
        list.push(payload.player);
      playerMap.set(roomId, list);
    } else if (type === "UPDATE") {
      const list = playerMap.get(roomId) || [];
      const idx = list.findIndex((p) => p.id === payload.player.id);
      if (idx >= 0) list[idx] = payload.player;
      playerMap.set(roomId, list);
    } else if (type === "LEAVE") {
      const list = playerMap.get(roomId) || [];
      playerMap.set(
        roomId,
        list.filter((p) => p.id !== payload.playerId)
      );
    }

    // Broadcast to all subscribers
    const subs = map.get(roomId);
    const envelope = { type, payload, senderId, roomId, ts: Date.now() };
    if (subs && subs.size > 0) {
      for (const r of Array.from(subs)) {
        try {
          (r as any).write(`data: ${JSON.stringify(envelope)}\n\n`);
        } catch {
          subs.delete(r as any);
        }
      }
    }

    res.status(200).json({ ok: true });
  } else {
    res.setHeader("Allow", "GET,POST");
    res.status(405).end("Method Not Allowed");
  }
}
