"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

export type SpeechStatus = "idle" | "listening" | "error";

type UseSpeechRecognitionOptions = {
  /** Called once with the final, trimmed text when speech ends. Not called for empty results. */
  onResult: (text: string) => void;
};

function getRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

// Support never changes while the page is open, so there's nothing to subscribe to.
const subscribe = () => () => {};
const getSupportSnapshot = () => Boolean(getRecognitionConstructor());
const getServerSupportSnapshot = () => false;

/**
 * Wraps the browser's SpeechRecognition (webkitSpeechRecognition in Chrome).
 * One utterance per start(): no interim results, Indian English.
 */
export function useSpeechRecognition({ onResult }: UseSpeechRecognitionOptions) {
  const isSupported = useSyncExternalStore(subscribe, getSupportSnapshot, getServerSupportSnapshot);
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const recognizerRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);

  // Always call the latest callback without restarting recognition.
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // Release the microphone if the component goes away mid-recording.
  useEffect(() => {
    return () => recognizerRef.current?.abort();
  }, []);

  const start = useCallback(() => {
    const Recognition = getRecognitionConstructor();
    if (!Recognition || recognizerRef.current) {
      return;
    }

    const recognizer = new Recognition();
    recognizer.lang = "en-IN";
    recognizer.interimResults = false;
    recognizer.continuous = false;
    recognizer.maxAlternatives = 1;

    recognizer.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript.trim() ?? "";
      if (text) {
        onResultRef.current(text);
      }
    };
    recognizer.onerror = (event) => {
      console.warn("[smart-add] Speech recognition error:", event.error);
      setStatus("error");
    };
    recognizer.onend = () => {
      recognizerRef.current = null;
      setStatus((current) => (current === "error" ? current : "idle"));
    };

    recognizerRef.current = recognizer;
    setStatus("listening");
    recognizer.start();
  }, []);

  /** Ends listening; Chrome still delivers the final result afterwards. */
  const stop = useCallback(() => {
    recognizerRef.current?.stop();
  }, []);

  return { isSupported, status, start, stop };
}
