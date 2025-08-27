import { useEffect, useState } from "react";

export function useRiddleTimer(
  timerStart: number | null,
  teamComplete: boolean,
  gameOver: boolean,
  duration: number = 120
) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (!timerStart || teamComplete || gameOver) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timerStart) / 1000);
      const left = Math.max(0, duration - elapsed);
      setTimeLeft(left);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerStart, teamComplete, gameOver, duration]);

  return timeLeft;
}
