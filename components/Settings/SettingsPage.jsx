"use client";
import { useId, useState } from "react";
import { CircleUserRound, ShieldUser, X } from "lucide-react";
import Modal from "../Reusables/Modal/Modal";
import GeneralSettingsPage from "./GeneralSettingsPage";
import SecuritySettingsPage from "./SecuritySettingsPage";

// Full screen on mobile, a two-pane card on desktop. Keep mounted and toggle
// `open`; the tab state lives in SettingsContent so it resets on reopen.
export default function SettingsPage({ open, onClose }) {
  const titleId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      mobile="fullscreen"
      className="relative bg-gray-50 shadow-2xl md:min-h-[min(34.5rem,calc(100dvh-2rem))] md:max-w-3xl md:flex-row md:border md:border-gray-200 dark:bg-gray-900 dark:md:border-gray-800"
    >
      <SettingsContent titleId={titleId} onClose={onClose} />
    </Modal>
  );
}

function SettingsContent({ titleId, onClose }) {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <>
      {/* Side Navigation: a pinned bar on phones, a pinned column on desktop */}
      <div
        data-modal-header
        className="sticky top-0 z-10 w-full shrink-0 border-b border-gray-200 bg-white p-4 md:static md:w-1/4 md:border-r md:border-b-0 md:bg-white/50 dark:border-gray-800 dark:bg-gray-950 md:dark:bg-gray-950/50"
      >
        <div className="md:sticky md:top-4">
          <h3
            id={titleId}
            className="mb-4 text-lg font-semibold text-gray-900 dark:text-white"
          >
            Settings
          </h3>
          <nav className="small-scrollbar flex flex-row items-center justify-center space-x-2 overflow-x-auto pb-2 md:flex-col md:space-y-2 md:space-x-0 md:overflow-x-visible md:pb-0">
            <button
              onClick={() => setActiveTab("general")}
              className={`flex shrink-0 items-center space-x-2 rounded-xl p-2 text-left text-sm font-semibold whitespace-nowrap transition-colors md:w-full ${
                activeTab === "general"
                  ? "bg-gray-200 text-black dark:bg-gray-800 dark:text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-100"
              }`}
            >
              <CircleUserRound className="h-5 w-5" />
              <span className="mt-0.5 md:mt-0">General</span>
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`flex shrink-0 items-center space-x-2 rounded-xl p-2 text-left text-sm font-semibold whitespace-nowrap transition-colors md:w-full ${
                activeTab === "security"
                  ? "bg-gray-200 text-black dark:bg-gray-800 dark:text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-100"
              }`}
            >
              <ShieldUser className="h-5 w-5" />
              <span className="mt-0.5 md:mt-0">Security</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Content Panel */}
      <div className="w-full grow p-4 md:w-3/4 md:p-8">
        {activeTab === "general" && <GeneralSettingsPage />}
        {activeTab === "security" && <SecuritySettingsPage />}
      </div>

      {/* A zero-size sticky anchor, so the button stays in the corner while the
          panel scrolls. Shown first on phones so it pins over the bar above, but
          last in the DOM to keep the tab order. */}
      <div
        data-modal-header
        className="sticky top-0 z-20 order-first h-0 w-full shrink-0 md:order-last md:w-0 md:self-start"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-4 cursor-pointer md:top-7.5 rounded-full bg-gray-50/80 p-1.5 text-gray-900 transition-colors hover:text-gray-700 dark:bg-gray-900/80 dark:text-gray-200 dark:hover:text-gray-400"
          aria-label="Close settings"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
    </>
  );
}
