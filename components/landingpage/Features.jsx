// app/components/Features.js
import {
  Workflow,
  BellRing,
  FileSpreadsheet,
  ShieldCheck,
  BarChart3,
} from "lucide-react";

const features = [
  {
    id: 1,
    icon: Workflow,
    title: "Sequential Approval Workflow",
    description:
      "Every request moves automatically through Payroll → HR → Credit Control → Invoicing, so it's always sitting in the right inbox - never lost in an email thread.",
    span: "md:col-span-2",
    featured: true,
  },
  {
    id: 2,
    icon: BellRing,
    title: "Real-Time Notifications",
    description:
      "Get emailed the moment your request is submitted, approved, or declined - no need to chase anyone for an update.",
  },
  {
    id: 3,
    icon: FileSpreadsheet,
    title: "Searchable History",
    description: "Filter and paginate your full request history",
  },
  {
    id: 4,
    icon: BarChart3,
    title: "Filter-Aware Summary Cards",
    description:
      "Pending, approved, and declined counts recalculate live to match whatever filters you have applied.",
  },
  {
    id: 5,
    icon: ShieldCheck,
    title: "Secure, SSO-Ready Access",
    description:
      "Sign in directly or through a trusted single sign-on handoff — the portal works standalone or embedded.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20">
      <div className="px-6">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <span className="mb-3 inline-block text-sm font-semibold tracking-wide text-red-600 uppercase dark:text-red-500">
            Features
          </span>
          <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl dark:text-gray-100">
            Everything your request needs, built in
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">
            A single, self-service portal that replaces paper forms and email
            chains with a clear, trackable approval process.
          </p>
        </div>

        {/* Bento Features Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className={`group relative overflow-hidden rounded-3xl border border-gray-100 bg-slate-50 p-8 transition hover:-translate-y-1 hover:border-red-100 hover:shadow-lg dark:border-gray-800/60 dark:bg-gray-900/50 dark:hover:border-red-900/40 dark:hover:shadow-red-950/20 ${feature.span ?? ""}`}
              >
                {feature.featured && (
                  <div className="pointer-events-none absolute top-0 right-0 h-40 w-40 rounded-full bg-red-100 opacity-60 blur-3xl transition group-hover:opacity-90 dark:bg-red-900/30" />
                )}
                <div className="relative mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 p-3 transition group-hover:scale-105 dark:bg-red-900/40">
                  <Icon className="h-6 w-6 text-red-600 dark:text-red-500" />
                </div>
                <h3 className="relative mb-3 text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {feature.title}
                </h3>
                <p className="relative text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
