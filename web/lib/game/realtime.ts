/**
 * How a game screen learns that the room moved.
 *
 * The transport carries nothing but "look again": every piece of game truth
 * comes from game_state, so there is no second path that could leak an answer
 * key and none to keep in sync. Push arrives over Supabase Realtime when the
 * network allows it; a short poll always runs underneath, because a missed
 * push must never freeze a room, and the poll is the whole transport where
 * websockets cannot reach (the dev container's HTTP rewrite, some networks).
 */

type RealtimeChannel = {
  on: (
    event: "postgres_changes",
    filter: Record<string, unknown>,
    callback: () => void,
  ) => RealtimeChannel;
  subscribe: () => RealtimeChannel;
  unsubscribe: () => void;
};

type RealtimeClient = {
  channel: (name: string) => RealtimeChannel;
  removeChannel: (channel: RealtimeChannel) => void;
};

export type GameTransport = {
  close: () => void;
};

export const POLL_MS = 2_500;

export function shouldForcePoll(search: string): boolean {
  return new URLSearchParams(search).get("transport") === "poll";
}

export function createGameTransport(
  client: RealtimeClient,
  roomId: string,
  onVersion: () => void,
  options: { pollMs?: number; forcePoll?: boolean } = {},
): GameTransport {
  const pollMs = options.pollMs ?? POLL_MS;
  const timer = window.setInterval(onVersion, pollMs);

  let channel: RealtimeChannel | null = null;
  if (!options.forcePoll) {
    try {
      channel = client
        .channel(`room:${roomId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "game_rooms", filter: `id=eq.${roomId}` },
          onVersion,
        )
        .subscribe();
    } catch {
      // No realtime here; the poll above is already running.
      channel = null;
    }
  }

  return {
    close: () => {
      window.clearInterval(timer);
      if (channel) {
        try {
          client.removeChannel(channel);
        } catch {
          // Already gone; the poll never needed it anyway.
        }
      }
    },
  };
}
