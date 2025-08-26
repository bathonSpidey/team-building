// app/rooms/[roomId]/Puzzle1.tsx
"use client";

import { useEffect, useState } from "react";
import { publishToRoom, SignalMessage } from "../../../lib/signaling";

type Player = { id: string; name: string; ready: boolean; isHost: boolean };

type PuzzleProps = {
  roomId: string;
  me: Player;
  players: Player[];
};

const COLORS = ["red", "green", "blue", "yellow"];

export default function SignalRelayCalibration({
  roomId,
  me,
  players,
}: PuzzleProps) {
  const [sequence, setSequence] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [clickedPlayers, setClickedPlayers] = useState<Record<string, number>>(
    {}
  ); // playerId -> step

  useEffect(() => {
    // Generate random sequence at start
    const seq = Array.from(
      { length: 4 },
      () => COLORS[Math.floor(Math.random() * COLORS.length)]
    );
    setSequence(seq);
  }, []);

  useEffect(() => {
    // subscribe to other players' clicks
    const es = new EventSource(`/api/signal?roomId=${roomId}`);
    es.onmessage = (e) => {
      const msg: SignalMessage = JSON.parse(e.data);
      if (msg.type === "PUZZLE1_CLICK") {
        const { playerId, step } = msg.payload;
        setClickedPlayers((prev) => ({ ...prev, [playerId]: step }));
      }
    };
    return () => es.close();
  }, [roomId]);

  // Check if all players clicked the current step
  useEffect(() => {
    const allReached = players.every(
      (p) => clickedPlayers[p.id] >= currentStep
    );
    if (allReached && currentStep < sequence.length) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [clickedPlayers, players, currentStep, sequence.length]);

  function handleClick(color: string) {
    if (sequence[currentStep] !== color) return; // wrong button
    // broadcast click
    publishToRoom(
      roomId,
      "PUZZLE1_CLICK",
      { playerId: me.id, step: currentStep },
      me.id
    );
    setClickedPlayers((prev) => ({ ...prev, [me.id]: currentStep }));
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Signal Relay: Calibration</h2>
      <p>
        Follow the sequence! Everyone must click the correct color together.
      </p>
      <div className="flex gap-4">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => handleClick(c)}
            className={`w-20 h-20 rounded-md ${c}-500`}
            style={{ backgroundColor: c }}
            aria-label={`Color button: ${c}`}
          >
            <span className="sr-only">{c}</span>
          </button>
        ))}
      </div>
      <p>
        Step {Math.min(currentStep + 1, sequence.length)} / {sequence.length}
      </p>
      {currentStep >= sequence.length && (
        <p className="text-green-600 font-semibold">Puzzle Solved!</p>
      )}
    </div>
  );
}
