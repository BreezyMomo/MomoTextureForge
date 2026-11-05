import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

type Handler = (event: Event) => unknown;
const handlers = new Map<string, Record<string, Handler>>();

// The editor's document/undo controller remains independent of its React views.
export function editorHandlers(id: string) {
  let entry = handlers.get(id);
  if (!entry) handlers.set(id, (entry = {}));
  return entry;
}

export function dispatchEditorEvent(id: string, type: string, event: Event) {
  return handlers.get(id)?.[type]?.(event);
}

export function createViewStore<T>(initial: T) {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update(next: T) {
      // Canvas hit testing, focus restoration and dock sizing read the committed DOM.
      flushSync(() => {
        snapshot = next;
        for (const listener of listeners) listener();
      });
    },
  };
}

export function useViewStore<T>(store: ReturnType<typeof createViewStore<T>>) {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}
