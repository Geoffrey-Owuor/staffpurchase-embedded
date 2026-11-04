"use client";

import { useState, useEffect, useRef, useCallback, useId } from "react";
import { Mail, Loader2 } from "lucide-react";
import { triggerAlert } from "@/store/useAlertStore";
import Modal from "../Reusables/Modal/Modal";
import ModalHeader from "@/components/Reusables/Modal/ModalHeader";
import { useRouter } from "next/navigation";
import { LoggingOutOverlay } from "../Reusables/LoadingBar";
import { basePath } from "@/utils/basePath";
import { isValidEmail, normalizeEmail } from "@/lib/emailValidation";

// Full screen on mobile. Keep mounted and toggle `open`; the flow's state
// lives in ChangeEmailContent so it starts from step 1 on every reopen.
export default function ChangeEmail({ open, onClose }) {
  const titleId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      mobile="fullscreen"
      className="border-gray-200 bg-gray-50 p-6 shadow-2xl md:max-w-md md:border dark:border-gray-700 dark:bg-gray-950"
    >
      <ChangeEmailContent titleId={titleId} onClose={onClose} />
    </Modal>
  );
}

function ChangeEmailContent({ titleId, onClose }) {
  const router = useRouter();
  const [step, setStep] = useState("step1");
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [coolDown, setCoolDown] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  // Input ref to control where to focus
  const inputRefs = useRef([]);

  // Derived state to check if code is full
  const isCodeFull = otp.join("").length === 6;

  // Same rules the server enforces (lib/emailValidation.js)
  const validateEmail = (email) => isValidEmail(normalizeEmail(email));

  // Effect to validate inputs on change
  useEffect(() => {
    if (newEmail && !validateEmail(newEmail)) {
      setError("Please enter a valid email address.");
    } else if (newEmail && confirmEmail && newEmail !== confirmEmail) {
      setError("The email addresses do not match.");
    } else {
      setError("");
    }
  }, [newEmail, confirmEmail]);

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const response = await fetch(`${basePath}/api/register/verifyemail`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });

      const data = await response.json();
      if (response.ok) {
        triggerAlert("success", data.message || "Verification Code Sent");
        setStep("step2");
      } else {
        triggerAlert("error", data.message || "Failed to send code");
      }
    } catch (error) {
      console.error("Failed to send code", error);
      triggerAlert("error", error.message || "Failed to send code");
    } finally {
      setSending(false);
    }
  };

  // New code submission logic using useCallBack
  const submitCode = useCallback(
    async (codeToSubmit) => {
      if (updating) return;
      setUpdating(true);
      setError("");

      try {
        const response = await fetch(`${basePath}/api/register/verifycode`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newemail: newEmail,
            code: codeToSubmit,
          }),
        });

        const data = await response.json();
        if (response.ok) {
          triggerAlert("success", data.message || "Email updated successfully");
          setOtp(new Array(6).fill(""));

          //Call the logout api endpoint
          await fetch(`${basePath}/api/logout`, { method: "POST" });

          //Redirect to login page after a short delay
          setTimeout(() => {
            setLoggingOut(true);
            router.push("/login");
          }, 2000); //2 second delay for the user to read the alert
        } else {
          triggerAlert("error", data.message || "Failed to verify code");
          setOtp(new Array(6).fill("")); //Clear otp on error
          // Focus first input on error
          inputRefs.current[0]?.focus();
        }
      } catch (error) {
        console.error("Failed to verify the code:", error);
        triggerAlert("error", error.message || "Failed to update email");
        setOtp(new Array(6).fill("")); //Clear otp on error
        // Focus first input on error
        inputRefs.current[0]?.focus();
      } finally {
        setUpdating(false);
      }
    },
    [newEmail],
  );

  //useEffect for auto-submission
  useEffect(() => {
    if (isCodeFull) {
      submitCode(otp.join(""));
    }
  }, [otp, submitCode, isCodeFull]);

  // Manual handling of form submission via enter key or button clikc
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (isCodeFull) {
      submitCode(otp.join(""));
    }
  };

  // New function to handle typing and auto-focus next
  const handleChange = (e, index) => {
    const value = e.target.value;

    // Only allow single digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); //Get only the last character;
    setOtp(newOtp);

    //Move focus to the next input if a digit was entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handling backspace pressing
  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      // If backspace is pressed on empty input, focus previous one
      inputRefs.current[index - 1]?.focus();

      // Clear previous input value
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
    }
  };

  //Handle pasting a six digit code
  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text");
    if (/^\d{6}$/.test(paste)) {
      setOtp(paste.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleResendCode = async (e) => {
    if (coolDown > 0) return;
    setCoolDown(60);
    await handleVerifyEmail(e);
  };

  // Add a useEffect to manage the timer
  useEffect(() => {
    if (coolDown <= 0) return;
    const timer = setTimeout(() => {
      setCoolDown(coolDown - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [coolDown]);

  return (
    <>
      {loggingOut && <LoggingOutOverlay isLoggingOut={loggingOut} />}
      {step === "step1" && (
        <>
          <ModalHeader
            titleId={titleId}
            title="Change Your Email"
            onClose={onClose}
          />

          <form onSubmit={handleVerifyEmail} className="mt-4 space-y-4">
            {/* New Email Field */}
            <div>
              <label
                htmlFor="new-email"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                New Email Address
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                </span>
                <input
                  id="new-email"
                  data-autofocus
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="block w-full rounded-lg border border-gray-300 bg-white p-2 pl-10 text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>
            </div>

            {/* Confirm Email Field */}
            <div>
              <label
                htmlFor="confirm-email"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                Confirm New Email
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                </span>
                <input
                  id="confirm-email"
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder="Confirm your new email"
                  className="block w-full rounded-lg border border-gray-300 bg-white p-2 pl-10 text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-sm text-red-600 dark:text-red-500">{error}</p>
            )}

            {/* Informational Text */}
            <p className="text-xs text-gray-600 dark:text-gray-400">
              A verification code will be sent to this new email address to
              confirm the change.
            </p>

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={error || !newEmail || !confirmEmail || sending}
                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Code"
                )}
              </button>
            </div>
          </form>
        </>
      )}
      {step === "step2" && (
        <>
          {/* Header */}
          <ModalHeader
            titleId={titleId}
            title="Verify Your New Email"
            onClose={onClose}
          />

          {/* Informational Text */}
          <div className="mt-6 mb-7 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A 6-digit verification code has been sent to
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {" "}
                {newEmail}
              </span>
            </p>
          </div>

          <form
            onSubmit={handleFormSubmit}
            className="space-y-6"
            autoComplete="off"
          >
            {/* 6 box input layout */}
            <div
              className="flex justify-center space-x-2"
              onPaste={handlePaste}
            >
              {otp.map((digit, index) => (
                <input
                  key={index}
                  type="text"
                  inputMode="numeric"
                  pattern="\d{1}"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  ref={(el) => (inputRefs.current[index] = el)}
                  required
                  disabled={updating}
                  className="h-14 w-10 rounded-xl border border-gray-300 bg-transparent text-center text-2xl font-semibold tracking-widest focus:border-gray-900 focus:ring-2 focus:ring-gray-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:w-12 dark:border-gray-700 dark:text-white dark:focus:border-white dark:focus:ring-white"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={!isCodeFull || updating}
              className={`w-full rounded-xl px-4 py-3 font-semibold text-white transition duration-200 dark:text-gray-900 ${
                !isCodeFull || updating
                  ? "cursor-not-allowed disabled:bg-gray-400"
                  : "bg-gray-900 hover:bg-gray-700 dark:bg-white dark:hover:bg-gray-200"
              }`}
            >
              {updating ? (
                <div className="flex items-center justify-center gap-2">
                  Verifying...
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-gray-900 dark:border-t-transparent"></div>
                </div>
              ) : (
                <>Verify</>
              )}
            </button>
            <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
              Didn't receive a code?{" "}
              <button
                type="button"
                onClick={handleResendCode}
                className={`${coolDown > 0 ? "cursor-default" : "cursor-pointer hover:underline"} font-semibold text-gray-700 dark:text-gray-300 dark:hover:text-white`}
              >
                {coolDown > 0 ? `Resend code in ${coolDown}s` : "Resend code"}
              </button>
            </div>
          </form>
        </>
      )}
    </>
  );
}
