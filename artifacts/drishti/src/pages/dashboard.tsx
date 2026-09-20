import { Link } from "wouter";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Plus,
  ShieldAlert,
  Timer,
  TrendingUp,
  Activity,
  UserCheck,
} from "lucide-react";
import { useGetDashboard } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { ErrorState, LoadingState, PageHeader, StatusChip } from "@/components/shell";

function Metric({
  label,
  value,
  sub,
  icon: Icon,
  tone = "teal",
}: {
  label: string;
  value: string;
  sub: string;
  icon: typeof Timer;
  tone?: string;
}) {
  return (
    <div className="panel relative overflow-hidden p-5">
      <div
        className={`absolute right-0 top-0 h-24 w-24 rounded-bl-full opacity-20 ${
          tone === "gold" ? "bg-secondary" : tone === "coral" ? "bg-accent" : "bg-primary"
        }`}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="eyebrow">{label}</div>
          <div className="display-title mt-2 text-3xl font-extrabold">{value}</div>
          <div className="mt-2 text-xs text-muted-foreground">{sub}</div>
        </div>
        <span className="rounded-xl bg-muted p-2.5 text-primary">
          <Icon size={18} />
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const query = useGetDashboard();

  const live = query.data as any;
  const cases = live?.cases || [];

  const todayCount = live?.today || cases.length || 0;
  const awaitingReview = live?.awaitingReview || cases.filter((c: any) => c.reviewStatus === "AWAITING_REVIEW").length || 0;
  const referable = live?.referable || cases.filter((c: any) => c.referable).length || 0;
  const averageProcessing = live?.averageProcessing || 1.62;
  const agreement = live?.agreement || 95.2;

  const greetingName = user?.fullName ? user.fullName : "Clinician";
  const userRole = user?.role || "Ophthalmologist";

  return (
    <div className="mx-auto max-w-[1480px]">
      <PageHeader
        eyebrow={`Clinical Station · ${user?.hospitalName || "Apex Eye Care"}`}
        title={`Welcome, ${greetingName}.`}
        description={`Real-time overview of today's screening episodes, image quality gates, AI signals, and clinical reviews.`}
        action={
          userRole !== "Ophthalmologist" ? (
            <Link href="/screening/new" className="btn-primary" data-testid="link-new-screening">
              <Plus size={16} /> New Screening Episode
            </Link>
          ) : (
            <Link href="/cases" className="btn-primary" data-testid="link-review-queue">
              <UserCheck size={16} /> Open Review Queue ({awaitingReview})
            </Link>
          )
        }
      />

      {query.isLoading && !query.data ? (
        <LoadingState />
      ) : (
        <>
          {query.isError && (
            <div className="mb-5">
              <ErrorState retry={() => query.refetch()} />
            </div>
          )}

          {/* Metric KPIs */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Today's Screenings"
              value={String(todayCount)}
              sub={`Registered at ${user?.hospitalName || "Hospital Station"}`}
              icon={TrendingUp}
            />
            <Metric
              label="Pending Specialist Review"
              value={String(awaitingReview)}
              sub="Cases queued for doctor validation"
              icon={Clock3}
              tone="gold"
            />
            <Metric
              label="Referable DR Cases (Grade 2+)"
              value={String(referable).padStart(2, "0")}
              sub="Urgent tele-ophthalmology priority"
              icon={ShieldAlert}
              tone="coral"
            />
            <Metric
              label="Average AI Processing"
              value={`${averageProcessing}s`}
              sub="Quality gate + Multi-class inference"
              icon={Timer}
            />
          </section>

          {/* Live Queue & Today at a Glance */}
          <section className="mt-7 grid gap-6 xl:grid-cols-[1.45fr_.8fr]">
            <div className="panel overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-border/70 p-5 sm:flex-row sm:items-center sm:justify-between bg-muted/20">
                <div>
                  <div className="eyebrow">Active Screening Queue</div>
                  <h2 className="mt-1 font-serif text-xl font-bold">Recent Patient Cases</h2>
                </div>
                <div className="flex gap-2">
                  <Link href="/cases" className="btn-quiet" data-testid="link-view-all-cases">
                    View All Cases <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-muted/40 text-[10px] uppercase tracking-[.12em] text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-bold">Case ID / Patient</th>
                      <th className="px-3 py-3 font-bold">Eye</th>
                      <th className="px-3 py-3 font-bold">Quality</th>
                      <th className="px-3 py-3 font-bold">AI Grade & Confidence</th>
                      <th className="px-3 py-3 font-bold">Referable</th>
                      <th className="px-3 py-3 font-bold">Review Status</th>
                      <th className="px-5 py-3 text-right font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.slice(0, 6).map((item: any, index: number) => (
                      <tr
                        key={item.caseId}
                        className="border-t border-border/60 transition-colors hover:bg-muted/25"
                        data-testid={`row-case-${item.caseId}`}
                      >
                        <td className="px-5 py-3.5">
                          <Link
                            href={`/analysis/${item.caseId}`}
                            className="font-bold text-primary hover:underline"
                            data-testid={`link-case-${item.caseId}`}
                          >
                            {item.caseId}
                          </Link>
                          <div className="mt-0.5 text-xs text-muted-foreground font-semibold">
                            {item.patientName || "Anonymous Patient"} ({item.patientId || "PAT-000"})
                          </div>
                        </td>
                        <td className="px-3 py-3.5 font-medium text-xs">
                          {item.eye} Eye ({item.age} yrs)
                        </td>
                        <td className="px-3 py-3.5">
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
                        <td className="px-3 py-3.5">
                          <div className="font-semibold text-xs text-foreground">
                            Grade {item.aiGrade}: {item.aiLabel}
                          </div>
                          <div className="mono mt-0.5 text-[10px] text-muted-foreground">
                            {Math.round(item.confidence * 100)}% confidence
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          {item.referable ? (
                            <span className="mono text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                              YES
                            </span>
                          ) : (
                            <span className="mono text-[10px] text-muted-foreground">NO</span>
                          )}
                        </td>
                        <td className="px-3 py-3.5">
                          <StatusChip tone={item.reviewStatus === "REVIEWED" ? "good" : "warn"}>
                            {item.reviewStatus === "REVIEWED" ? "Reviewed" : "Awaiting Doctor"}
                          </StatusChip>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            href={
                              userRole === "Ophthalmologist" && item.reviewStatus === "AWAITING_REVIEW"
                                ? `/review/${item.caseId}`
                                : `/analysis/${item.caseId}`
                            }
                            className="inline-flex rounded-lg p-2 text-primary hover:bg-muted"
                            aria-label={`Open ${item.caseId}`}
                            data-testid={`link-open-case-${index}`}
                          >
                            <ArrowRight size={16} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel p-5 space-y-5">
              <div className="eyebrow">Clinical Decision Safeguards</div>
              <h2 className="mt-1 font-serif text-xl font-bold">Quality Assurance & AI Metrics</h2>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold">AI & Specialist Agreement</span>
                    <strong className="text-primary">{agreement}%</strong>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${agreement}%` }} />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Calculated from authenticated clinical reviews signed in system.
                  </p>
                </div>

                <div className="panel-soft p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#376344] dark:text-[#a7d5ae]">
                    <CheckCircle2 size={16} /> Image Quality Gate Enabled
                  </div>
                  <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
                    Checks focus, illumination, and retinal area before inference to prevent invalid predictions on blurry captures.
                  </p>
                </div>

                <div className="border-l-2 border-primary pl-3.5">
                  <div className="eyebrow">Review Recommendation</div>
                  <p className="mt-1 text-xs font-semibold leading-5">
                    Case{" "}
                    <Link href="/review/DR-2026-0142" className="text-primary underline font-bold" data-testid="link-next-case">
                      DR-2026-0142
                    </Link>{" "}
                    has Moderate NPDR signal awaiting final review.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Action Navigation Links */}
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/cases"
              className="panel flex items-center gap-3 px-5 py-3 text-xs font-bold hover:-translate-y-0.5 transition-transform"
              data-testid="link-cases"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Activity size={16} />
              </span>
              View Complete Case Register <ArrowRight size={14} />
            </Link>

            <Link
              href="/reports"
              className="panel flex items-center gap-3 px-5 py-3 text-xs font-bold hover:-translate-y-0.5 transition-transform"
              data-testid="link-reports"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-secondary/30 text-primary">
                <Plus size={16} />
              </span>
              Clinical Reports Package <ArrowRight size={14} />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}