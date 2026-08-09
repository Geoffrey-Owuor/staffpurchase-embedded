import { create } from "zustand";

// Per-table-instance filter store (one is created per useTableQuery call, not
// shared globally). Filters only reach the server once "Apply" is clicked:
// editing a staged value never fetches. Removing a single committed filter
// (a pill's "x") or resetting everything applies immediately instead, since
// narrowing/clearing is low-risk and shouldn't need a second Apply.
//
// `selectedField` drives which single filter's editor FilterPanel shows to
// the right of the field selector - it defaults to the staff-name search
// field and is otherwise just UI state, independent of staged/committed.
export function createFilterStore() {
  return create((set) => ({
    committed: {},
    staged: {},
    stagedKeys: [],
    selectedField: "search",

    setSelectedField: (key) => set({ selectedField: key }),

    // Writes a value into the staging area, auto-adding the key the first
    // time it's touched. Whatever's staged for a field overrides its
    // committed value until Apply (or a clear) resolves it.
    setStagedValue: (key, value) =>
      set((state) => ({
        staged: { ...state.staged, [key]: value },
        stagedKeys: state.stagedKeys.includes(key)
          ? state.stagedKeys
          : [...state.stagedKeys, key],
      })),

    // Drops keys out of the staging area without touching committed - used
    // to discard an incomplete edit (e.g. only one end of a date range) and
    // by the per-field "clear" action.
    clearStagedKeys: (keys) =>
      set((state) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        const staged = { ...state.staged };
        for (const key of keyList) delete staged[key];
        return {
          staged,
          stagedKeys: state.stagedKeys.filter((k) => !keyList.includes(k)),
        };
      }),

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
