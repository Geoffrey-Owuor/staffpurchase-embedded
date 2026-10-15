"use client";
import { Loader2, X } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useId, useState } from "react";
import FormAsterisk from "../FormAsterisk/FormAsterisk";
import Modal from "../Modal/Modal";
import { basePath } from "@/public/assets";

// Keep mounted and toggle `open`; the steps live in their own component so
// the password/confirmation text reset every time the dialog reopens.
export default function DeleteConfirmation({
  open,
  onConfirm,
  onCancel,
  busy = false,
}) {
  const titleId = useId();
  return (
    <Modal
      open={open}
      onClose={onCancel}
      dismissible={!busy}
      labelledBy={titleId}
      className="border-t border-gray-200 bg-gray-50 p-4 shadow-2xl md:max-w-md md:border dark:border-gray-700 dark:bg-gray-950"
    >
      <DeleteSteps
        titleId={titleId}
        onConfirm={onConfirm}
        onCancel={onCancel}
        busy={busy}
      />
    </Modal>
  );
}

function DeleteSteps({ titleId, onConfirm, onCancel, busy }) {
  const { email } = useUser();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [step, setStep] = useState(1);

  //   Text for matching typed in text in step 2
  const textMatch = "I AM SURE";

  const verifyDeletePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${basePath}/api/confirmdeletion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Failed to verify your password");
      }
      const result = await response.json();

      if (result.valid) {
        setStep(2);
      } else {
        setMessage("Wrong password, please try again");
      }
    } catch (error) {
      console.error("Error verifying your password:", error);
      setMessage("Password verification error, please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {step === 1 && (
        <div>
          <div className="flex items-start justify-between">
            <h3
              id={titleId}
              className="mb-3 text-xl font-bold text-gray-900 dark:text-white"
            >
              Delete Purchase Request
            </h3>
            <button
              type="button"
              onClick={onCancel}
              className="cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Close dialog"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <p className="mb-4 text-center text-gray-700 dark:text-gray-400">
            Enter your password before proceeding
          </p>
          {message && (
            <p className="mb-2 text-center text-xs text-red-600 dark:text-red-400">
              {message}
            </p>
          )}
          <form onSubmit={verifyDeletePassword}>
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm text-gray-600 dark:text-gray-400"
              >
                Password <FormAsterisk />
              </label>
              <input
                type="password"
                id="password"
                value={password}
                name="password"
                onChange={(e) => setPassword(e.target.value)}
                required
                data-autofocus
                className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:text-white"
              />
            </div>
            <div className="mt-4 flex justify-center space-x-4">
              <button
                onClick={onCancel}
                type="button"
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Confirming...</span>
                  </div>
                ) : (
                  <span>Confirm</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="flex items-start justify-between">
            <h3
              id={titleId}
              className="mb-3 text-xl font-bold text-gray-900 dark:text-white"
            >
              Confirm Deletion
            </h3>
            <button
              onClick={onCancel}
              type="button"
              disabled={busy}
              className="cursor-pointer text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Close dialog"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <p className="mb-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-400">
            Type in "I AM SURE" in capital letters
          </p>
          <p className="mb-2 text-center text-xs text-amber-800 dark:text-amber-500">
            This action is irreversible and the request will be completely
            removed
          </p>
          <div>
            <input
              type="text"
              value={confirmationText}
              name="confirmationText"
              onChange={(e) => setConfirmationText(e.target.value)}
              required
              autoFocus
              disabled={busy}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:text-white"
            />
          </div>
          {confirmationText && confirmationText !== textMatch && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              text not matching
            </p>
          )}
          <div className="mt-4 flex justify-center space-x-4">
            <button
              onClick={onCancel}
              type="button"
              disabled={busy}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              type="button"
              disabled={busy || confirmationText !== textMatch}
              aria-busy={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
