import { useState } from "react";
import { RIDDLES } from "../../../lib/riddles";

export function useRiddleState() {
  const [myRiddle, setMyRiddle] = useState<{
    question: string;
    answer: string;
  } | null>(null);
  const [input, setInput] = useState("");
  const [solvedPlayers, setSolvedPlayers] = useState<Record<string, boolean>>(
    {}
  );
  const [teamComplete, setTeamComplete] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  function assignNewRiddle() {
    const idx = Math.floor(Math.random() * RIDDLES.length);
    setMyRiddle(RIDDLES[idx]);
  }

  function resetState(now: number) {
    setGameOver(false);
    setTeamComplete(false);
    setSolvedPlayers({});
    assignNewRiddle();
  }

  return {
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
  };
}
