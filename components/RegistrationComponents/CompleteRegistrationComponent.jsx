"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import AuthBackground from "../Reusables/Images/AuthBackground";
import Alert from "../Alert";
import Select from "../Reusables/Select";
import { basePath } from "@/public/assets";
import { useDepartments } from "@/hooks/useReferenceData";
import { isValidRole } from "@/utils/routes";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors placeholder:text-gray-400 hover:border-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:hover:border-gray-600 dark:focus:border-gray-600 dark:focus:ring-gray-600";
// Details that come from the staff record and can't be edited here
const lockedClass =
  "w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300";
const labelClass = "text-sm font-medium text-gray-900 dark:text-gray-100";

// The account's name and payroll number come from the HR staff record
// (lib/registrationStaff.js), and so does its department when it matches
// one of ours. A personal email's record is found by the page (initialStaff);
// a company email's owner finds theirs by payroll number here.
export default function CompleteRegistrationComponent({
  email,
  isCompanyEmail,
  initialStaff,
  staffError,
}) {
  const [staff, setStaff] = useState(initialStaff);
  const [formData, setFormData] = useState({
    password: "",
    payrollNo: "",
    department: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showAlert, setShowAlert] = useState(true);
  // DB-managed (admin Reference Data) - active departments only
  const { options: departmentOptions } = useDepartments();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const findStaffRecord = async () => {
    setError("");
    setLookingUp(true);
    try {
      const response = await fetch(`${basePath}/api/register/staffdetails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, payrollNo: formData.payrollNo }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Couldn't find your staff record");
      }
      setStaff(data.staff);
    } catch (err) {
      setError(err.message);
    } finally {
      setLookingUp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!staff) {
      // Enter in the payroll field looks the record up first
      if (formData.payrollNo.trim()) findStaffRecord();
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${basePath}/api/register/completeregistration`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password: formData.password,
            payrollNo: staff.staffNumber,
            department: staff.department || formData.department,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Registration failed");

      const dashboardPath = isValidRole(data.role) ? "/dashboard" : "/login";

      window.location.href = `${basePath}${dashboardPath}`;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      {showAlert && (
        <Alert
          message="Your email has been verified successfully"
          type="success"
          onClose={() => setShowAlert(false)}
        />
      )}

      {/* Card */}
      <div className="my-10 rounded-2xl border border-gray-200/80 bg-gray-50 px-7 py-8 shadow-xl ring-1 ring-black/5 dark:border-gray-800 dark:bg-gray-950 dark:ring-white/5">
        <div className="w-full max-w-sm space-y-4">
          {/* Title Section */}
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Complete Registration
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isCompanyEmail && !staff
                ? "Enter your payroll number to find your staff record."
                : "Your details come from your HR staff record. Set a password to finish."}
            </p>
          </div>

          {/* Global Error Message */}
          {(error || staffError) && (
            <div className="rounded-lg bg-red-50 p-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error || staffError}
            </div>
          )}

          {/* Form Section */}
          {!staffError && (
            <form
              onSubmit={handleSubmit}
              className="space-y-2"
              autoComplete="off"
            >
              {/* Payroll Number */}
              <div className="space-y-2">
                <label htmlFor="payrollNo" className={labelClass}>
                  Payroll Number
                </label>
                {staff ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      id="payrollNo"
                      value={staff.staffNumber}
                      readOnly
                      className={lockedClass}
                    />
                    {isCompanyEmail && (
                      <button
                        type="button"
                        onClick={() => setStaff(null)}
                        className="shrink-0 text-sm text-gray-500 hover:underline dark:text-gray-400"
                      >
                        Change
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      name="payrollNo"
                      id="payrollNo"
                      value={formData.payrollNo}
                      onChange={handleChange}
                      required
                      maxLength={150}
                      placeholder="12345"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={findStaffRecord}
                      disabled={lookingUp || !formData.payrollNo.trim()}
                      className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 transition hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-white dark:hover:border-gray-600"
                    >
                      {lookingUp ? "Finding..." : "Find"}
                    </button>
                  </div>
                )}
              </div>

              {staff && (
                <>
                  {/* Full Name */}
                  <div className="space-y-2">
                    <label htmlFor="name" className={labelClass}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={staff.name}
                      readOnly
                      className={lockedClass}
                    />
                  </div>

                  {/* Department - locked when the staff record's matches one
                      of ours, otherwise picked from the active list */}
                  <div className="space-y-2">
                    <label htmlFor="department" className={labelClass}>
                      Department
                    </label>
                    {staff.department ? (
                      <input
                        type="text"
                        id="department"
                        value={staff.department}
                        readOnly
                        className={lockedClass}
                      />
                    ) : (
                      <Select
                        name="department"
                        id="department"
                        value={formData.department}
                        onChange={(value) =>
                          handleChange({ target: { name: "department", value } })
                        }
                        options={departmentOptions}
                        placeholder="Select a department"
                        className="w-full"
                        required
                      />
                    )}
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Something wrong here? Contact HR to correct your staff
                    record.
                  </p>

                  {/* Password */}
                  <div className="space-y-2">
                    <label htmlFor="password" className={labelClass}>
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        id="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        minLength="8"
                        placeholder="••••••••"
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className={labelClass}>
                      Confirm Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="confirmPassword"
                      id="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder="••••••••"
                      className={inputClass}
                    />
                    {formData.confirmPassword &&
                      formData.password !== formData.confirmPassword && (
                        // Standard Error Text Style
                        <p className="ml-0 text-xs text-red-600 dark:text-red-500">
                          Passwords do not match
                        </p>
                      )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      (formData.confirmPassword &&
                        formData.password !== formData.confirmPassword)
                    }
                    // Standard Button Style
                    className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-gray-800 hover:shadow-md focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:outline-none disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 dark:focus:ring-gray-600"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-gray-900 dark:border-t-transparent"></div>
                        Completing...
                      </span>
                    ) : (
                      "Complete"
                    )}
                  </button>
                </>
              )}
            </form>
          )}

          {/* Register Page */}
          <div className="flex items-center justify-center">
            <Link
              href="/register"
              className="text-center text-sm text-gray-500 hover:underline dark:text-gray-500"
            >
              back to register page
            </Link>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
}
