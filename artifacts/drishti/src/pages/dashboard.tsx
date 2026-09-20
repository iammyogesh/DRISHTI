import { Link } from "wouter";
import {
  ArrowRight,
  ClipboardList,
  AlertTriangle,
  Clock,
  Plus,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useGetDashboard } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { ErrorState, LoadingState, PageHeader, StatusChip } from "@/components/shell";

export default function Dashboard() {
  const { user } = useAuth();
  const query = useGetDashboard();

  const live = query.data as any;
  const cases = live?.cases || [];

  const todayCount = live?.today || cases.length || 0;
  const awaitingReviewCases = cases.filter((c: any) => c.reviewStatus === "AWAITING_REVIEW");
  const awaitingReviewCount = live?.awaitingReview || awaitingReviewCases.length || 0;
  const referableCases = cases.filter((c: any) => c.referable);
  const referableCount = live?.referable || referableCases.length || 0;

  const userRole = user?.role || "Ophthalmologist";
  const greetingPrefix = userRole === "Ophthalmologist" && !user?.fullName?.startsWith("Dr.") ? "Dr. " : "";
  const displayName = user?.fullName ? `${greetingPrefix}${user.fullName}` : "Clinician";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={user?.hospitalName || "Hospital Screening Workstation"}
        title={`Good morning, ${displayName}`}
        description="Clinical priority overview for today's diabetic retinopathy screening episodes and reviews."
        action={
          userRole === "Screening Technician" ? (
            <Link href="/screening/new" className="btn-primary" data-testid="link-new-screening">
              <Plus size={15} /> New Screening
            </Link>
          ) : (
            <Link href="/cases" className="btn-primary" data-testid="link-review-queue">
              <ClipboardList size={15} /> Open Review Queue ({awaitingReviewCount})
            </Link>
          )
        }
      />

      {query.isLoading && !query.data ? (
        <LoadingState label="Loading clinical summary…" />
      ) : (
        <>
          {query.isError && (
            <div className="mb-4">
              <ErrorState retry={() => query.refetch()} />
            </div>
          )}

          {/* High-Level Clinical KPI Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* KPI 1: Today's Screenings */}
            <div className="panel p-4 flex items-center justify-between">
              <div>
                <span className="eyebrow text-muted-foreground text-[10px]">Today's Screenings</span>
                <div className="text-2xl font-bold text-foreground mt-0.5">{todayCount}</div>
                <span className="text-[11px] text-muted-foreground">Screening episodes recorded</span>
              </div>
              <span className="grid size-9 place-items-center rounded-lg bg-teal-50 text-primary dark:bg-teal-950/40">
                <ClipboardList size={18} />
              </span>
            </div>

            {/* KPI 2: Awaiting Review */}
            <div className="panel p-4 flex items-center justify-between">
              <div>
                <span className="eyebrow text-muted-foreground text-[10px]">Awaiting Review</span>
                <div className="text-2xl font-bold text-foreground mt-0.5">{awaitingReviewCount}</div>
                <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Requiring clinician action</span>
              </div>
              <span className="grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40">
                <Clock size={18} />
              </span>
            </div>

            {/* KPI 3: Referable Cases */}
            <div className="panel p-4 flex items-center justify-between">
              <div>
                <span className="eyebrow text-muted-foreground text-[10px]">Referable Cases</span>
                <div className="text-2xl font-bold text-red-700 dark:text-red-400 mt-0.5">{referableCount}</div>
                <span className="text-[11px] text-muted-foreground">Grade 2+ (Moderate NPDR or higher)</span>
              </div>
              <span className="grid size-9 place-items-center rounded-lg bg-red-50 text-red-700 dark:bg-red-950/40">
                <AlertTriangle size={18} />
              </span>
            </div>
          </div>

          {/* Section 1: Cases Needing Review */}
          {awaitingReviewCases.length > 0 && (
            <div className="panel overflow-hidden border-amber-200/80 dark:border-amber-900/50">
              <div className="flex items-center justify-between p-4 border-b border-border/70 bg-amber-50/40 dark:bg-amber-950/20">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-amber-500" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Needs Review ({awaitingReviewCases.length})
                  </h2>
                </div>
                <span className="text-[11px] text-muted-foreground">Prioritized for clinical assessment</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Case / Patient</th>
                      <th className="px-3 py-2.5">Eye</th>
                      <th className="px-3 py-2.5">Image Quality</th>
                      <th className="px-3 py-2.5">AI Screening Result</th>
                      <th className="px-3 py-2.5">Recommendation</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {awaitingReviewCases.slice(0, 5).map((item: any) => (
                      <tr
                        key={item.caseId}
                        className="border-t border-border/60 hover:bg-muted/25 transition-colors"
                        data-testid={`row-needs-review-${item.caseId}`}
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/analysis/${item.caseId}`}
                            className="font-semibold text-primary hover:underline"
                          >
                            {item.caseId}
                          </Link>
                          <div className="text-[11px] text-muted-foreground">
                            {item.patientName || "Patient"} · {item.patientId || "PAT-000"}
                          </div>
                        </td>
                        <td className="px-3 py-3 font-medium text-foreground">
                          {item.eye} Eye ({item.age}y)
                        </td>
                        <td className="px-3 py-3">
                          <StatusChip
                            tone={
                              item.qualityStatus === "GOOD"
                                ? "good"
                                : item.qualityStatus === "BORDERLINE"
                                ? "warn"
                                : "danger"
                            }
                          >
                            {item.qualityStatus}
                          </StatusChip>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-foreground">
                            Grade {item.aiGrade}: {item.aiLabel}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {Math.round(item.confidence * 100)}% model confidence
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {item.referable ? (
                            <span className="text-[11px] font-semibold text-red-700 dark:text-red-400">
                              Refer for clinical review
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              Routine annual screening
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={userRole === "Ophthalmologist" ? `/review/${item.caseId}` : `/analysis/${item.caseId}`}
                            className="btn-primary !py-1 !px-2.5 text-[11px]"
                            data-testid={`btn-review-${item.caseId}`}
                          >
                            {userRole === "Ophthalmologist" ? "Review & Sign" : "View"} <ArrowRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 2: Recent Screenings */}
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border/70">
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Recent Screenings
              </h2>
              <Link href="/cases" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                View all cases <ArrowRight size={13} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Case</th>
                    <th className="px-4 py-2.5">Patient</th>
                    <th className="px-3 py-2.5">Eye</th>
                    <th className="px-3 py-2.5">AI Result</th>
                    <th className="px-3 py-2.5">Image Quality</th>
                    <th className="px-3 py-2.5">Review Status</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.slice(0, 8).map((item: any) => (
                    <tr
                      key={item.caseId}
                      className="border-t border-border/60 hover:bg-muted/20 transition-colors"
                      data-testid={`row-recent-${item.caseId}`}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/analysis/${item.caseId}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {item.caseId}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{item.patientName || "Patient"}</div>
                        <div className="text-[10px] text-muted-foreground">{item.patientId || "PAT-000"}</div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {item.eye} Eye
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-medium text-foreground">
                          Grade {item.aiGrade} · {Math.round(item.confidence * 100)}%
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <StatusChip
                          tone={
                            item.qualityStatus === "GOOD"
                              ? "good"
                              : item.qualityStatus === "BORDERLINE"
                              ? "warn"
                              : "danger"
                          }
                        >
                          {item.qualityStatus}
                        </StatusChip>
                      </td>
                      <td className="px-3 py-3">
                        <StatusChip tone={item.reviewStatus === "REVIEWED" ? "good" : "warn"}>
                          {item.reviewStatus === "REVIEWED" ? "Signed" : "Awaiting review"}
                        </StatusChip>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/analysis/${item.caseId}`}
                          className="btn-quiet !py-1 !px-2 text-[11px]"
                        >
                          Open Workstation
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}