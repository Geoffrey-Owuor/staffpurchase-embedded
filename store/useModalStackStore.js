import { create } from "zustand";

// How many Modals are open, so things outside them (the toasts) can make room
export const useModalStackStore = create((set) => ({
  openCount: 0,
  modalOpened: () => set((state) => ({ openCount: state.openCount + 1 })),
  modalClosed: () => set((state) => ({ openCount: state.openCount - 1 })),
}));
