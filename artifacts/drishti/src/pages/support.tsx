import { useState, useEffect, type FormEvent } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Users,
  CheckCircle2,
  Search,
  Filter,
  User,
  Printer,
  History,
  Layers,
  Activity,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import {
  useGetCase,
  useGetOperationsSummary,
  useListAuditLogs,
} from "@workspace/api-client-react";
import {
  demoAnalysis,
  demoAnalysisByGrade,
  demoCases,
  formatDate,
} from "@/lib/demo-data";
import { ErrorState, LoadingState, PageHeader, StatusChip } from "@/components/shell";
import { useAuth } from "@/lib/auth";

// ============================================================================
// 1. PATIENT CASE DETAIL
// ============================================================================
export function CaseDetail() {
  const { id = demoCases[0].caseId } = useParams<{ id: string }>();
  const query = useGetCase(id);
  const item =
    (query.data as (typeof demoCases)[number] | undefined) ??
    demoCases.find((entry) => entry.caseId === id) ??
    demoCases[0];

  const [showHistory, setShowHistory] = useState(true);

  return (
    <div className="space-y-6">
      {query.isLoading && !query.data ? (
        <LoadingState label="Loading patient case…" />
      ) : (
        <>
          <PageHeader
            eyebrow={`Patient Case Record · ${item.caseId}`}
            title={`Patient Case: ${item.patientName || "Patient"}`}
            description={`Patient ID: ${item.patientId || "PAT-88402"} · ${item.eye} Eye · Registered ${formatDate(item.createdAt)}`}
            action={
              <div className="flex flex-wrap gap-2.5">
                <Link
                  href={`/analysis/${item.caseId}`}
                  className="btn-primary"
                  data-testid="link-detail-analysis"
                >
                  <Eye size={14} /> Retinal Analysis
                </Link>
                <Link
                  href={`/review/${item.caseId}`}
                  className="btn-quiet"
                  data-testid="link-detail-review"
                >
                  <ShieldCheck size={14} /> Clinical Review
                </Link>
                <Link href="/cases" className="btn-quiet" data-testid="link-detail-back">
                  All Cases
                </Link>
              </div>
            }
          />

          {query.isError && (
            <div className="mb-4">
              <ErrorState retry={() => query.refetch()} />
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-[.9fr_1.1fr]">
            {/* Left: Case Summary */}
            <div className="space-y-5">
              <div className="panel p-5 space-y-4">
                <span className="eyebrow text-[10px]">Patient & Episode Summary</span>
                <div className="space-y-1">
                  <div className="data-row">
                    <span className="text-xs text-muted-foreground">Patient Name</span>
                    <strong className="text-xs font-semibold text-foreground">{item.patientName || "Ramachandran K."}</strong>
                  </div>
                  <div className="data-row">
                    <span className="text-xs text-muted-foreground">Patient ID</span>
                    <span className="mono text-xs font-semibold text-foreground">{item.patientId || "PAT-88402"}</span>
                  </div>
                  <div className="data-row">
                    <span className="text-xs text-muted-foreground">Age & History</span>
                    <strong className="text-xs font-semibold text-foreground">{item.age} yrs · {item.diabetesType || "Type 2"}</strong>
                  </div>
                  <div className="data-row">
                    <span className="text-xs text-muted-foreground">Examined Eye</span>
                    <strong className="text-xs font-semibold text-foreground">{item.eye} Eye</strong>
                  </div>
                  <div className="data-row">
                    <span className="text-xs text-muted-foreground">Image Quality</span>
                    <StatusChip tone={item.qualityStatus === "GOOD" ? "good" : "warn"}>
                      {item.qualityStatus}
                    </StatusChip>
                  </div>
                  <div className="data-row">
                    <span className="text-xs text-muted-foreground">AI Screening Result</span>
                    <strong className="text-xs font-semibold text-foreground">
                      Grade {item.aiGrade}: {item.aiLabel} ({Math.round(item.confidence * 100)}%)
                    </strong>
                  </div>
                  <div className="data-row">
                    <span className="text-xs text-muted-foreground">Referral Triage</span>
                    <StatusChip tone={item.referable ? "danger" : "good"}>
                      {item.referable ? "Refer for review" : "Non-referable"}
                    </StatusChip>
                  </div>
                  <div className="data-row">
                    <span className="text-xs text-muted-foreground">Clinician Review</span>
                    <StatusChip tone={item.reviewStatus === "REVIEWED" ? "good" : "warn"}>
                      {item.reviewStatus === "REVIEWED" ? "Signed & Validated" : "Awaiting review"}
                    </StatusChip>
                  </div>
                </div>
              </div>

              {/* Timeline Lifecycle */}
              <div className="panel p-5 space-y-4">
                <span className="eyebrow text-[10px]">Screening Lifecycle</span>
                <div className="space-y-3.5 pt-1">
                  {[
                    "Patient intake registered at screening station",
                    "Fundus photograph acquired & quality gate passed",
                    "AI screening result & visual evidence generated",
                    item.reviewStatus === "REVIEWED"
                      ? "Ophthalmologist clinical assessment signed & finalized"
                      : "Awaiting ophthalmologist clinical sign-off",
                  ].map((event, index) => (
                    <div className="flex gap-2.5" key={event}>
                      <div
                        className={`grid size-5 shrink-0 place-items-center rounded-full text-xs ${
                          index < 3 || item.reviewStatus === "REVIEWED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Check size={11} />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground">{event}</div>
                        <div className="text-[10px] text-muted-foreground">Recorded in clinical audit log</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: AI Output vs Clinician Final Assessment */}
            <div className="panel p-5 sm:p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <span className="eyebrow text-[10px]">Clinical Assessment Details</span>
                  <h2 className="text-sm font-bold text-foreground mt-0.5">Diagnostic Evaluation</h2>
                </div>
                <button
                  type="button"
                  className="btn-quiet !p-1.5"
                  onClick={() => setShowHistory((v) => !v)}
                  aria-label="Toggle timeline history"
                >
                  <ChevronDown size={15} className={showHistory ? "rotate-180" : ""} />
                </button>
              </div>

              {showHistory && (
                <div className="space-y-5">
                  {/* AI Screening Output */}
                  <div className="p-4 rounded-lg border border-border bg-muted/15 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="eyebrow text-[10px]">AI Screening Output</span>
                      <span className="mono text-[11px] text-primary font-semibold">
                        {Math.round(item.confidence * 100)}% Confidence
                      </span>
                    </div>
                    <div className="text-sm font-bold text-foreground">
                      Grade {item.aiGrade}: {item.aiLabel}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Automated multi-class classification and focal lesion candidate analysis.
                    </p>
                  </div>

                  {/* Final Clinician Assessment */}
                  <div className="p-4 rounded-lg border border-teal-200/80 bg-teal-50/40 dark:bg-teal-950/20 dark:border-teal-900/40 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="eyebrow text-[10px] text-primary">Final Clinician Assessment</span>
                      <StatusChip tone={item.reviewStatus === "REVIEWED" ? "good" : "warn"}>
                        {item.reviewStatus === "REVIEWED" ? "Signed" : "Pending"}
                      </StatusChip>
                    </div>

                    <div className="text-sm font-bold text-foreground">
                      {item.finalGrade !== undefined && item.finalGrade !== null
                        ? `Grade ${item.finalGrade}: Confirmed by Ophthalmologist`
                        : "Pending Ophthalmologist Sign-Off"}
                    </div>

                    {item.reviewerNotes ? (
                      <div className="text-xs text-foreground/90 leading-relaxed bg-card p-3 rounded border border-border/60">
                        <strong className="block text-foreground text-[11px] mb-1">
                          Findings & Recommendations ({item.reviewerName || "Clinician"}):
                        </strong>
                        {item.reviewerNotes}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        No clinician review notes entered yet.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// 2. SYSTEM ARCHITECTURE & QUEUE CAPACITY (Admin / Engineering)
// ============================================================================
export function Operations() {
  const summaryQuery = useGetOperationsSummary();
  const [annualTarget, setAnnualTarget] = useState(100000);
  const [phcCount, setPhcCount] = useState(48);
  const [reviewerCount, setReviewerCount] = useState(6);
  const [reviewTimeMins, setReviewTimeMins] = useState(3.5);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  const runSimulinkSim = async () => {
    setSimulationRunning(true);
    try {
      const res = await fetch("/api/simulink/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          annualTarget,
          phcCount,
          reviewerCount,
          reviewTimeMins,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSimResult(data);
      }
    } catch {
      // Fallback
    } finally {
      setTimeout(() => setSimulationRunning(false), 400);
    }
  };

  useEffect(() => {
    runSimulinkSim();
  }, [annualTarget, phcCount, reviewerCount, reviewTimeMins]);

  const calculatedDailyScreenings = Math.round(annualTarget / 300);
  const dailyPhcAverage = Math.round(calculatedDailyScreenings / phcCount);
  const referralLoadPercent = 18.5;
  const dailyReferrals = Math.round(calculatedDailyScreenings * (referralLoadPercent / 100));
  const doctorCapacityPerDay = Math.round((reviewerCount * 6 * 60) / reviewTimeMins);
  const queueLatencyHours = Number((dailyReferrals / (doctorCapacityPerDay || 1)).toFixed(1));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System Diagnostics & Queue Modeling"
        title="System Architecture"
        description="District tele-ophthalmology pipeline architecture, discrete-event queue capacity simulation (M/M/c), and technical diagnostics."
        action={
          <button
            type="button"
            onClick={runSimulinkSim}
            disabled={simulationRunning}
            className="btn-primary"
          >
            <Activity size={14} className={simulationRunning ? "animate-spin" : ""} />
            {simulationRunning ? "Simulating…" : "Run Simulation"}
          </button>
        }
      />

      {/* Pipeline Architecture Blocks */}
      <div className="panel p-5 space-y-4">
        <span className="eyebrow text-[10px]">Processing Pipeline Architecture</span>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-lg border border-border bg-card space-y-1">
            <span className="mono text-[10px] text-primary font-bold">Stage 1</span>
            <div className="font-bold text-foreground">Fundus Acquisition</div>
            <p className="text-[11px] text-muted-foreground">45° non-mydriatic fundus photograph intake.</p>
          </div>
          <div className="p-3.5 rounded-lg border border-border bg-card space-y-1">
            <span className="mono text-[10px] text-primary font-bold">Stage 2</span>
            <div className="font-bold text-foreground">Quality Assessment</div>
            <p className="text-[11px] text-muted-foreground">Laplacian variance sharpness and illumination validation.</p>
          </div>
          <div className="p-3.5 rounded-lg border border-border bg-card space-y-1">
            <span className="mono text-[10px] text-primary font-bold">Stage 3</span>
            <div className="font-bold text-foreground">AI Screening & Heatmap</div>
            <p className="text-[11px] text-muted-foreground">Multi-class inference & Grad-CAM visual evidence generation.</p>
          </div>
          <div className="p-3.5 rounded-lg border border-border bg-card space-y-1">
            <span className="mono text-[10px] text-primary font-bold">Stage 4</span>
            <div className="font-bold text-foreground">Clinician Review</div>
            <p className="text-[11px] text-muted-foreground">Specialist validation, sign-off, and audit event persistence.</p>
          </div>
        </div>
      </div>

      {/* Discrete-Event Queue Simulator */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="panel p-5 space-y-4">
          <span className="eyebrow text-[10px]">Simulation Parameters</span>
          <div className="space-y-3.5 text-xs">
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Annual Screening Target:</span>
                <span className="mono font-bold">{annualTarget.toLocaleString()} patients/yr</span>
              </div>
              <input
                type="range"
                min="10000"
                max="250000"
                step="5000"
                value={annualTarget}
                onChange={(e) => setAnnualTarget(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Primary Health Centers:</span>
                <span className="mono font-bold">{phcCount} Centers</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={phcCount}
                onChange={(e) => setPhcCount(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Reviewing Ophthalmologists:</span>
                <span className="mono font-bold">{reviewerCount} Specialists</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={reviewerCount}
                onChange={(e) => setReviewerCount(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>
        </div>

        <div className="panel p-5 space-y-3">
          <span className="eyebrow text-[10px]">Queue Equilibrium Estimates</span>
          <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <span className="text-[10px] text-muted-foreground block">Daily Intake Target</span>
              <div className="text-xl font-bold text-foreground mt-0.5">{calculatedDailyScreenings}</div>
              <span className="text-[10px] text-muted-foreground">~{dailyPhcAverage} patients/center/day</span>
            </div>

            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <span className="text-[10px] text-muted-foreground block">Referable Queue Triage</span>
              <div className="text-xl font-bold text-red-700 dark:text-red-400 mt-0.5">{dailyReferrals}</div>
              <span className="text-[10px] text-muted-foreground">~{referralLoadPercent}% Grade 2+</span>
            </div>

            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <span className="text-[10px] text-muted-foreground block">Doctor Capacity</span>
              <div className="text-xl font-bold text-foreground mt-0.5">{doctorCapacityPerDay}</div>
              <span className="text-[10px] text-muted-foreground">{reviewerCount} MDs @ {reviewTimeMins}m</span>
            </div>

            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <span className="text-[10px] text-muted-foreground block">Queue Latency</span>
              <div className="text-xl font-bold text-foreground mt-0.5">{queueLatencyHours} hrs</div>
              <span className="text-[10px] text-muted-foreground">Average wait to sign-off</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. CLINICAL REPORTS
// ============================================================================
export function Reports() {
  const { user } = useAuth();
  const [selectedCaseId, setSelectedCaseId] = useState(demoCases[0].caseId);
  const selectedCase = demoCases.find((c) => c.caseId === selectedCaseId) || demoCases[0];
  const analysis = demoAnalysisByGrade[selectedCase.aiGrade] || demoAnalysis;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Documentation & Consultation"
        title="Clinical Reports"
        description="Standardized ophthalmic screening reports with patient demographics, AI findings, visual evidence, and ophthalmologist assessment."
        action={
          <button type="button" className="btn-primary print:hidden" onClick={handlePrint}>
            <Printer size={14} /> Print / Export PDF
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Case Selector Sidebar */}
        <div className="panel p-3.5 space-y-2.5 print:hidden">
          <span className="eyebrow text-[10px]">Select Screening Case</span>
          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
            {demoCases.map((c) => (
              <button
                key={c.caseId}
                type="button"
                onClick={() => setSelectedCaseId(c.caseId)}
                className={`w-full text-left p-2.5 rounded-md border text-xs transition-all ${
                  selectedCaseId === c.caseId
                    ? "border-primary bg-primary/10 font-bold"
                    : "border-border/60 hover:bg-muted/30"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-foreground">{c.caseId}</span>
                  <StatusChip tone={c.referable ? "danger" : "good"}>
                    Grade {c.aiGrade}
                  </StatusChip>
                </div>
                <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {c.patientName || "Patient"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Printable Hospital Report Document */}
        <div className="panel p-6 sm:p-10 bg-white text-slate-900 dark:bg-card dark:text-foreground border border-border shadow-sm print:border-none print:shadow-none print:p-0 space-y-6">
          {/* Header */}
          <div className="border-b-2 border-primary pb-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">
                  <Eye size={22} />
                </span>
                <div>
                  <h1 className="font-bold text-lg text-primary uppercase tracking-tight">
                    {user?.hospitalName || "Apex Eye Hospital & Postgraduate Institute"}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {user?.department || "Department of Vitreoretinal Services · Diabetic Retinopathy Screening"}
                  </p>
                </div>
              </div>

              <div className="text-right text-xs">
                <span className="mono font-bold bg-muted px-2.5 py-1 rounded">
                  {selectedCase.caseId}
                </span>
                <div className="text-[11px] text-muted-foreground mt-1 font-medium">
                  Date: {formatDate(selectedCase.createdAt)}
                </div>
              </div>
            </div>
          </div>

          {/* Patient Details */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
            <span className="eyebrow text-[10px]">Patient Information</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground block">Patient Full Name</span>
                <strong className="text-foreground">{selectedCase.patientName || "Ramachandran K."}</strong>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Patient ID / Age / Sex</span>
                <strong className="text-foreground">
                  {selectedCase.patientId || "PAT-88402"} / {selectedCase.age}y / {selectedCase.gender || "Female"}
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Examined Eye</span>
                <strong className="text-primary">{selectedCase.eye} Eye</strong>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Image Quality</span>
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                  {selectedCase.qualityStatus} ({analysis.quality?.score ?? 92}/100)
                </span>
              </div>
            </div>
          </div>

          {/* AI Screening Result & Visual Evidence */}
          <div className="rounded-lg border border-border p-4 space-y-4">
            <span className="eyebrow text-[10px]">AI Screening Result & Evidence</span>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <div className="font-bold text-base text-foreground">
                  Grade {selectedCase.aiGrade}: {selectedCase.aiLabel}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Model confidence: <strong>{Math.round(selectedCase.confidence * 100)}%</strong>
                </div>
              </div>
              <StatusChip tone={selectedCase.referable ? "danger" : "good"}>
                {selectedCase.referable ? "Referable DR (Grade 2+)" : "Non-Referable"}
              </StatusChip>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-foreground block">Visual Evidence:</span>
              <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                {analysis.evidence.map((ev, i) => (
                  <li key={i}>{ev}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Clinician Assessment & Sign-Off Block */}
          <div className="rounded-lg border border-border p-4 space-y-4 bg-muted/10">
            <span className="eyebrow text-[10px]">Clinician Assessment & Recommendation</span>
            <div className="text-xs text-foreground leading-relaxed">
              <strong>Clinical Assessment: </strong>
              {selectedCase.reviewerNotes ||
                (selectedCase.referable
                  ? "Findings consistent with referable diabetic retinopathy. Recommend 3–6 month ophthalmic follow-up and glycemic regulation."
                  : "Retinal vasculature within normal limits. Routine annual diabetic screening recommended.")}
            </div>

            <div className="flex flex-col sm:flex-row items-end justify-between border-t border-border/60 pt-4 gap-4">
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div>Recall: <strong>{selectedCase.referable ? "3–6 Months" : "12 Months"}</strong></div>
                <div className="text-[10px]">Report ID: {selectedCase.caseId}-CLIN-V1</div>
              </div>

              <div className="border border-border/80 rounded-md p-3 w-56 text-right bg-card text-xs">
                <div className="font-semibold text-foreground">
                  {selectedCase.reviewerName || user?.fullName || "Dr. Anish Sharma"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {user?.title || "Consultant Ophthalmologist"}
                </div>
                <div className="mono text-[10px] text-muted-foreground">
                  Reg No: {user?.registrationId || "MCI-2022-84920"}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-[10px] text-muted-foreground text-center border-t border-border/50 pt-3">
            DRISHTI Ophthalmology Workstation · Clinical Decision Support System
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. USER MANAGEMENT (Admin)
// ============================================================================
export function UsersPage() {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    setLoading(true);
    fetch("/api/auth/users")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setUsersList(data);
      })
      .catch((err) => console.error("Error fetching users:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (user?.role !== "Administrator") {
    return (
      <div className="panel p-8 text-center max-w-md mx-auto mt-12 space-y-3">
        <ShieldAlert className="mx-auto text-destructive" size={28} />
        <h2 className="text-base font-bold text-foreground">Administrator Access Required</h2>
        <p className="text-xs text-muted-foreground">
          User management and access control features are restricted to authorized administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Personnel & Access Control"
        title="User Management"
        description="Manage clinical staff, screening technicians, administrators, and role permissions."
      />

      <div className="panel overflow-hidden">
        <div className="p-3.5 border-b border-border/70 eyebrow text-[10px]">
          Registered Personnel ({usersList.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="bg-muted/40 uppercase font-semibold text-muted-foreground text-[10px]">
              <tr>
                <th className="px-4 py-3">Full Name / Designation</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Registration ID</th>
                <th className="px-3 py-3">Hospital / Dept</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((u) => (
                <tr key={u.id} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground">{u.fullName}</div>
                    <div className="text-[10px] text-muted-foreground">{u.title}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-medium text-foreground">{u.role}</span>
                  </td>
                  <td className="px-3 py-3 mono text-muted-foreground">{u.registrationId || "—"}</td>
                  <td className="px-3 py-3 text-muted-foreground">
                    <div>{u.hospitalName}</div>
                    <div className="text-[10px]">{u.department}</div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3 text-right">
                    <StatusChip tone={u.status === "Active" ? "good" : "warn"}>
                      {u.status || "Active"}
                    </StatusChip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 5. AUDIT LOG (Admin)
// ============================================================================
export function Audit() {
  const query = useListAuditLogs();
  const [filterAction, setFilterAction] = useState("ALL");

  const rawLogs: any[] = (query.data as any[]) || [];

  // Humanize event names
  const humanizeEvent = (action: string) => {
    if (action.includes("AI_ANALYSIS") || action.includes("AI")) return "AI analysis completed";
    if (action.includes("CASE_CREATED") || action.includes("PATIENT")) return "Patient case created";
    if (action.includes("REVIEW") || action.includes("SIGNED")) return "Clinical review signed";
    if (action.includes("QUALITY")) return "Image quality verified";
    if (action.includes("LOGIN") || action.includes("AUTH")) return "User signed in";
    return action.replace(/_/g, " ").toLowerCase();
  };

  const logs = rawLogs.map((l) => ({
    ...l,
    humanEvent: humanizeEvent(l.action),
  }));

  const filtered = filterAction === "ALL"
    ? logs
    : logs.filter((l) => l.action.includes(filterAction) || l.humanEvent.toLowerCase().includes(filterAction.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Security & Compliance"
        title="Audit Log"
        description="Chronological log of clinical episodes, automated quality checks, AI analysis executions, and doctor sign-offs."
        action={
          <button type="button" className="btn-quiet" onClick={() => query.refetch()} data-testid="button-refresh-audit">
            <RefreshCw size={13} /> Refresh Log
          </button>
        }
      />

      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-b border-border/70 bg-muted/20">
          <span className="eyebrow text-[10px]">Audit Events ({filtered.length})</span>
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-muted-foreground" />
            <select
              className="input-field !w-auto !py-1 text-xs"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              data-testid="select-audit-filter"
            >
              <option value="ALL">All Events</option>
              <option value="SIGNED">Clinical Reviews</option>
              <option value="QUALITY">Quality Gate</option>
              <option value="PATIENT">Patient Registration</option>
              <option value="AI">AI Execution</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="bg-muted/40 uppercase font-semibold text-muted-foreground text-[10px]">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-3 py-3">Case</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log: any, idx: number) => (
                <tr key={log.id || idx} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 mono text-[11px] text-muted-foreground">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">{log.user}</td>
                  <td className="px-4 py-3 text-foreground font-medium">{log.humanEvent}</td>
                  <td className="px-3 py-3">
                    <Link href={`/cases/${log.caseId}`} className="mono text-primary font-semibold hover:underline">
                      {log.caseId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded dark:bg-emerald-950/40 dark:text-emerald-300">
                      Recorded
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 6. SETTINGS & PRACTITIONER PROFILE
// ============================================================================
export function SettingsPage() {
  const { user, updateUser, changePassword } = useAuth();
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState(() => (document.documentElement.classList.contains("dark") ? "dark" : "light"));

  // Notification states
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [queueNotifs, setQueueNotifs] = useState(true);

  // Profile Form state
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [title, setTitle] = useState(user?.title || "");
  const [registrationId, setRegistrationId] = useState(user?.registrationId || "");
  const [hospitalName, setHospitalName] = useState(user?.hospitalName || "");
  const [department, setDepartment] = useState(user?.department || "");
  const [phone, setPhone] = useState(user?.phone || "");

  // Password state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [changingPwd, setChangingPwd] = useState(false);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    await updateUser({
      fullName,
      title,
      registrationId,
      hospitalName,
      department,
      phone,
    });
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("drishti-theme", newTheme);
  };

  const handlePasswordUpdate = async () => {
    setPasswordStatus(null);
    if (!oldPassword) {
      setPasswordStatus({ type: "error", msg: "Current password is required." });
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordStatus({ type: "error", msg: "New password must be at least 8 characters." });
      return;
    }

    setChangingPwd(true);
    const res = await changePassword(oldPassword, newPassword);
    setChangingPwd(false);

    if (res.success) {
      setPasswordStatus({ type: "success", msg: "Password updated successfully." });
      setOldPassword("");
      setNewPassword("");
      setTimeout(() => setPasswordStatus(null), 3000);
    } else {
      setPasswordStatus({ type: "error", msg: res.error || "Failed to update password." });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        eyebrow="Account & Preferences"
        title="Settings"
        description="Practitioner credentials, display theme, and workstation preferences."
        action={saved && <StatusChip tone="good">Profile Updated</StatusChip>}
      />

      <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
        {/* Left: Practitioner Profile Box */}
        <div className="panel p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
              {user?.fullName ? user.fullName.split(" ").map((n) => n[0]).join("").substring(0, 2) : "MD"}
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">{user?.fullName || "Practitioner"}</h2>
              <p className="text-xs text-muted-foreground">{user?.title || "Clinical Specialist"}</p>
              <span className="text-[10px] font-semibold text-primary">{user?.role || "Ophthalmologist"}</span>
            </div>
          </div>

          <div className="space-y-2 text-xs border-t border-border/60 pt-3">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Registration No:</span>
              <strong className="mono text-foreground">{user?.registrationId || "MCI-2022-84920"}</strong>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Hospital:</span>
              <strong className="text-foreground">{user?.hospitalName || "Apex Eye Hospital"}</strong>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Department:</span>
              <strong className="text-foreground">{user?.department || "Ophthalmology"}</strong>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Email:</span>
              <strong className="text-foreground">{user?.email || "doctor@hospital.org"}</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="btn-quiet w-full text-xs justify-center !py-1.5"
          >
            {editing ? "Cancel Edit" : "Edit Profile Information"}
          </button>
        </div>

        {/* Right: Settings & Edit Form */}
        <div className="space-y-5">
          {editing && (
            <form onSubmit={saveProfile} className="panel p-5 space-y-3 bg-muted/10 border-primary/40">
              <span className="eyebrow text-[10px]">Edit Practitioner Details</span>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">Full Name</label>
                  <input
                    type="text"
                    className="input-field text-xs"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">Title</label>
                  <input
                    type="text"
                    className="input-field text-xs"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">Registration No.</label>
                  <input
                    type="text"
                    className="input-field text-xs"
                    value={registrationId}
                    onChange={(e) => setRegistrationId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">Phone</label>
                  <input
                    type="text"
                    className="input-field text-xs"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">Hospital</label>
                  <input
                    type="text"
                    className="input-field text-xs"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">Department</label>
                  <input
                    type="text"
                    className="input-field text-xs"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary text-xs !py-1.5 mt-2">
                Save Updates
              </button>
            </form>
          )}

          {/* Theme & Display */}
          <div className="panel p-5 space-y-3">
            <span className="eyebrow text-[10px]">Display Theme</span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {["light", "dark"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleThemeChange(t)}
                  className={`p-3 rounded-lg border text-left capitalize transition-all ${
                    theme === t ? "border-primary bg-primary/10 font-bold" : "border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{t} Mode</span>
                    {theme === t && <Check size={14} className="text-primary" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Password Update */}
          <div className="panel p-5 space-y-3">
            <span className="eyebrow text-[10px]">Change Password</span>
            {passwordStatus && (
              <div
                className={`p-2.5 rounded text-xs ${
                  passwordStatus.type === "success"
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                }`}
              >
                {passwordStatus.msg}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1">Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="input-field text-xs"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1">New Password (8+ chars)</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="input-field text-xs"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handlePasswordUpdate}
              disabled={changingPwd}
              className="btn-primary text-xs !py-1.5 mt-1"
            >
              {changingPwd ? "Updating…" : "Update Password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}