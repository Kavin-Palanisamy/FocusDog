import { useState, useEffect, useCallback, useRef } from "react";

export type DogState = "idle" | "focusing" | "paused" | "finished";

const DEFAULT_FOCUS_SECONDS = 25 * 60; // 25 minutes = 1500 seconds

export interface UseFocusTimerReturn {
  timeLeft: number;
  formattedTime: string;
  isRunning: boolean;
  dogState: DogState;
  todayMinutes: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
  setDogState: (state: DogState) => void;
}

export function useFocusTimer(initialSeconds: number = DEFAULT_FOCUS_SECONDS): UseFocusTimerReturn {
  const [timeLeft, setTimeLeft] = useState<number>(initialSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [dogState, setDogState] = useState<DogState>("idle");
  const [todayMinutes, setTodayMinutes] = useState<number>(0);

  const initialSecondsRef = useRef<number>(initialSeconds);
  initialSecondsRef.current = initialSeconds;

  const start = useCallback(() => {
    setTimeLeft((prev) => (prev <= 0 ? initialSecondsRef.current : prev));
    setIsRunning(true);
    setDogState("focusing");
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
    setDogState((prev) => (prev === "focusing" ? "paused" : prev));
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(initialSecondsRef.current);
    setDogState("idle");
  }, []);

  // Tick countdown interval
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  // Handle completion when reaching 00:00
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      setDogState("finished");
      const sessionMinutes = Math.round(initialSecondsRef.current / 60);
      setTodayMinutes((prev) => prev + sessionMinutes);
    }
  }, [timeLeft, isRunning]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return {
    timeLeft,
    formattedTime,
    isRunning,
    dogState,
    todayMinutes,
    start,
    pause,
    reset,
    setDogState,
  };
}