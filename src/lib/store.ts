// In-memory app state persisted to localStorage. Seed comes from src/data/seed.json.
import { useSyncExternalStore } from "react";
import { buildSeed, sweepExpirations } from "./actions";
import type { AppState } from "./types";

const STORAGE_KEY = "c180-demo-state-v1";
const VERIFIER_EMAIL_KEY = "c180-verifier-email";

let state: AppState | null = null;
let serverSnapshot: AppState | null = null;
let hydrated = false;
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

/** True once localStorage has been loaded on the client. */
export function useStoreHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hydrated,
    () => false,
  );
}


function getState(): AppState {
  if (!state) state = buildSeed();
  return state;
}
function getServerSnapshot(): AppState {
  if (!serverSnapshot) serverSnapshot = buildSeed();
  return serverSnapshot;
}
function emit() {
  for (const l of listeners) l();
}
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable: keep in memory */
  }
}

/** Call once on the client after hydration. */
export function hydrateStore(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state = raw ? (JSON.parse(raw) as AppState) : buildSeed();
  } catch {
    state = buildSeed();
  }
  sweepExpirations(state);
  hydrated = true;
  persist();
  emit();
}

/** Run an action against a cloned draft, then commit, persist and notify. */
export function act<T>(fn: (draft: AppState) => T): T {
  const draft = structuredClone(getState());
  const result = fn(draft);
  state = draft;
  persist();
  emit();
  return result;
}

export function resetStore(): void {
  state = buildSeed();
  persist();
  emit();
}

export function snapshot(): AppState {
  return getState();
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getServerSnapshot);
}

export function getVerifierEmail(): string | null {
  try {
    return localStorage.getItem(VERIFIER_EMAIL_KEY);
  } catch {
    return null;
  }
}
export function setVerifierEmail(email: string): void {
  try {
    localStorage.setItem(VERIFIER_EMAIL_KEY, email.trim().toLowerCase());
  } catch {
    /* ignore */
  }
}
