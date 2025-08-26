// app/rooms/[roomId]/RiddleRelay.tsx
"use client";

import { useEffect, useState } from "react";
import { RIDDLES } from "../../../lib/riddles";
import { publishToRoom, SignalMessage } from "../../../lib/signaling";

type Player = { id: string; name: string; ready: boolean; isHost: boolean };

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

  // assign unique riddle to me
  useEffect(() => {
    const idx = Math.floor(Math.random() * RIDDLES.length);
    setMyRiddle(RIDDLES[idx]);
  }, []);

  // listen for SSE updates
  useEffect(() => {
    const es = new EventSource(`/api/signal?roomId=${roomId}`);
    es.onmessage = (e) => {
      const msg: SignalMessage = JSON.parse(e.data);
      if (msg.type === "RIDDLE_SOLVED") {
        setSolvedPlayers((prev) => ({ ...prev, [msg.payload.playerId]: true }));
      }
    };
    return () => es.close();
  }, [roomId]);

  useEffect(() => {
    if (players.length > 0 && players.every((p) => solvedPlayers[p.id])) {
      setTeamComplete(true);
    }
  }, [players, solvedPlayers]);

  function submitAnswer() {
    if (!myRiddle) return;
    if (input.trim().toLowerCase() === myRiddle.answer.toLowerCase()) {
      publishToRoom(roomId, "RIDDLE_SOLVED", { playerId: me.id }, me.id);
      setSolvedPlayers((prev) => ({ ...prev, [me.id]: true }));
    } else {
      alert("Not quite right — try again!");
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Riddle Relay</h2>
      {!teamComplete ? (
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
      ) : (
        <div className="text-center p-6 bg-green-100 rounded-xl">
          <h3 className="text-xl font-bold">🎉 All riddles solved!</h3>
          <p className="mt-2">
            Your team worked together and unlocked the next stage.
          </p>
        </div>
      )}
    </div>
  );
}
