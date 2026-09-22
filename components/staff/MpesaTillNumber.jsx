"use client";
import { useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";

export default function MpesaTillNumber() {
  const [copied, setCopied] = useState(false);
  const tillNumber = "80057";

  const handleCopy = async () => {
    try {
      // 1. Try the modern Clipboard API first
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(tillNumber);
      } else {
        // 2. Fallback for older browsers and HTTP environments (Mobile Webviews)
        const textArea = document.createElement("textarea");
        textArea.value = tillNumber;

        // Prevent scrolling to the bottom of the page in MS Edge / older browsers
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        // Execute the copy command
        document.execCommand("copy");

        // Clean up
        textArea.remove();
      }

      // Trigger success state
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white py-1 pr-1.5 pl-3 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <span className="font-mono text-[11px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
        Till No.
      </span>

      <span className="font-mono text-sm font-bold tracking-widest text-gray-900 dark:text-white">
        {tillNumber}
      </span>
      <button
        onClick={handleCopy}
        className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold transition-all duration-200 ${
          copied
            ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
            : "bg-green-600 text-white hover:bg-green-700 active:scale-95 dark:bg-green-700 dark:hover:bg-green-600"
        }`}
      >
        {copied ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
