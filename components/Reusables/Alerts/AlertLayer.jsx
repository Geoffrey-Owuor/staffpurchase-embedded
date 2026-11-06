"use client";

import Alert from "./Alert";
import { useAlertStore } from "@/store/useAlertStore";
import { useModalStackStore } from "@/store/useModalStackStore";

// Holds the app's toasts above everything, stacked in one corner with the newest
// nearest it. Lives in the root layout, so a toast outlives the page that fired
// it (e.g. "Saved, redirecting..."). On phones a modal fills the screen or docks
// to the bottom with its actions there, so the layer moves to the top while one
// is open. Modal finds this layer by its attribute, so an open modal's Tab cycle
// can reach the toasts' buttons.
const AlertLayer = () => {
  const alerts = useAlertStore((state) => state.alerts);
  const isModalOpen = useModalStackStore((state) => state.openCount > 0);

  return (
    <div
      data-alert-layer
      className={`pointer-events-none fixed right-4 left-4 z-9999 flex flex-col gap-2 sm:top-auto sm:right-6 sm:bottom-6 sm:left-auto sm:w-md ${
        isModalOpen
          ? "top-[max(1rem,env(safe-area-inset-top))]"
          : "bottom-[max(1rem,env(safe-area-inset-bottom))]"
      }`}
    >
      {alerts.map((alert) => (
        <Alert key={alert.id} alert={alert} />
      ))}
    </div>
  );
};

export default AlertLayer;
