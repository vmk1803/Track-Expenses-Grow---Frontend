"use client";

import { type FormEvent, useState } from "react";
import type { SmartAddSubmission } from "@/features/expenses/smart-add/types";
import { useSpeechRecognition } from "@/features/expenses/smart-add/voice/use-speech-recognition";
import { cn } from "@/lib/utils/cn";

type SmartAddBarProps = {
  disabled: boolean;
  disabledReason?: string;
  /** True while the AI parse request is pending: Enter is ignored and the text is read-only. */
  busy: boolean;
  onSubmit: (submission: SmartAddSubmission) => void;
};

export function SmartAddBar({ disabled, disabledReason, busy, onSubmit }: SmartAddBarProps) {
  const [text, setText] = useState("");
  const { isSupported, status, start, stop } = useSpeechRecognition({
    onResult: (spokenText) => {
      // Shown in the bar after listening, editable like typed text.
      setText(spokenText);

      if (disabled || busy) {
        return; // same guards as Enter
      }

      onSubmit({ text: spokenText, source: "voice" });
    },
  });
  const listening = status === "listening";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = text.trim();

    if (!trimmed || disabled || busy || listening) {
      return;
    }

    onSubmit({ text: trimmed, source: "text" });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="relative">
        <label htmlFor="smart-add-input" className="sr-only">
          Describe an expense
        </label>
        <input
          id="smart-add-input"
          type="text"
          // No live transcript: the field stays empty while listening.
          value={listening ? "" : text}
          onChange={(event) => setText(event.target.value)}
          disabled={disabled}
          readOnly={busy || listening}
          title={disabled ? disabledReason : undefined}
          placeholder={listening ? "Listening…" : "Try “250 for coffee at Starbucks yesterday”"}
          autoComplete="off"
          enterKeyHint="go"
          // Not fieldClass: cn() doesn't merge Tailwind classes, so overriding its
          // px-4/text-sm would depend on CSS order. Same tokens, bigger sizing.
          className="h-14 w-full rounded-2xl border border-border bg-background pl-5 pr-14 text-base text-foreground outline-none transition placeholder:text-copy-muted focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed"
        />

        {/* Hidden where the browser has no speech recognition (e.g. Firefox). */}
        {isSupported ? (
          <button
            type="button"
            onClick={listening ? stop : start}
            disabled={disabled || busy}
            title={listening ? "Stop listening" : "Start voice input"}
            aria-label={listening ? "Stop listening" : "Start voice input"}
            aria-pressed={listening}
            className={cn(
              "absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-50",
              listening
                ? "bg-brand/10 text-brand"
                : "text-copy-muted hover:bg-brand/10 hover:text-brand"
            )}
          >
            {listening ? (
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <rect x="5" y="5" width="10" height="10" rx="2" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 20 20"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <rect x="7.25" y="2.75" width="5.5" height="9.5" rx="2.75" />
                <path d="M4.75 9.5a5.25 5.25 0 0 0 10.5 0M10 14.75v2.5" strokeLinecap="round" />
              </svg>
            )}
          </button>
        ) : null}
      </div>

      {/* Always rendered so screen readers announce the change; min-h keeps the layout steady. */}
      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-brand-strong">
        {busy ? "Enhancing with AI…" : ""}
      </p>
    </form>
  );
}
