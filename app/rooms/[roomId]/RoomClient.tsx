"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { nanoid } from "nanoid";
import {
  subscribeToRoom,
  publishToRoom,
  SignalMessage,
} from "../../../lib/signaling";
import RiddleRelay from "./RiddleRelay";

type Player = { id: string; name: string; ready: boolean; isHost: boolean };

export default function RoomClient({ roomId }: { roomId: string }) {
  const search = useSearchParams();
  const hostName = search?.get("hostName") ?? "";
  const [players, setPlayers] = useState<Player[]>([]);
  const [me, setMe] = useState<Player | null>(null);
  const [nameInput, setNameInput] = useState("");
  const esRef = useRef<EventSource | null>(null);
  const [gameStarted, setGameStarted] = useState(false);

  // build or restore me
  useEffect(() => {
    const existing = sessionStorage.getItem(`room:${roomId}:me`);
    if (existing) {
      setMe(JSON.parse(existing));
    } else if (hostName) {
      const p: Player = {
        id: nanoid(6),
        name: hostName,
        ready: false,
        isHost: true,
      };
      setMe(p);
      sessionStorage.setItem(`room:${roomId}:me`, JSON.stringify(p));
      publishToRoom(roomId, "JOIN", { player: p }, p.id);
    }
  }, [roomId, hostName]);

  // set up SSE
  useEffect(() => {
    if (!me) return;
    const es = subscribeToRoom(roomId, (msg: SignalMessage) => {
      if (msg.type === "START") {
        setGameStarted(true);
      }
      if (msg.type === "JOIN" || msg.type === "UPDATE") {
        const incoming = msg.payload?.player;
        if (!incoming) return;
        setPlayers((prev) => {
          const exists = prev.find((p) => p.id === incoming.id);
          if (exists)
            return prev.map((p) => (p.id === incoming.id ? incoming : p));
          return [...prev, incoming];
        });
      } else if (msg.type === "LEAVE") {
        const id = msg.payload?.playerId;
        if (id) setPlayers((prev) => prev.filter((p) => p.id !== id));
      } else if (msg.type === "FULL_STATE") {
        setPlayers(msg.payload.players || []);
      }
    });
    esRef.current = es;

    // announce self
    publishToRoom(roomId, "JOIN", { player: me }, me.id);

    const onUnload = () => {
      try {
        const body = JSON.stringify({
          roomId,
          type: "LEAVE",
          payload: { playerId: me.id },
          senderId: me.id,
        });
        if (navigator.sendBeacon) navigator.sendBeacon("/api/signal", body);
        else
          fetch("/api/signal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
          });
      } catch {}
      es.close();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      es.close();
    };
  }, [me, roomId]);

  // persist me + broadcast updates
  useEffect(() => {
    if (!me) return;
    sessionStorage.setItem(`room:${roomId}:me`, JSON.stringify(me));
    publishToRoom(roomId, "UPDATE", { player: me }, me.id);
  }, [me, roomId]);

  function toggleReady() {
    if (!me) return;
    setMe({ ...me, ready: !me.ready });
  }

  function startGame() {
    if (!me?.isHost) return;
    publishToRoom(roomId, "START", { startedBy: me.id }, me.id);
  }

  // --- render join form for non-hosts ---
  if (!me) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Enter your name to join</h2>
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          className="border rounded-md px-3 py-2 w-full"
          placeholder="Your name"
        />
        <button
          onClick={() => {
            if (!nameInput.trim()) return;
            const player: Player = {
              id: nanoid(6),
              name: nameInput.trim(),
              ready: false,
              isHost: false,
            };
            setMe(player);
            sessionStorage.setItem(`room:${roomId}:me`, JSON.stringify(player));
            publishToRoom(roomId, "JOIN", { player }, player.id);
            setNameInput("");
          }}
          className="rounded-md bg-blue-600 py-2 px-4 text-white"
        >
          Join Room
        </button>
      </div>
    );
  }

  if (gameStarted) {
    return <RiddleRelay roomId={roomId} me={me} players={players} />;
  }

  // --- render lobby ---
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Room {roomId}</h2>

      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="font-medium mb-2">Players</h3>
        <ul className="space-y-1">
          {players.map((p) => (
            <li key={p.id} className="flex items-center justify-between">
              <span>
                {p.name}{" "}
                {p.isHost && (
                  <span className="text-xs text-slate-500">(host)</span>
                )}
              </span>
              <span
                className={
                  p.ready ? "text-green-600 text-sm" : "text-slate-400 text-sm"
                }
              >
                {p.ready ? "Ready" : "Not ready"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-3">
        <button
          onClick={toggleReady}
          className="rounded-md bg-slate-800 py-2 px-4 text-white"
        >
          {me.ready ? "Unready" : "Ready"}
        </button>
        {me.isHost && (
          <button
            onClick={startGame}
            disabled={!players.every((p) => p.ready)}
            className="rounded-md bg-green-700 py-2 px-4 text-white disabled:opacity-50"
          >
            Start Game
          </button>
        )}
      </div>
    </div>
  );
}
