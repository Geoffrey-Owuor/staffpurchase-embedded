import { create } from "zustand";

// Per-table-instance filter store (one is created per useTableQuery call, not
// shared globally). Filters only reach the server once "Apply" is clicked:
// building up `staged` values never fetches. Removing a single committed
// filter (a pill's "x") or resetting everything applies immediately instead,
// since narrowing/clearing is low-risk and shouldn't need a second Apply.
export function createFilterStore() {
  return create((set) => ({
    committed: {},
    staged: {},
    stagedKeys: [],

    // Adds a key to the staging area (used when a field is picked from the
    // "+ Add filter" dropdown). No-ops if already staged.
    stageField: (key, initialValue = "") =>
      set((state) =>
        state.stagedKeys.includes(key)
          ? state
          : {
              stagedKeys: [...state.stagedKeys, key],
              staged: { ...state.staged, [key]: initialValue },
            },
      ),

    // Removes a key from the staging area before it's ever applied.
    unstageField: (key) =>
      set((state) => {
        const staged = { ...state.staged };
        delete staged[key];
        return { staged, stagedKeys: state.stagedKeys.filter((k) => k !== key) };
      }),

    setStagedValue: (key, value) =>
      set((state) => ({ staged: { ...state.staged, [key]: value } })),

    // Merges every staged value into committed (triggering a fetch) and
    // clears the staging area.
    applyFilters: () =>
      set((state) => ({
        committed: { ...state.committed, ...state.staged },
        staged: {},
        stagedKeys: [],
      })),

    // Removes one or more keys straight out of committed - used by a pill's
    // remove button. Takes effect immediately (no Apply needed).
    removeCommittedFilter: (keys) =>
      set((state) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        const committed = { ...state.committed };
        for (const key of keyList) delete committed[key];
        return { committed };
      }),

    resetAll: () => set({ committed: {}, staged: {}, stagedKeys: [] }),
  }));
}
