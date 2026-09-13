/**
 * A thin wrapper over the browser's speech recognition, kept narrow so the
 * tutor component never touches the API itself.
 *
 * Support is Chromium and Safari. Firefox has none, so every caller must keep
 * the typed path one tap away; the wrapper returns null rather than throwing
 * where support is missing, and the UI treats that as "type instead".
 */

type RecognitionResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0?: { transcript?: string } }>;
};

type RecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

export type RecognitionUpdate = {
  /** Everything recognized so far, finals plus the interim tail. */
  text: string;
  /** The finals only, stable across updates. */
  settled: string;
  /** The tail still being recognized. */
  interim: string;
};

export type RecognitionHandle = {
  stop: () => void;
  abort: () => void;
};

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return typeof w.SpeechRecognition === "function" || typeof w.webkitSpeechRecognition === "function";
}

/** The full text shown for a moment: settled words plus the interim tail. */
export function mergeTranscript(settled: string, interim: string): string {
  return `${settled} ${interim}`.replace(/\s+/g, " ").trim();
}

export function startRecognition(handlers: {
  onUpdate?: (update: RecognitionUpdate) => void;
  onError?: (code: string) => void;
  onEnd?: () => void;
}): RecognitionHandle | null {
  if (!isSpeechRecognitionSupported()) return null;
  const w = window as unknown as Record<string, unknown>;
  const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as new () => RecognitionLike;
  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  // The tutor is spoken; the reader's own language is the one to hear.
  recognition.lang = navigator.language || "en";

  let settled = "";

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const transcript = result[0]?.transcript ?? "";
      if (result.isFinal) {
        settled = mergeTranscript(settled, transcript);
        interim = "";
      } else {
        interim = transcript;
      }
    }
    handlers.onUpdate?.({
      text: mergeTranscript(settled, interim),
      settled,
      interim: interim.trim(),
    });
  };
  recognition.onerror = (event) => handlers.onError?.(event.error ?? "unknown");
  recognition.onend = () => handlers.onEnd?.();

  recognition.start();
  return {
    stop: () => recognition.stop(),
    abort: () => {
      try {
        recognition.abort();
      } catch {
        // Already stopped; the end event does the cleanup either way.
      }
    },
  };
}
