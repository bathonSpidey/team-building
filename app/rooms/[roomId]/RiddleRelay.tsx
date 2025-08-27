// app/rooms/[roomId]/RiddleRelay.tsx
"use client";

import { useEffect, useState } from "react";
import { publishToRoom, SignalMessage } from "../../../lib/signaling";
import { useRiddleState } from "./riddleState";
import { useRiddleTimer } from "./useRiddleTimer";
import type { Player } from "../../type";

type Props = {
  roomId: string;
  me: Player;
  players: Player[];
};

export default function RiddleRelay({ roomId, me, players }: Props) {
  // --- State ---
  const {
    myRiddle,
    setMyRiddle,
    input,
    setInput,
    solvedPlayers,
    setSolvedPlayers,
    teamComplete,
    setTeamComplete,
    gameOver,
    setGameOver,
    assignNewRiddle,
    resetState,
  } = useRiddleState();
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const timeLeft = useRiddleTimer(timerStart, teamComplete, gameOver, 120);

  // --- Effects ---
  // Assign unique riddle to me on mount
  useEffect(() => {
    assignNewRiddle();
  }, []);

  // Host starts timer and broadcasts to all
  useEffect(() => {
    if (me.isHost && timerStart === null) {
      const now = Date.now();
      setTimerStart(now);
      publishToRoom(roomId, "TIMER_START", { start: now }, me.id);
    }
  }, [me.isHost, timerStart, roomId, me.id]);

  // Listen for SSE updates
  useEffect(() => {
    const es = new EventSource(`/api/signal?roomId=${roomId}`);
    es.onmessage = (e) => {
      const msg: SignalMessage = JSON.parse(e.data);
      switch (msg.type) {
        case "RIDDLE_SOLVED":
          setSolvedPlayers((prev) => ({
            ...prev,
            [msg.payload.playerId]: true,
          }));
          break;
        case "TIMER_START":
          if (msg.payload?.start) {
            setGameOver(false);
            setTeamComplete(false);
            setSolvedPlayers({});
            setTimerStart(msg.payload.start);
            setInput("");
            assignNewRiddle();
          }
          break;
        default:
          break;
      }
    };
    return () => es.close();
  }, [roomId]);

  // Team completion check
  useEffect(() => {
    if (players.length > 0 && players.every((p) => solvedPlayers[p.id])) {
      setTeamComplete(true);
    }
  }, [players, solvedPlayers]);

  // --- Actions ---
  function restartGame() {
    const now = Date.now();
    setGameOver(false);
    setTeamComplete(false);
    setSolvedPlayers({});
    setTimerStart(now);
    setInput("");
    assignNewRiddle();
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

  // --- Render logic ---
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
