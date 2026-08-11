import {
  LogIn,
  ShoppingCart,
  Bell,
  GitPullRequest,
  LifeBuoy,
  CheckCircle2,
  CreditCard,
  Banknote,
  AlertCircle,
  UserRoundPlus,
  BookOpenText,
  Info,
} from "lucide-react";
import PagesFooter from "../Reusables/PagesFooter/PagesFooter";
import Header from "../landingpage/Header";

// --- STATIC DATA ---
const manualSteps = [
  {
    id: 1,
    title: "How to Access the Portal",
    icon: LogIn,
    content: [
      "Click the login link to access the portal.",
      "Use your company email when registering (recommended).",
      "If you don't have a company email, you may use your personal email.",
    ],
  },
  {
    id: 2,
    title: "New User Registration",
    icon: UserRoundPlus,
    content: [
      "Fill in the required details on the registration page.",
      "Check your email for a verification code.",
      "Enter the code to complete your registration.",
    ],
  },
  {
    id: 3,
    title: "Submitting a Purchase Request",
    icon: ShoppingCart,
    content: [
      "Log in to the portal and click “New Purchase” on the left sidebar.",
      "Enter the required information.",
      "Add the products you wish to purchase.",
      "Important: If buying items on special/offer pricing, indicate this in the “Other Details” field.",
      "Review and submit your request.",
    ],
  },
  {
    id: 4,
    title: "Email Notifications",
    icon: Bell,
    content: [
      "You will receive email updates when your request is successfully submitted.",
      "You will be notified as your request passes through approval stages (Payroll → HR → Credit Control → Invoicing).",
    ],
  },
  {
    id: 5,
    title: "Approval Workflows",
    icon: GitPullRequest,
    description: "Different purchase types follow specific approval routes:",
    // This section has nested types, so we structure it differently
    subTypes: [
      {
        subtitle: "Cash Purchases",
        subIcon: Banknote,
        details: [
          "Approvals: 3 Stages (HR → Credit Control → Invoicing).",
          "Action Required: You must enter the M-PESA payment code.",
        ],
      },
      {
        subtitle: "Credit/(Cash + Credit) Purchases",
        subIcon: CreditCard,
        details: [
          "Approvals: 4 Stages (Payroll → HR → Credit Control → Invoicing).",
          "Action Required: You must select a credit period (1 - 4 months).",
        ],
      },
      {
        subtitle: "Partial Payment (Cash + Credit)",
        subIcon: AlertCircle,
        details: [
          "Action Required: Select the credit period AND enter the M-PESA payment code.",
        ],
      },
    ],
  },
  {
    id: 6,
    title: "Need Assistance?",
    icon: LifeBuoy,
    content: [
      "If you encounter issues or have questions, please contact IT for support.",
    ],
  },
];

const UserManual = () => {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <Header />

      {/* Masthead */}
      <section className="bg-conditions px-4 pt-28 pb-16 md:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold tracking-wide text-red-700 uppercase dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
            <BookOpenText className="h-3.5 w-3.5" />
            User Guide & Documentation
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl dark:text-white">
            Staff Purchase Portal
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
            Everything you need to register, submit a request, and follow it
            through approval - in one place.
          </p>
        </div>
      </section>

      <section className="w-full flex-1 bg-white px-4 py-20 md:px-8 dark:bg-gray-950">
        <div className="mx-auto max-w-4xl">
          {/* Vertical Timeline */}
          <div className="relative ml-3 border-l border-gray-200 md:ml-6 dark:border-gray-800">
            {manualSteps.map((step) => (
              <div key={step.id} className="group relative mb-12 ml-8 md:ml-12">
                {/* Timeline Dot / Icon */}
                <span className="absolute -left-[52px] flex h-10 w-10 items-center justify-center rounded-full bg-red-50 ring-8 ring-white transition-transform group-hover:scale-110 md:-left-[68px] dark:bg-red-950 dark:ring-gray-950">
                  <step.icon className="h-5 w-5 text-red-600 dark:text-red-300" />
                </span>

                {/* Content Card */}
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-red-100 hover:shadow-md dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-red-900/40">
                  <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                    {step.id}. {step.title}
                  </h3>

                  {/* Render Standard List Content */}
                  {step.content && (
                    <ul className="space-y-3">
                      {step.content.map((point, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 text-gray-600 dark:text-gray-300"
                        >
                          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-gray-500" />
                          <span className="text-base leading-relaxed">
                            {point}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Render Complex Sub-types (For Section 5) */}
                  {step.subTypes && (
                    <div className="mt-2 grid gap-4 md:grid-cols-1">
                      {step.description && (
                        <p className="mb-2 text-gray-600 dark:text-gray-400">
                          {step.description}
                        </p>
                      )}
                      {step.subTypes.map((sub, subIdx) => (
                        <div
                          key={subIdx}
                          className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                        >
                          <div className="mb-2 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                            <sub.subIcon className="h-4 w-4 text-blue-500" />
                            {sub.subtitle}
                          </div>
                          <ul className="ml-6 list-disc space-y-1 text-sm text-gray-600 marker:text-gray-400 dark:text-gray-300">
                            {sub.details.map((detail, dIdx) => (
                              <li key={dIdx}>{detail}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Note */}
          <div className="mt-12 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-6 dark:border-blue-900/40 dark:bg-blue-900/20">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-300" />
            <p className="text-left text-sm font-medium text-blue-800 dark:text-blue-200">
              This manual serves as a guide for the Staff Purchase Portal.
              Workflows are subject to system updates.
            </p>
          </div>
        </div>
      </section>
      {/* Footer */}
      <PagesFooter />
    </div>
  );
};

export default UserManual;
