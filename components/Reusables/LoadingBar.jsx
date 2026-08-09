import { Loader, Loader2 } from "lucide-react";
import ClientPortal from "./ClientPortal/ClientPortal";

export const LoadingBar = ({ isLoading }) => {
  if (!isLoading) return null;

  const content = (
    <div
      className={`fixed inset-0 z-9999 flex h-screen items-center justify-center bg-black/50 transition-all duration-200 dark:bg-black/60`}
    >
      {/* Container to align the spinner and text horizontally */}
      <div className="flex items-center space-x-2">
        {/* The Lucide Loader spinner */}
        <Loader2
          strokeWidth={1}
          className="h-20 w-20 animate-spin text-black dark:text-white"
          aria-label="loading"
        />

        {/* The text, styled for dark and light modes */}
        {/* <span className="text-lg text-gray-900 dark:text-white">
          Loading...
        </span> */}
      </div>
    </div>
  );
  return <ClientPortal>{content}</ClientPortal>;
};

export const LoadingBarWave = ({ isLoading }) => {
  if (!isLoading) return null;

  const content = (
    <div
      className={`fixed inset-0 z-9999 flex h-screen items-center justify-center bg-black/50 transition-all duration-200 dark:bg-black/60`}
    >
      {/* Container to align the spinner and text horizontally */}
      <div className="flex flex-col items-center gap-4">
        {/* The Lucide Loader spinner */}
        <Loader2
          className="h-14 w-14 animate-spin text-gray-900 dark:text-white"
          aria-label="loading"
        />

        {/* The text, styled for dark and light modes */}
        <span className="text-gray-900 dark:text-white">Saving...</span>
      </div>
    </div>
  );

  return <ClientPortal>{content}</ClientPortal>;
};

export const LoggingOutOverlay = ({ isLoggingOut }) => {
  if (!isLoggingOut) return null;

  const content = (
    // This main div provides the full-screen semi-transparent overlay
    <div className="fixed inset-0 z-9999 flex h-screen items-center justify-center bg-white dark:bg-gray-950">
      {/* Container to align the spinner and text horizontally */}
      <div className="flex flex-col items-center gap-4">
        {/* The Lucide Loader spinner */}
        <Loader
          className="h-14 w-14 animate-spin text-gray-900 dark:text-white"
          aria-label="loading"
        />

        {/* The text, styled for dark and light modes */}
        <span className="text-gray-900 dark:text-white">Logging out...</span>
      </div>
    </div>
  );

  return <ClientPortal>{content}</ClientPortal>;
};

export const DeletingOverlay = () => {
  const content = (
    <div
      className={`fixed inset-0 z-9999 flex h-screen items-center justify-center bg-black/50 transition-all duration-200 dark:bg-black/60`}
    >
      {/* Container to align the spinner and text horizontally */}
      <div className="flex flex-col items-center gap-4">
        {/* The Lucide Loader spinner */}
        <Loader2
          className="h-14 w-14 animate-spin text-gray-900 dark:text-white"
          aria-label="loading"
        />

        {/* The text, styled for dark and light modes */}
        <span className="text-gray-900 dark:text-white">Deleting...</span>
      </div>
    </div>
  );
  return <ClientPortal>{content}</ClientPortal>;
};
