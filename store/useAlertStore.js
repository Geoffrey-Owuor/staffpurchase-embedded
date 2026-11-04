import { create } from "zustand";

// The most shown at once, so a burst can't fill the screen. The oldest goes first.
const MAX_ALERTS = 4;

// A repeat this soon is one event firing twice (React runs effects twice in
// development), not something the user did again, so it doesn't add to the count
const SAME_EVENT_WINDOW_MS = 300;

let nextAlertId = 0;

export const useAlertStore = create((set) => ({
  // Oldest first. { id, type: "success" | "error", message, count, firedAt }
  alerts: [],

  // Repeating an alert still on screen replaces it, with a new id so it comes
  // back as the newest and gets its full time again, and adds to its count
  // rather than stacking copies
  triggerAlert: (type, message) =>
    set((state) => {
      const isSameAlert = (alert) =>
        alert.type === type && alert.message === message;
      const repeated = state.alerts.find(isSameAlert);
      const firedAt = Date.now();
      const isSameEvent =
        repeated && firedAt - repeated.firedAt < SAME_EVENT_WINDOW_MS;

      return {
        alerts: [
          ...state.alerts.filter((alert) => !isSameAlert(alert)),
          {
            id: nextAlertId++,
            type,
            message,
            count: (repeated?.count ?? 0) + (isSameEvent ? 0 : 1),
            firedAt,
          },
        ].slice(-MAX_ALERTS),
      };
    }),

  dismissAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((alert) => alert.id !== id),
    })),
}));

// Show a toast from anywhere, including outside React: triggerAlert("success", "Saved")
export const triggerAlert = (type, message) =>
  useAlertStore.getState().triggerAlert(type, message);
