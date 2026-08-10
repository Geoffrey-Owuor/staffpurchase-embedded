"use client";
import {
  Clock,
  XCircle,
  CheckCircle2,
  TrendingUp,
  MessageCircleX,
  CheckCheck,
  RotateCcw,
  ClockFading,
} from "lucide-react";
import ApprovalCardsSkeleton from "@/components/skeletons/ApprovalCardsSkeleton";
import { StatCard } from "../StatCard";
import CardHeadings from "../Headings/CardHeadings";
import { useUser } from "@/context/UserContext";
import { useQuery } from "@tanstack/react-query";
import {
  defaultCounts,
  fetchApprovalCounts,
} from "@/utils/FetchCardCounts/fetchApprovalCounts";
import SkeletonBox from "@/components/skeletons/SkeletonBox";

export default function ApprovalCards({ filters = {} }) {
  const { role: userRole } = useUser();

  const {
    data: counts = defaultCounts,
    isLoading: loading,
    refetch: refetchCounts,
  } = useQuery({
    queryKey: ["ApprovalCardCounts", filters],
    queryFn: () => fetchApprovalCounts(filters),
  });

  // Calculating the total pending purchases from returned counts data
  const totalPending =
    counts.total - counts.totalDeclined - counts.totalApproved;

  return (
    <div className="mb-8 rounded-xl px-2">
      {/* Render Heading Dynamically */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-5">
          {userRole === "staff" ? (
            <div className="mt-3 mb-2 px-1 pb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Approval status
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Summary of all approval requests sent to billing & invoicing
              </p>
            </div>
          ) : (
            <CardHeadings />
          )}
          <button
            className="hidden rounded-full bg-gray-100 p-2 transition-colors duration-200 hover:bg-gray-200 md:flex dark:bg-gray-900 dark:hover:bg-gray-800"
            onClick={() => refetchCounts()}
            title="refresh"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <>
            {userRole !== "staff" && (
              <div className="hidden items-center space-x-2 lg:flex">
                {[...Array(4)].map((_, i) => (
                  <SkeletonBox key={i} className="mr-2 h-11 w-20 md:flex" />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {userRole !== "staff" && (
              <div className="hidden items-center space-x-2 lg:flex">
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
                  <span className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                    {counts.total > 500 ? "500+" : counts.total}
                  </span>{" "}
                  <TrendingUp className="h-4.5 w-4.5 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
                  <span className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                    {counts.totalDeclined > 500 ? "500+" : counts.totalDeclined}
                  </span>{" "}
                  <MessageCircleX className="h-4.5 w-4.5 text-rose-500 dark:text-rose-400" />
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
                  <span className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                    {totalPending > 500 ? "500+" : totalPending}
                  </span>{" "}
                  <ClockFading className="h-4.5 w-4.5 text-amber-500 dark:text-amber-400" />
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
                  <span className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                    {counts.totalApproved > 500 ? "500+" : counts.totalApproved}
                  </span>{" "}
                  <CheckCheck className="h-4.5 w-4.5 text-emerald-500 dark:text-emerald-400" />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Cards Grid */}

      {loading ? (
        <ApprovalCardsSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Pending Card */}
          <StatCard
            title="Pending"
            count={counts.pending > 500 ? "500+" : counts.pending}
            description={
              userRole === "staff"
                ? "Awaiting invoicing approval"
                : "Awaiting your approval"
            }
            IconComponent={Clock}
          />
          {/* Declined Card */}
          <StatCard
            title="Declined"
            count={counts.declined > 500 ? "500+" : counts.declined}
            description={
              userRole === "staff"
                ? "Declined Requests"
                : "Requests you've declined"
            }
            IconComponent={XCircle}
          />

          {/* Approved Card */}
          <StatCard
            title="Approved"
            count={counts.approved > 500 ? "500+" : counts.approved}
            description={
              userRole === "staff"
                ? "Approved by invoicing"
                : "Requests you've approved"
            }
            IconComponent={CheckCircle2}
          />
        </div>
      )}
    </div>
  );
}
