/**
 * The tutor's voice out: the browser's own speech synthesis, no service, no
 * download, no setting beyond a mute the reader controls. The mute is stored
 * beside the theme because it is the same kind of choice: one reader, one
 * preference, honored on every surface that speaks.
 */

const MUTE_KEY = "mp:tts-muted";
const VOICE_EVENT = "mp-tts-change";

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function isVoiceMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * The subscription shape the theme uses: a custom event plus the storage
 * event, so a mute flipped in one tab is honored in another, and a component
 * can read the choice through useSyncExternalStore instead of guessing it in
 * an effect.
 */
export function subscribeToVoice(onChange: () => void): () => void {
  window.addEventListener(VOICE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(VOICE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function setVoiceMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "true" : "false");
  } catch {
    // Private browsing keeps the choice for the session and no further.
  }
  window.dispatchEvent(new Event(VOICE_EVENT));
  if (muted) stopSpeaking();
}

/** Speaks one passage, replacing whatever is still being spoken. */
export function speak(text: string): void {
  if (!isSpeechSynthesisSupported() || isVoiceMuted() || !text.trim()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (!isSpeechSynthesisSupported()) return;
  window.speechSynthesis.cancel();
}
