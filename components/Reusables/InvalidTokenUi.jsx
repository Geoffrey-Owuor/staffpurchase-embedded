import { KeyRound } from "lucide-react";
import Link from "next/link";
import AuthBackground from "./Images/AuthBackground";

export default function InvalidTokenUi() {
  return (
    <AuthBackground>
      <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-lg dark:border-gray-800 dark:bg-gray-950">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
              <KeyRound className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Link Expired
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This password reset link is invalid or has expired. Request a
              new one to continue.
            </p>
          </div>

          <Link
            href="/forgot-password"
            className="block w-full rounded-lg bg-gray-900 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          >
            Request new reset link
          </Link>

          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <Link
              href="/login"
              className="font-medium text-gray-900 hover:underline dark:text-white"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
}
