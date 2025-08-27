// app/rooms/[roomId]/RiddleRelay.tsx
"use client";

import { useEffect, useState } from "react";
import { RIDDLES } from "../../../lib/riddles";
import { publishToRoom, SignalMessage } from "../../../lib/signaling";
import type { Player } from "../../type";

type Props = {
  roomId: string;
  me: Player;
  players: Player[];
};

export default function RiddleRelay({ roomId, me, players }: Props) {
  const [myRiddle, setMyRiddle] = useState<{
    question: string;
    answer: string;
  } | null>(null);
  const [input, setInput] = useState("");
  const [solvedPlayers, setSolvedPlayers] = useState<Record<string, boolean>>(
    {}
  );
  const [teamComplete, setTeamComplete] = useState(false);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(120);
  const [gameOver, setGameOver] = useState(false);

  // assign unique riddle to me
  useEffect(() => {
    const idx = Math.floor(Math.random() * RIDDLES.length);
    setMyRiddle(RIDDLES[idx]);
  }, []);

  // Host starts timer and broadcasts to all
  useEffect(() => {
    if (me.isHost && timerStart === null) {
      const now = Date.now();
      setTimerStart(now);
      publishToRoom(roomId, "TIMER_START", { start: now }, me.id);
    }
  }, [me.isHost, timerStart, roomId]);

  // Listen for SSE updates
  useEffect(() => {
    const es = new EventSource(`/api/signal?roomId=${roomId}`);
    es.onmessage = (e) => {
      const msg: SignalMessage = JSON.parse(e.data);
      if (msg.type === "RIDDLE_SOLVED") {
        setSolvedPlayers((prev) => ({ ...prev, [msg.payload.playerId]: true }));
      }
      if (msg.type === "TIMER_START" && msg.payload?.start) {
        setTimerStart(msg.payload.start);
        setGameOver(false);
        setTeamComplete(false);
        setSolvedPlayers({});
        setTimeLeft(120);
        // Optionally re-assign a new riddle
        const idx = Math.floor(Math.random() * RIDDLES.length);
        setMyRiddle(RIDDLES[idx]);
      }
    };
    return () => es.close();
  }, [roomId]);

  // Timer countdown
  useEffect(() => {
    if (!timerStart || teamComplete || gameOver) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timerStart) / 1000);
      const left = Math.max(0, 120 - elapsed);
      setTimeLeft(left);
      if (left === 0) {
        setGameOver(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timerStart, teamComplete, gameOver]);

  // Team completion check
  useEffect(() => {
    if (players.length > 0 && players.every((p) => solvedPlayers[p.id])) {
      setTeamComplete(true);
    }
  }, [players, solvedPlayers]);

  function restartGame() {
    const now = Date.now();
    setGameOver(false);
    setTeamComplete(false);
    setSolvedPlayers({});
    setTimerStart(now);
    setTimeLeft(120);
    publishToRoom(roomId, "TIMER_START", { start: now }, me.id);
  }

  function submitAnswer() {
    if (!myRiddle) return;
    publishToRoom(roomId, "RIDDLE_SOLVED", { playerId: me.id }, me.id);
    if (input.trim().toLowerCase() === myRiddle.answer.toLowerCase()) {
      setSolvedPlayers((prev) => ({ ...prev, [me.id]: true }));
    } else {
      alert("Not quite right — try again!");
    }
  }

  // Render logic
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Riddle Relay</h2>
      {!teamComplete && !gameOver && (
        <div className="text-center text-lg font-bold text-slate-700">
          Time left: {Math.floor(timeLeft / 60)}:
          {(timeLeft % 60).toString().padStart(2, "0")}
        </div>
      )}
      {gameOver ? (
        <div className="text-center p-6 bg-red-100 rounded-xl">
          <h3 className="text-xl font-bold">⏰ Time&apos;s up!</h3>
          <p className="mt-2">
            Game over! Don&apos;t worry, every puzzle is a chance to learn and
            improve. Rally your team and try again!
          </p>
          {me.isHost && (
            <button
              onClick={restartGame}
              className="mt-4 bg-blue-700 text-white rounded-md px-4 py-2"
            >
              Restart Game
            </button>
          )}
        </div>
      ) : teamComplete ? (
        <div className="text-center p-6 bg-green-100 rounded-xl">
          <h3 className="text-xl font-bold">🎉 All riddles solved!</h3>
          <p className="mt-2">
            Your team worked together and unlocked the next stage.
          </p>
        </div>
      ) : (
        <>
          <div className="p-4 bg-white rounded-xl shadow">
            <h3 className="font-medium mb-2">Your Riddle</h3>
            <p className="mb-2">{myRiddle?.question}</p>
            {solvedPlayers[me.id] ? (
              <p className="text-green-600 font-semibold">
                ✅ You solved your riddle!
              </p>
            ) : (
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Your answer"
                  className="border rounded-md px-2 py-1"
                />
                <button
                  onClick={submitAnswer}
                  className="bg-blue-600 text-white rounded-md px-3 py-1"
                >
                  Submit
                </button>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50 rounded-xl shadow">
            <h3 className="font-medium mb-2">Team Progress</h3>
            <ul className="space-y-1">
              {players.map((p) => (
                <li key={p.id}>
                  {p.name}:{" "}
                  {solvedPlayers[p.id] ? (
                    <span className="text-green-600">Solved</span>
                  ) : (
                    <span className="text-red-500">Not solved</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
