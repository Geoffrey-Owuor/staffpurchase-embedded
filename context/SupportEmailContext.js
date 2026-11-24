"use client";

import { createContext, useContext } from "react";

// The support address comes from the server-only SUPPORT_EMAIL variable
// (lib/serverConfig.js); the root layout provides it here so client
// components can show it. Empty when unset - hide the link then.
const SupportEmailContext = createContext("");

export function SupportEmailProvider({ email, children }) {
  return (
    <SupportEmailContext.Provider value={email}>
      {children}
    </SupportEmailContext.Provider>
  );
}

export function useSupportEmail() {
  return useContext(SupportEmailContext);
}
