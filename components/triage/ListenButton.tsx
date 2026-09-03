"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { VolumeIcon, StopIcon } from "@/components/icons";

type PlayerState = "idle" | "loading" | "playing";

/**
 * Localised advisory voice playback.
 *
 * Strategy (resilient by design):
 *  1. Try Bhashini TTS via /api/bhashini/tts — high-quality Indic voice.
 *     The route returns 501 when the key isn't configured.
 *  2. On any failure (401/501/network), fall back to the browser's built-in
 *     SpeechSynthesis, which works offline and needs no API key.
 *
 * The advisory text passed in is already localised, so voice always matches
 * the current UI language.
 */
export function ListenButton({ text, language }: { text: string; language: string }) {
  const t = useTranslations("triage.advisory");
  const [state, setState] = useState<PlayerState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up the in-memory audio element when the component unmounts.
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  function bhashiniFallback() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setState("idle");
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = language;
    utter.onend = () => setState("idle");
    utter.onerror = () => setState("idle");
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
    setState("playing");
  }

  async function play() {
    setState("loading");
    try {
      const res = await fetch("/api/bhashini/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      });
      if (!res.ok) throw new Error(`bhashini-${res.status}`);
      const blob = await res.blob();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setState("idle");
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        bhashiniFallback();
      };
      setState("playing");
      await audio.play();
    } catch {
      bhashiniFallback();
    }
  }

  function stop() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setState("idle");
  }

  function toggle() {
    if (state === "playing") stop();
    else play();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={state === "loading"}
      aria-label={state === "playing" ? t("stopListen") : t("listen")}
      title={state === "playing" ? t("stopListen") : t("listen")}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-[12px] font-semibold text-ink-2 transition hover:border-ink disabled:opacity-60"
    >
      {state === "playing" ? (
        <StopIcon className="h-3.5 w-3.5" />
      ) : (
        <VolumeIcon className="h-3.5 w-3.5" />
      )}
      <span className="hidden min-[380px]:inline">
        {state === "loading" ? t("listen") + "…" : state === "playing" ? t("stopListen") : t("listen")}
      </span>
    </button>
  );
}
