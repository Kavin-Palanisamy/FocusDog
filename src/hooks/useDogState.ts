import { useState, useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { DogState } from "../models/settings";

interface DogMotionPayload {
  state: string;
  direction: string;
  speed: number;
}

export function useDogState() {
  const [state, setState] = useState<DogState>("walking");
  const [direction, setDirection] = useState<"left" | "right">("left");
  const [speed, setSpeed] = useState<number>(1.9);
  const [isPetted, setIsPetted] = useState<boolean>(false);
  const [bubbleText, setBubbleText] = useState<string | null>(null);

  // Listen to Tauri native patrol events
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;

    listen<DogMotionPayload>("dog-motion", (event) => {
      const payload = event.payload;
      if (payload) {
        if (!isPetted) {
          setState((payload.state as DogState) || "idle");
        }
        setDirection(payload.direction === "right" ? "right" : "left");
        if (payload.speed) setSpeed(payload.speed);
      }
    }).then((unlisten) => {
      unlistenFn = unlisten;
    });

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, [isPetted]);

  // Petting action (Double click)
  const petTheDog = useCallback(() => {
    setIsPetted(true);
    setBubbleText("❤️ Woof! *happy tail wag* ❤️");
    setTimeout(() => {
      setIsPetted(false);
      setBubbleText(null);
    }, 2400);
  }, []);

  // Left click interaction: toggle cute status bubble
  const toggleSpeechBubble = useCallback(() => {
    if (bubbleText) {
      setBubbleText(null);
      return;
    }

    const quotes = [
      "🐾 On patrol! Keeping you focused.",
      "🦴 Stay on track! You got this!",
      "🐶 *sniff sniff* Everything looks good!",
      "✨ Remember: focus now, play later!",
    ];
    const picked = quotes[Math.floor(Math.random() * quotes.length)];
    setBubbleText(picked);

    setTimeout(() => {
      setBubbleText((current) => (current === picked ? null : current));
    }, 3500);
  }, [bubbleText]);

  return {
    state: isPetted ? "finished" : state,
    direction,
    speed,
    bubbleText,
    petTheDog,
    toggleSpeechBubble,
  };
}