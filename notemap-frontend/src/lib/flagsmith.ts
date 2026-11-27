import flagsmith from "@flagsmith/flagsmith";
import { getOrCreateUserId } from "./userId";

const NOTE_GENERATION_STYLE_FLAG = "note_generation_style";
const DEFAULT_NOTE_GENERATION_STYLE = "concise";

const clientKey = import.meta.env.VITE_FLAGSMITH_CLIENT_KEY?.trim();
const hasClientKey = Boolean(
  clientKey && clientKey !== "your_client_side_key",
);

let initialization: Promise<void> | null = null;

/**
 * Initialise Flagsmith once at startup and identify the same anonymous user
 * that the API client sends in the `X-User-Id` header.
 */
export function initFlagsmith(): Promise<void> {
  if (initialization) {
    return initialization;
  }

  if (!hasClientKey) {
    console.warn(
      "Flagsmith is not configured. Set VITE_FLAGSMITH_CLIENT_KEY in notemap-frontend/.env.",
    );
    initialization = Promise.resolve();
    return initialization;
  }

  const userId = getOrCreateUserId();

  initialization = flagsmith
    .init({
      environmentID: clientKey,
      enableEvents: true,
    })
    .then(() => flagsmith.identify(userId))
    .catch((error: unknown) => {
      console.error("Flagsmith initialization failed.", error);
    });

  return initialization;
}

/**
 * Reads the note generation experiment flag so Flagsmith can record the
 * exposure for the identified user.
 *
 * In Flagsmith JS v12 `getValue` uses an options object for its fallback and
 * does not emit an exposure event by itself. Resolving the experiment flag
 * records `$flag_exposure` for identities enrolled in the experiment.
 */
export function recordNoteGenerationExposure(): void {
  flagsmith.getValue(NOTE_GENERATION_STYLE_FLAG, {
    fallback: DEFAULT_NOTE_GENERATION_STYLE,
  });
  flagsmith.getExperimentFlag(NOTE_GENERATION_STYLE_FLAG);
}

/** Records a successful PDF export as a Flagsmith conversion event. */
export function trackNoteExported(): void {
  flagsmith.trackEvent("note_exported");
}
