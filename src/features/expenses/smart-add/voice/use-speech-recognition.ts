"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

export type SpeechStatus = "idle" | "listening" | "error";

type UseSpeechRecognitionOptions = {
  /** Called with each final, trimmed phrase (one per pause). Never called with empty text. */
  onResult: (phrase: string) => void;
};

/** Listening ends after this long with no speech. */
const SILENCE_TIMEOUT_MS = 2 * 60 * 1000;

/** Errors that mean listening can't continue; anything else is restarted. */
const FATAL_ERRORS = new Set(["not-allowed", "service-not-allowed", "audio-capture", "network"]);

function getRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

// Support never changes while the page is open, so there's nothing to subscribe to.
const subscribe = () => () => {};
const getSupportSnapshot = () => Boolean(getRecognitionConstructor());
const getServerSupportSnapshot = () => false;

/**
 * Wraps the browser's SpeechRecognition (webkitSpeechRecognition in Chrome)
 * for dictation: keeps listening across pauses, hands back each finished
 * phrase, and stops on stop(), after 2 minutes of silence, or on a fatal error.
 * Chrome ends sessions on its own after silence; those are restarted.
 */
export function useSpeechRecognition({ onResult }: UseSpeechRecognitionOptions) {
  const isSupported = useSyncExternalStore(subscribe, getSupportSnapshot, getServerSupportSnapshot);
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const recognizerRef = useRef<SpeechRecognition | null>(null);
  const keepListeningRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResultRef = useRef(onResult);

  // Always call the latest callback without restarting recognition.
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  /** Ends listening for good; Chrome still delivers the last phrase afterwards. */
  const stop = useCallback(() => {
    keepListeningRef.current = false;
    clearSilenceTimer();
    recognizerRef.current?.stop();
  }, [clearSilenceTimer]);

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(stop, SILENCE_TIMEOUT_MS);
  }, [clearSilenceTimer, stop]);

  // Release the microphone if the component goes away mid-recording.
  useEffect(() => {
    return () => {
      keepListeningRef.current = false;
      clearSilenceTimer();
      recognizerRef.current?.abort();
    };
  }, [clearSilenceTimer]);

  const start = useCallback(() => {
    const Recognition = getRecognitionConstructor();
    if (!Recognition || recognizerRef.current) {
      return;
    }

    const recognizer = new Recognition();
    recognizer.lang = "en-IN";
    recognizer.interimResults = false;
    recognizer.continuous = true;
    recognizer.maxAlternatives = 1;

    recognizer.onspeechstart = resetSilenceTimer;
    recognizer.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const phrase = result.isFinal ? result[0]?.transcript.trim() : "";
        if (phrase) {
          resetSilenceTimer();
          onResultRef.current(phrase);
        }
      }
    };
    recognizer.onerror = (event) => {
      // "no-speech" and "aborted" are routine in continuous mode; onend restarts.
      if (FATAL_ERRORS.has(event.error)) {
        console.warn("[smart-add] Speech recognition error:", event.error);
        keepListeningRef.current = false;
        clearSilenceTimer();
        setStatus("error");
      }
    };
    recognizer.onend = () => {
      if (keepListeningRef.current) {
        try {
          recognizer.start(); // Chrome stopped by itself (silence or session limit): continue
          return;
        } catch (error) {
          console.warn("[smart-add] Could not restart speech recognition:", error);
          keepListeningRef.current = false;
          clearSilenceTimer();
        }
      }

      recognizerRef.current = null;
      setStatus((current) => (current === "error" ? current : "idle"));
    };

    recognizerRef.current = recognizer;
    keepListeningRef.current = true;
    setStatus("listening");
    resetSilenceTimer();
    recognizer.start();
  }, [clearSilenceTimer, resetSilenceTimer]);

  return { isSupported, status, start, stop };
}
