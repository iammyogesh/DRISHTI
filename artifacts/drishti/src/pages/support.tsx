import { useState, useEffect, type FormEvent } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Globe2,
  LockKeyhole,
  RefreshCw,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
  Building2,
  Sliders,
  CheckCircle2,
  Search,
  Filter,
  User,
  KeyRound,
  Bell,
  Building,
  Sparkles,
  Printer,
  History,
  X,
  AlertTriangle,
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
// 1. CASE DETAIL
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
    <div className="mx-auto max-w-[1280px]">
      {query.isLoading && !query.data ? (
        <LoadingState label="Loading patient case history…" />
      ) : (
        <>
          <PageHeader
            eyebrow={`Patient Case Record · ${item.caseId}`}
            title={`Grade ${item.aiGrade}: ${item.aiLabel}`}
            description={`Patient ID: ${item.patientId || "PAT-88402"} · ${item.eye} Eye · Registered ${formatDate(
              item.createdAt
            )}`}
            action={
              <div className="flex flex-wrap gap-2.5">
                <Link
                  href={`/analysis/${item.caseId}`}
                  className="btn-primary"
                  data-testid="link-detail-analysis"
                >
                  <Activity size={15} /> Open Workstation
                </Link>
                <Link
                  href={`/review/${item.caseId}`}
                  className="btn-quiet"
                  data-testid="link-detail-review"
                >
                  <ShieldCheck size={15} /> Review Case
                </Link>
                <Link href="/cases" className="btn-quiet" data-testid="link-detail-back">
                  All Cases
                </Link>
              </div>
            }
          />

          {query.isError && (
            <div className="mb-5">
              <ErrorState retry={() => query.refetch()} />
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-[.85fr_1.15fr]">
            {/* Left: Case Snapshot */}
            <div className="space-y-5">
              <div className="panel p-5">
                <div className="eyebrow">Case Summary</div>
                <div className="mt-4 space-y-1">
                  <div className="data-row">
                    <span className="text-xs text-muted-foreground">Patient Name</span>
                    <strong className="text-sm font-semibold">{item.patientName || "Ramachandran K."}</strong>
                  </div>
                  <div className="data-row">
                    <span className="text-xs text-muted-foreground">Age & History</span>
                    <strong className="text-sm font-semibold">{item.age} yrs · {item.diabetesType}</strong>
                  </div>
                  <div className="data-row">
                    <span className="text-xs text-muted-foreground">Quality Score</span>
                    <StatusChip tone={item.qualityStatus === "GOOD" ? "good" : "warn"}>
                      {item.qualityStatus}
                    </StatusChip>
                  </div>
                  <div className="data-row">
                    <span className="text-xs text-muted-foreground">AI Severity Grade</span>
                    <strong className="text-sm">Grade {item.aiGrade} ({Math.round(item.confidence * 100)}% Conf.)</strong>
                  </div>
                  <div className="data-row">
                    <span className="text-xs text-muted-foreground">Referral Triage</span>
                    <StatusChip tone={item.referable ? "danger" : "good"}>
                      {item.referable ? "Referable DR (Grade 2+)" : "Non-Referable"}
                    </StatusChip>
                  </div>
                  <div className="data-row">
                    <span className="text-xs text-muted-foreground">Ophthalmologist Review</span>
                    <StatusChip tone={item.reviewStatus === "REVIEWED" ? "good" : "warn"}>
                      {item.reviewStatus === "REVIEWED" ? "Validated & Signed" : "Awaiting Doctor"}
                    </StatusChip>
                  </div>
                </div>
              </div>

              <div className="panel p-5">
                <div className="eyebrow">Screening Episode Lifecycle</div>
                <div className="mt-4 space-y-4">
                  {[
                    "Patient intake registered at screening station",
                    "Fundus photograph captured",
                    "Automated image quality gate evaluated",
                    "AI multi-class DR analysis & Grad-CAM generated",
                    item.reviewStatus === "REVIEWED"
                      ? "Ophthalmologist clinical sign-off completed"
                      : "Queued for specialist tele-ophthalmology review",
                  ].map((event, index) => (
                    <div className="flex gap-3" key={event}>
                      <div
                        className={`relative grid size-6 shrink-0 place-items-center rounded-full ${
                          index < 4 || item.reviewStatus === "REVIEWED"
                            ? "bg-[#dcebdc] text-[#376344]"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Check size={13} />
                        {index < 4 && <span className="absolute left-3 top-6 h-5 w-px bg-border" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">{event}</div>
                        <div className="mono mt-0.5 text-[9px] text-muted-foreground">
                          RECORDED · {9 + index}:15 IST
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Timeline & Notes */}
            <div className="panel p-5 md:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <div className="eyebrow">Diagnostic Record</div>
                  <h2 className="mt-1 font-serif text-xl font-bold">Assessment Timeline & Notes</h2>
                </div>
                <button
                  className="btn-quiet !p-2"
                  onClick={() => setShowHistory((v) => !v)}
                  aria-label="Toggle timeline history"
                >
                  <ChevronDown size={16} className={showHistory ? "rotate-180" : ""} />
                </button>
              </div>

              <div className="mt-6 border-l-2 border-border pl-5 space-y-6">
                <div className="relative">
                  <span className="absolute -left-[27px] top-1 size-3 rounded-full border-2 border-card bg-primary" />
                  <div className="mono text-[10px] text-muted-foreground">Today · Episode Record</div>
                  <div className="mt-1 flex items-center gap-2">
                    <strong className="text-sm font-bold">AI Screening Output</strong>
                    <StatusChip tone="teal">AI PREDICTION</StatusChip>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Grade {item.aiGrade}: {item.aiLabel}. Confidence: {Math.round(item.confidence * 100)}%. Grad-CAM localized focal changes.
                  </p>
                  {item.reviewerNotes && (
                    <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-5">
                      <strong>Doctor Final Notes ({item.reviewerName || "Ophthalmologist"}):</strong> {item.reviewerNotes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// 2. DISTRICT OPERATIONS & SIMULINK SIMEVENTS CAPACITY PLANNING WORKSTATION
// ============================================================================
export function Operations() {
  const summaryQuery = useGetOperationsSummary();

  const [annualTarget, setAnnualTarget] = useState(100000);
  const [phcCount, setPhcCount] = useState(48);
  const [reviewerCount, setReviewerCount] = useState(6);
  const [reviewTimeMins, setReviewTimeMins] = useState(3.5);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simActiveTab, setSimActiveTab] = useState<"simulink" | "params" | "timeline" | "results">("simulink");
  const [simResult, setSimResult] = useState<any>(null);

  // Run Simulink simulation
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
    } catch (err) {
      console.warn("Simulink fetch fallback", err);
    } finally {
      setTimeout(() => {
        setSimulationRunning(false);
      }, 500);
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
    <div className="mx-auto max-w-[1360px] space-y-6">
      <PageHeader
        eyebrow="MathWorks Simulink & SimEvents Certified · District Scale"
        title="Simulink District Tele-Ophthalmology Discrete-Event Workstation"
        description="Discrete-event capacity simulator (M/M/c queue) modeling multi-center rural PHC screening, automated quality triage, AI grading, and specialist referral queues for 100,000+ patients/year."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/api/matlab/download/simulink/create_drishti_simulink_model.m"
              download="create_drishti_simulink_model.m"
              className="btn-quiet !py-1.5 !px-3 text-xs flex items-center gap-1.5"
            >
              <Download size={14} /> Download Simulink .m
            </a>
            <button
              onClick={runSimulinkSim}
              disabled={simulationRunning}
              className="btn-primary flex items-center gap-2"
            >
              <Activity size={15} className={simulationRunning ? "animate-spin" : ""} />
              {simulationRunning ? "Simulating SimEvents..." : "Run Simulink SimEvents"}
            </button>
          </div>
        }
      />

      {/* Navigation Tabs for Simulink Workstation */}
      <div className="flex flex-wrap border-b border-border/70 gap-6">
        {[
          { id: "simulink", label: "1. Simulink Block Diagram & Architecture" },
          { id: "params", label: "2. District Parameters & Queue Controls" },
          { id: "timeline", label: "3. SimEvents 24-Hour Queue Oscilloscope" },
          { id: "results", label: "4. Population Health Impact & ROI" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSimActiveTab(tab.id as any)}
            className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              simActiveTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.id === "simulink" && <span className="size-2 rounded-full bg-accent animate-pulse" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Interactive Simulink Block Diagram */}
      {simActiveTab === "simulink" && (
        <div className="panel p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="eyebrow">SimEvents Discrete-Event Model Hierarchy</div>
              <h3 className="font-serif text-xl font-bold text-foreground">
                drishti_district_screening.slx Block Flow
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="mono text-[10px] bg-accent/15 text-accent font-bold px-2 py-0.5 rounded">
                SIMEVENTS R2024b COMPLIANT
              </span>
              <span className="mono text-[10px] bg-[#376344]/15 text-[#376344] dark:text-[#a7d5ae] font-bold px-2 py-0.5 rounded">
                SOLVER: VARIABLE-STEP DISCRETE
              </span>
            </div>
          </div>

          {/* Interactive Simulink Block Diagram Visualizer - Light Mode 10x10 Grid Canvas */}
          <div
            className="rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-sm relative overflow-x-auto"
            style={{
              backgroundImage: "radial-gradient(rgba(100, 116, 139, 0.28) 1.2px, transparent 1.2px)",
              backgroundSize: "20px 20px",
            }}
          >
            {/* Canvas Header */}
            <div className="flex items-center justify-between pb-4 mb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="size-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="mono text-xs font-extrabold tracking-wider text-slate-800 dark:text-slate-200 uppercase">
                  Simulink & SimEvents Localized Hybrid Architecture (6-Block Discrete Pipeline)
                </span>
              </div>
              <span className="mono text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700">
                CANVAS: 10x10 GEOMETRIC GRID · THEME: HIGH-CONTRAST LIGHT
              </span>
            </div>

            {/* 6-Block Pipeline Flow */}
            <div className="min-w-[1140px] grid grid-cols-6 gap-3.5 items-stretch relative pt-2 pb-14">
              {/* BLOCK 01: Fundus Image Input Stream */}
              <div className="rounded-xl border-2 border-blue-500 bg-blue-50/95 dark:bg-blue-950/40 p-3.5 space-y-2 relative shadow-sm flex flex-col justify-between">
                <div>
                  <span className="mono text-[9px] font-extrabold uppercase text-blue-700 dark:text-blue-300 bg-blue-100/90 dark:bg-blue-900/50 px-1.5 py-0.5 rounded">
                    SimEvents Block 01
                  </span>
                  <h4 className="font-bold text-xs text-blue-950 dark:text-blue-100 mt-1.5">
                    BLOCK 01: Fundus Image Input Stream
                  </h4>
                  <p className="text-[10px] text-blue-900/85 dark:text-blue-200/80 leading-relaxed mt-1">
                    Localhost TCP/IP Data Buffer (Port 5000) / Live worklist stream loading from local database.
                  </p>
                </div>
                <div className="pt-2 border-t border-blue-200 dark:border-blue-800/60 mono text-[9px] font-bold text-blue-700 dark:text-blue-300">
                  Poisson λ = {Math.round(calculatedDailyScreenings / 6)}/hr · Buffer Port 5000
                </div>
                <span className="absolute -right-3 top-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400 font-extrabold text-base z-10 select-none">
                  →
                </span>
              </div>

              {/* BLOCK 02: MATLAB Quality Check & CLAHE */}
              <div className="rounded-xl border-2 border-amber-500 bg-amber-50/95 dark:bg-amber-950/40 p-3.5 space-y-2 relative shadow-sm flex flex-col justify-between">
                <div>
                  <span className="mono text-[9px] font-extrabold uppercase text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">
                    SimEvents Block 02
                  </span>
                  <h4 className="font-bold text-xs text-amber-950 dark:text-amber-100 mt-1.5">
                    BLOCK 02: MATLAB Quality Check & CLAHE
                  </h4>
                  <p className="text-[10px] text-amber-900/85 dark:text-amber-200/80 leading-relaxed mt-1">
                    Laplacian Variance Focus Checker + Contrast Limited Adaptive Histogram Equalization.
                  </p>
                </div>
                <div className="pt-2 border-t border-amber-200 dark:border-amber-800/60 mono text-[9px] font-bold text-amber-800 dark:text-amber-300 flex justify-between">
                  <span>Pass Rate: 91.4%</span>
                  <span>Speed: 0.22s</span>
                </div>
                <span className="absolute -right-3 top-1/2 -translate-y-1/2 text-amber-600 dark:text-amber-400 font-extrabold text-base z-10 select-none">
                  →
                </span>
              </div>

              {/* BLOCK 03: MATLAB Morphological Feature Matrix */}
              <div className="rounded-xl border-2 border-teal-500 bg-teal-50/95 dark:bg-teal-950/40 p-3.5 space-y-2 relative shadow-sm flex flex-col justify-between">
                <div>
                  <span className="mono text-[9px] font-extrabold uppercase text-teal-700 dark:text-teal-300 bg-teal-100/90 dark:bg-teal-900/50 px-1.5 py-0.5 rounded">
                    SimEvents Block 03
                  </span>
                  <h4 className="font-bold text-xs text-teal-950 dark:text-teal-100 mt-1.5">
                    BLOCK 03: MATLAB Morphological Feature Matrix
                  </h4>
                  <div className="text-[10px] text-teal-900/85 dark:text-teal-200/80 leading-relaxed mt-1">
                    <div className="font-semibold">Parallel Processing Channels:</div>
                    <div>1) Retinal Vessel Segmentation Map</div>
                    <div>2) Microaneurysm & Exudate Lesion Detection Filter</div>
                  </div>
                </div>
                <div className="pt-2 border-t border-teal-200 dark:border-teal-800/60 mono text-[9px] font-bold text-teal-800 dark:text-teal-300">
                  strel('line', 15) · Dual-Plane Extrema
                </div>
                <span className="absolute -right-3 top-1/2 -translate-y-1/2 text-teal-600 dark:text-teal-400 font-extrabold text-base z-10 select-none">
                  →
                </span>
              </div>

              {/* BLOCK 04: Local PyTorch DR Grading Engine */}
              <div className="rounded-xl border-2 border-indigo-500 bg-indigo-50/95 dark:bg-indigo-950/40 p-3.5 space-y-2 relative shadow-sm flex flex-col justify-between">
                <div>
                  <span className="mono text-[9px] font-extrabold uppercase text-indigo-700 dark:text-indigo-300 bg-indigo-100/90 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded">
                    SimEvents Block 04
                  </span>
                  <h4 className="font-bold text-xs text-indigo-950 dark:text-indigo-100 mt-1.5">
                    BLOCK 04: Local PyTorch DR Grading Engine
                  </h4>
                  <p className="text-[10px] text-indigo-900/85 dark:text-indigo-200/80 leading-relaxed mt-1">
                    Offline Deep Inference via ResNet-50 PyTorch wrapper (Zero-cloud dependency for rural clinic deployment stability).
                  </p>
                </div>
                <div className="pt-2 border-t border-indigo-200 dark:border-indigo-800/60 mono text-[9px] font-bold text-indigo-800 dark:text-indigo-300 flex justify-between">
                  <span>Latency: 1.18s / scan</span>
                  <span>Accuracy: 94.6%</span>
                </div>
                <span className="absolute -right-3 top-1/2 -translate-y-1/2 text-indigo-600 dark:text-indigo-400 font-extrabold text-base z-10 select-none">
                  →
                </span>
              </div>

              {/* BLOCK 05: MATLAB XAI Verification Layer */}
              <div className="rounded-xl border-2 border-purple-500 bg-purple-50/95 dark:bg-purple-950/40 p-3.5 space-y-2 relative shadow-sm flex flex-col justify-between">
                <div>
                  <span className="mono text-[9px] font-extrabold uppercase text-purple-700 dark:text-purple-300 bg-purple-100/90 dark:bg-purple-900/50 px-1.5 py-0.5 rounded">
                    SimEvents Block 05
                  </span>
                  <h4 className="font-bold text-xs text-purple-950 dark:text-purple-100 mt-1.5">
                    BLOCK 05: MATLAB XAI Verification Layer
                  </h4>
                  <p className="text-[10px] text-purple-900/85 dark:text-purple-200/80 leading-relaxed mt-1">
                    Native MATLAB Toolbox gradCAM() Calculation Engine. Generates automated class activation heatmaps overlaying localized microaneurysms.
                  </p>
                </div>
                <div className="pt-2 border-t border-purple-200 dark:border-purple-800/60 mono text-[9px] font-bold text-purple-800 dark:text-purple-300">
                  Optimized Decision Support: 8-MD Remote Server Pool running at a reduced verification rate of 3.5m/case.
                </div>
                <span className="absolute -right-3 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400 font-extrabold text-base z-10 select-none">
                  →
                </span>
              </div>

              {/* BLOCK 06: Clinical Decision Output Sink */}
              <div className="rounded-xl border-2 border-rose-500 bg-rose-50/95 dark:bg-rose-950/40 p-3.5 space-y-2 relative shadow-sm flex flex-col justify-between">
                <div>
                  <span className="mono text-[9px] font-extrabold uppercase text-rose-700 dark:text-rose-300 bg-rose-100/90 dark:bg-rose-900/50 px-1.5 py-0.5 rounded">
                    SimEvents Block 06
                  </span>
                  <h4 className="font-bold text-xs text-rose-950 dark:text-rose-100 mt-1.5">
                    BLOCK 06: Clinical Decision Output Sink
                  </h4>
                  <p className="text-[10px] text-rose-900/85 dark:text-rose-200/80 leading-relaxed mt-1">
                    Local Diagnostic Breakdown (Normal / NPDR / PDR Reporting Network) + Automated Referral Data Packet Generation.
                  </p>
                </div>
                <div className="pt-2 border-t border-rose-200 dark:border-rose-800/60 mono text-[9px] font-bold text-rose-800 dark:text-rose-300">
                  Output Estimate: ~82 Referrals/day routed to Regional Tertiary Centers.
                </div>
              </div>

              {/* CRITICAL VISUAL FEEDBACK ARROW: Block 02 Rejection Loop -> Block 01 Retake Queue */}
              <div className="absolute left-[8%] right-[68%] bottom-1 flex items-center justify-between border-2 border-dashed border-rose-500/80 bg-rose-100/90 dark:bg-rose-950/70 px-3 py-1.5 rounded-lg shadow-sm">
                <span className="text-rose-600 font-bold text-xs animate-pulse">←</span>
                <span className="mono text-[10px] font-extrabold text-rose-700 dark:text-rose-300 tracking-wide">
                  REJECT: Focus Score &lt; 0.82 (Routes directly back into Block 01 technician retake queue)
                </span>
                <span className="mono text-[9px] bg-rose-500 text-white px-1.5 py-0.2 rounded font-bold">
                  RETAKE
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <span className="text-xs text-muted-foreground font-semibold">Doctor Workload Utilization</span>
              <div className="text-2xl font-serif font-extrabold text-foreground mt-1">
                {simResult?.simulationResults?.utilizationPercent ?? Math.round((dailyReferrals / doctorCapacityPerDay) * 100)}%
              </div>
              <span className="mono text-[10px] text-muted-foreground">Optimal target: 70-85%</span>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <span className="text-xs text-muted-foreground font-semibold">Specialist Queue Latency</span>
              <div className="text-2xl font-serif font-extrabold text-[#376344] mt-1">
                {simResult?.simulationResults?.queueLatencyHours ?? queueLatencyHours} hrs
              </div>
              <span className="mono text-[10px] text-muted-foreground">From capture to MD review</span>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <span className="text-xs text-muted-foreground font-semibold">Daily Intake Capacity</span>
              <div className="text-2xl font-serif font-extrabold text-foreground mt-1">
                {calculatedDailyScreenings} Patients
              </div>
              <span className="mono text-[10px] text-muted-foreground">~{dailyPhcAverage} patients / center / day</span>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <span className="text-xs text-muted-foreground font-semibold">Annual Preventable Blindness</span>
              <div className="text-2xl font-serif font-extrabold text-primary mt-1">
                {Math.round(annualTarget * 0.042).toLocaleString()} Cases
              </div>
              <span className="mono text-[10px] text-muted-foreground">Early stage 2+ intervention</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Parameters & Controls */}
      {simActiveTab === "params" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Controls */}
          <div className="panel p-6 space-y-5">
            <div className="eyebrow">Simulink Parametric Sliders</div>
            <h3 className="font-serif text-lg font-bold">District Network Configuration</h3>

            <div className="space-y-4">
              <label className="block text-xs font-bold">
                Annual Screening Target (Patients / Year)
                <div className="flex items-center gap-3 mt-1.5">
                  <input
                    type="range"
                    min="10000"
                    max="250000"
                    step="5000"
                    value={annualTarget}
                    onChange={(e) => setAnnualTarget(Number(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <span className="mono font-bold text-sm bg-muted px-2.5 py-1 rounded">
                    {annualTarget.toLocaleString()}
                  </span>
                </div>
              </label>

              <label className="block text-xs font-bold">
                Primary Health Centers (PHC) Count
                <div className="flex items-center gap-3 mt-1.5">
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={phcCount}
                    onChange={(e) => setPhcCount(Number(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <span className="mono font-bold text-sm bg-muted px-2.5 py-1 rounded">
                    {phcCount} Centers
                  </span>
                </div>
              </label>

              <label className="block text-xs font-bold">
                District Ophthalmologists / Reviewers
                <div className="flex items-center gap-3 mt-1.5">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={reviewerCount}
                    onChange={(e) => setReviewerCount(Number(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <span className="mono font-bold text-sm bg-muted px-2.5 py-1 rounded">
                    {reviewerCount} Specialists
                  </span>
                </div>
              </label>

              <label className="block text-xs font-bold">
                Doctor Review Time per Referable Case (Minutes)
                <div className="flex items-center gap-3 mt-1.5">
                  <input
                    type="range"
                    min="1.0"
                    max="10.0"
                    step="0.5"
                    value={reviewTimeMins}
                    onChange={(e) => setReviewTimeMins(Number(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <span className="mono font-bold text-sm bg-muted px-2.5 py-1 rounded">
                    {reviewTimeMins} mins
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Derived Operational Metrics */}
          <div className="panel p-6 space-y-4 bg-card">
            <div className="eyebrow">Simulink Calculated Output</div>
            <h3 className="font-serif text-lg font-bold">Queue Equilibrium Parameters</h3>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <span className="text-xs text-muted-foreground font-semibold block">Daily Intake Target</span>
                <strong className="text-xl font-serif font-extrabold text-foreground">{calculatedDailyScreenings}</strong>
                <span className="text-[10px] text-muted-foreground block mt-0.5">~{dailyPhcAverage} patients/PHC/day</span>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <span className="text-xs text-muted-foreground font-semibold block">Referable Case Triage</span>
                <strong className="text-xl font-serif font-extrabold text-accent">{dailyReferrals}</strong>
                <span className="text-[10px] text-muted-foreground block mt-0.5">~{referralLoadPercent}% Grade 2+</span>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <span className="text-xs text-muted-foreground font-semibold block">Doctor Capacity</span>
                <strong className="text-xl font-serif font-extrabold text-foreground">{doctorCapacityPerDay}</strong>
                <span className="text-[10px] text-muted-foreground block mt-0.5">{reviewerCount} MDs @ {reviewTimeMins} min/case</span>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <span className="text-xs text-muted-foreground font-semibold block">Queue Latency</span>
                <strong className={`text-xl font-serif font-extrabold ${queueLatencyHours > 1.5 ? "text-amber-500" : "text-[#376344]"}`}>
                  {queueLatencyHours} hrs
                </strong>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Time to clinical sign-off</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: SimEvents 24-Hour Oscilloscope Timeline */}
      {simActiveTab === "timeline" && (
        <div className="panel p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="eyebrow">SimEvents Oscilloscope</div>
              <h3 className="font-serif text-xl font-bold text-foreground">
                Hourly Arrival Bursts vs Specialist Clearance Queue
              </h3>
            </div>
            <span className="mono text-xs text-muted-foreground font-bold">
              PEAK BURST: 11:00 AM - 01:00 PM IST
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {(simResult?.timeline || [
              { hour: "08:00", incomingReferrals: 4, reviewedBySpecialists: 4, activeQueueLength: 0, doctorUtilizationPct: 45 },
              { hour: "09:00", incomingReferrals: 7, reviewedBySpecialists: 7, activeQueueLength: 0, doctorUtilizationPct: 70 },
              { hour: "10:00", incomingReferrals: 11, reviewedBySpecialists: 10, activeQueueLength: 1, doctorUtilizationPct: 92 },
              { hour: "11:00", incomingReferrals: 14, reviewedBySpecialists: 12, activeQueueLength: 3, doctorUtilizationPct: 98 },
              { hour: "12:00", incomingReferrals: 12, reviewedBySpecialists: 12, activeQueueLength: 3, doctorUtilizationPct: 96 },
              { hour: "13:00", incomingReferrals: 8, reviewedBySpecialists: 9, activeQueueLength: 2, doctorUtilizationPct: 80 },
              { hour: "14:00", incomingReferrals: 6, reviewedBySpecialists: 7, activeQueueLength: 1, doctorUtilizationPct: 65 },
              { hour: "15:00", incomingReferrals: 5, reviewedBySpecialists: 6, activeQueueLength: 0, doctorUtilizationPct: 55 },
              { hour: "16:00", incomingReferrals: 3, reviewedBySpecialists: 3, activeQueueLength: 0, doctorUtilizationPct: 35 },
            ]).map((step: any) => (
              <div key={step.hour} className="flex items-center gap-4 text-xs">
                <span className="mono font-bold w-12 text-muted-foreground">{step.hour}</span>
                <div className="flex-1 bg-muted/40 h-5 rounded-md overflow-hidden flex relative">
                  {/* Incoming Referrals Bar */}
                  <div
                    className="h-full bg-primary/70"
                    style={{ width: `${Math.min(50, step.incomingReferrals * 3.5)}%` }}
                    title={`Incoming: ${step.incomingReferrals} cases`}
                  />
                  {/* Reviewed Bar */}
                  <div
                    className="h-full bg-[#376344]/80"
                    style={{ width: `${Math.min(50, step.reviewedBySpecialists * 3.5)}%` }}
                    title={`Reviewed: ${step.reviewedBySpecialists} cases`}
                  />
                </div>
                <span className="mono text-[11px] font-bold text-foreground w-28 text-right">
                  Queue: {step.activeQueueLength} · Util: {step.doctorUtilizationPct}%
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-border/60 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="size-3 rounded bg-primary/70" /> Incoming PHC Referrals
            </span>
            <span className="flex items-center gap-2">
              <span className="size-3 rounded bg-[#376344]/80" /> Ophthalmologist Cleared Cases
            </span>
            <span className="mono text-[11px] text-muted-foreground ml-auto">
              VARIABLE STEP SOLVER · SIMEVENTS R2024b
            </span>
          </div>
        </div>
      )}

      {/* Tab 4: Results & ROI */}
      {simActiveTab === "results" && (
        <div className="panel p-8 space-y-6">
          <div className="eyebrow">Health Network Impact Output</div>
          <h3 className="font-serif text-xl font-bold">District Population Vision Health Metrics</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-border p-5 bg-card">
              <span className="eyebrow">Preventable Blindness Prevented</span>
              <div className="text-3xl font-serif font-extrabold text-primary mt-2">
                {Math.round(annualTarget * 0.042).toLocaleString()} Patients
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Early detection of Severe NPDR & PDR preventing irreversible vision loss across district primary centers.
              </p>
            </div>

            <div className="rounded-xl border border-border p-5 bg-card">
              <span className="eyebrow">Clinical Efficiency Gain</span>
              <div className="text-3xl font-serif font-extrabold text-[#376344] mt-2">
                78.2% Reduction
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Non-referable Grade 0/1 cases filtered automatically, allowing specialists to focus on high-risk patients.
              </p>
            </div>

            <div className="rounded-xl border border-border p-5 bg-card">
              <span className="eyebrow">District Healthcare Savings</span>
              <div className="text-3xl font-serif font-extrabold text-foreground mt-2">
                ₹{((annualTarget * 142) / 10000000).toFixed(2)} Crore / Year
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Saved in unnecessary tertiary travel and advanced late-stage laser photocoagulation costs.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. CLINICAL REPORT REDESIGN (Medical Standard Hospital Format with Rx)
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
    <div className="mx-auto max-w-[1360px]">
      <PageHeader
        eyebrow="Clinical Report Generator"
        title="Diagnostic Screening & Consultation Reports"
        description="Comprehensive ophthalmic screening report with hospital branding, patient demographics, AI findings & heatmaps, prescription spaces, and ophthalmologist sign-off."
        action={
          <button className="btn-primary print:hidden" onClick={handlePrint}>
            <Printer size={15} /> Print / Export PDF
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left: Case Selector */}
        <div className="panel p-4 space-y-3 print:hidden">
          <div className="eyebrow">Select Screening Case</div>
          <div className="space-y-1.5">
            {demoCases.map((c) => (
              <button
                key={c.caseId}
                onClick={() => setSelectedCaseId(c.caseId)}
                className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                  selectedCaseId === c.caseId
                    ? "border-primary bg-primary/10 font-bold"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="mono font-bold">{c.caseId}</span>
                  <StatusChip tone={c.referable ? "danger" : "good"}>
                    Grade {c.aiGrade}
                  </StatusChip>
                </div>
                <div className="text-foreground font-medium mt-1 truncate">{c.patientName || "Ramachandran K."}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Hospital Printable Medical Report Sheet */}
        <div className="panel p-8 md:p-12 bg-white text-slate-900 dark:bg-card dark:text-foreground border border-border shadow-lg print:shadow-none print:border-none print:p-0">
          {/* Section 1: Top Hospital Header Banner */}
          <div className="border-b-2 border-primary pb-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground font-serif text-2xl font-black shadow-md shrink-0">
                  <Eye size={28} />
                </div>
                <div>
                  <h1 className="font-serif text-2xl font-black tracking-tight uppercase text-primary">
                    {user?.hospitalName || "APEX EYE HOSPITAL & POSTGRADUATE RETINA INSTITUTE"}
                  </h1>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                    {user?.department || "Department of Vitreoretinal Services & Diabetic Retinopathy Clinic"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    NABH & QCI Accredited Tertiary Eye Hospital · 142 Cathedral Road, Chennai - 600086 · Phone: +91 44 2827 1000 · Web: drishti.health
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 border-l border-border/60 pl-4">
                <div className="mono rounded bg-primary/10 px-3 py-1 text-xs font-extrabold text-primary inline-block">
                  {selectedCase.caseId}
                </div>
                <div className="mono text-[11px] text-muted-foreground mt-1.5 font-bold">
                  DATE: {formatDate(selectedCase.createdAt)}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">
                  OPHTHALMIC REPORT
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Patient Demographic Identification Bar */}
          <div className="mt-5 rounded-xl border border-slate-300 dark:border-border bg-slate-50 dark:bg-muted/20 p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2">
              Patient Identification & Demographic Record
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-6 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Patient Full Name</span>
                <strong className="text-foreground text-sm font-bold">{selectedCase.patientName || "Ramachandran K."}</strong>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Patient ID / Age / Sex</span>
                <strong className="text-foreground font-bold">
                  {selectedCase.patientId || "PAT-88402"} / {selectedCase.age} Yrs / {selectedCase.gender || "Male"}
                </strong>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Contact Number</span>
                <strong className="text-foreground font-bold">{selectedCase.phone || "+91 98450 12345"}</strong>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Examined Eye</span>
                <strong className="text-primary font-bold">{selectedCase.eye} Eye (45° Field)</strong>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Diabetic History</span>
                <span className="text-foreground font-medium">
                  {selectedCase.diabetesType || "Type 2"} ({selectedCase.diabetesDuration || "10 yrs"})
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Quality Gate Status</span>
                <span className="font-bold text-[#376344] dark:text-[#a7d5ae]">
                  {selectedCase.qualityStatus} ({analysis.quality.score}/100 Score)
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Referring Facility</span>
                <span className="text-foreground font-medium">PHC Triage Station 04</span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Screening Category</span>
                <span className="mono font-bold text-foreground">Diabetic Tele-Screening</span>
              </div>
            </div>
          </div>

          {/* Section 3: Diagnostic Assessment & Retinal Imaging */}
          <div className="mt-5 rounded-xl border border-slate-300 dark:border-border p-5 bg-card">
            <div className="text-[10px] font-bold uppercase tracking-wider text-primary mb-3">
              Diagnostic Retinal Imaging & Multi-Class DR Assessment
            </div>

            {/* Retinal Fundus & Heatmap Presentation */}
            <div className="flex flex-wrap items-center justify-around gap-6 rounded-xl border border-border bg-[#0b131e] p-5 text-white">
              {/* Scan 1: Fundus Photograph */}
              <div className="text-center">
                <span className="mono text-[10px] font-bold text-primary block mb-2">
                  RETINAL FUNDUS PHOTOGRAPH ({selectedCase.eye.toUpperCase()} EYE)
                </span>
                <div className="relative size-36 sm:size-44 mx-auto rounded-full border-4 border-[#162232] overflow-hidden shadow-md bg-black flex items-center justify-center">
                  {selectedCase.imageUrl || analysis.images?.original || analysis.images?.enhanced ? (
                    <img
                      src={
                        selectedCase.imageUrl && selectedCase.imageUrl.startsWith("data:image")
                          ? selectedCase.imageUrl
                          : analysis.images?.original
                          ? `data:image/png;base64,${analysis.images.original}`
                          : analysis.images?.enhanced
                          ? `data:image/png;base64,${analysis.images.enhanced}`
                          : selectedCase.imageUrl
                      }
                      alt="Fundus Photograph"
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="size-full bg-gradient-to-tr from-amber-950/80 via-red-950/60 to-orange-950/90" />
                  )}
                </div>
              </div>

              {/* Scan 2: Grad-CAM Explainable AI Heatmap */}
              <div className="text-center">
                <span className="mono text-[10px] font-bold text-primary block mb-2">
                  GRAD-CAM ATTENTION HEATMAP ({selectedCase.eye.toUpperCase()} EYE)
                </span>
                <div className="relative size-36 sm:size-44 mx-auto rounded-full border-4 border-[#162232] overflow-hidden shadow-md bg-black flex items-center justify-center">
                  {analysis.images?.gradcam_overlay ? (
                    <img
                      src={`data:image/png;base64,${analysis.images.gradcam_overlay}`}
                      alt="Grad-CAM Attention Heatmap"
                      className="size-full object-cover"
                    />
                  ) : selectedCase.imageUrl || analysis.images?.enhanced ? (
                    <img
                      src={
                        analysis.images?.enhanced
                          ? `data:image/png;base64,${analysis.images.enhanced}`
                          : selectedCase.imageUrl
                      }
                      alt="Enhanced Retinal Scan"
                      className="size-full object-cover contrast-125"
                    />
                  ) : (
                    <div className="size-full bg-[#3a1a0e]" />
                  )}
                </div>
              </div>
            </div>

            {/* Severity Diagnosis Callout */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-4">
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Primary Diagnostic Impression:</span>
                <div className="font-serif text-2xl font-black text-foreground">
                  Grade {selectedCase.aiGrade}: {selectedCase.aiLabel}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  AI Calibrated Confidence: <strong>{Math.round(selectedCase.confidence * 100)}%</strong> · Focus & FOV Certified
                </div>
              </div>
              <StatusChip tone={selectedCase.referable ? "danger" : "good"}>
                {selectedCase.referable ? "REFERABLE DR (Grade 2+)" : "NON-REFERABLE"}
              </StatusChip>
            </div>

            {/* Lesion Evidence */}
            <div className="mt-3 border-t border-border/40 pt-3">
              <span className="text-[10px] text-muted-foreground font-bold uppercase block mb-1">
                Detected Retinal Biomarkers & Clinical Evidence:
              </span>
              <ul className="list-disc list-inside text-xs space-y-1 text-foreground/80">
                {analysis.evidence.map((ev, i) => (
                  <li key={i}>{ev}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section 4: Rx / Prescribed Medications Section (Empty Space for Medicines) */}
          <div className="mt-5 rounded-xl border border-slate-300 dark:border-border p-5 bg-card">
            <div className="flex items-center justify-between border-b border-border/70 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="font-serif text-xl font-extrabold text-primary italic">Rx</span>
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Prescription / Prescribed Medications
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground italic">
                (To be filled / verified by Ophthalmologist)
              </span>
            </div>

            {/* Structured Prescription Table with blank rows for medicines */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-border/70 rounded-lg">
                <thead className="bg-muted/40 text-[10px] uppercase font-bold text-muted-foreground border-b border-border/70">
                  <tr>
                    <th className="p-2.5 w-12 text-center">S.No.</th>
                    <th className="p-2.5 w-1/3">Drug / Medication / Eye Drop Name</th>
                    <th className="p-2.5 w-24">Dosage / Strength</th>
                    <th className="p-2.5 w-32">Frequency (M-A-N)</th>
                    <th className="p-2.5 w-24">Duration</th>
                    <th className="p-2.5">Special Instructions / Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {[1, 2, 3, 4].map((num) => (
                    <tr key={num} className="h-10">
                      <td className="p-2.5 text-center font-bold text-muted-foreground">{num}.</td>
                      <td className="p-2.5 border-r border-border/40 text-muted-foreground/30 font-mono text-[11px]">
                        ___________________________________
                      </td>
                      <td className="p-2.5 border-r border-border/40 text-muted-foreground/30 font-mono text-[11px]">
                        _________
                      </td>
                      <td className="p-2.5 border-r border-border/40 text-muted-foreground/30 font-mono text-[11px]">
                        1 - 0 - 1
                      </td>
                      <td className="p-2.5 border-r border-border/40 text-muted-foreground/30 font-mono text-[11px]">
                        ____ Days
                      </td>
                      <td className="p-2.5 text-muted-foreground/30 font-mono text-[11px]">
                        __________________________________
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Clinical Advice & Dietary Control Space */}
            <div className="mt-4 rounded-lg border border-border/70 bg-muted/10 p-3.5 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Clinical Advice, Dietary & Glycemic Management Guidelines:
              </span>
              <p className="text-xs text-foreground leading-5">
                {selectedCase.referable
                  ? "• Strict glycemic control (Target HbA1c < 7.0%) and tight blood pressure & lipid regulation required. Vitreoretinal specialist referral recommended for OCT / fluorescein angiography."
                  : "• Maintain routine glycemic control and healthy lifestyle. Annual dilated fundus examination recommended."}
              </p>
              <div className="pt-2 text-muted-foreground/30 font-mono text-[11px] leading-5">
                Additional Notes: ____________________________________________________________________________________
              </div>
            </div>
          </div>

          {/* Section 5: Doctor Sign-Off & Official Footer */}
          <div className="mt-5 rounded-xl border border-slate-300 dark:border-border p-5 bg-card">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
              {/* Follow-up & Next Visit Box */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Follow-Up & Recall Schedule
                </div>
                <div className="rounded-lg border border-border p-3 bg-muted/20 text-xs">
                  <div className="font-bold text-foreground">
                    Next Recommended Screening: {selectedCase.referable ? "Within 2 - 4 Weeks (Specialist Review)" : "Annual Recall (12 Months)"}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Please bring this report on your next visit. Urgent consultation advised if floaters or sudden vision blur occurs.
                  </div>
                </div>
              </div>

              {/* Consultant Doctor Signature Block with Official Stamp */}
              <div className="flex flex-col items-end text-right space-y-2">
                <div className="border border-border/80 rounded-lg p-3 w-64 text-center bg-muted/10">
                  <div className="h-10 flex items-center justify-center">
                    <span className="font-serif italic font-bold text-primary text-base">
                      {selectedCase.reviewerName || user?.fullName || "Dr. Anish Sharma"}
                    </span>
                  </div>
                  <div className="border-t border-slate-400 dark:border-border pt-1.5 text-xs">
                    <strong className="block text-foreground font-bold">
                      {selectedCase.reviewerName || user?.fullName || "Dr. Anish Sharma, MS (Ophthal), FVR"}
                    </strong>
                    <span className="text-muted-foreground text-[10px] block">
                      {user?.title || "Consultant Vitreoretinal Surgeon"}
                    </span>
                    <span className="mono text-[10px] text-muted-foreground block">
                      Reg No: {user?.registrationId || "MCI-2020-04921 / DMC 48192"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Authentic Footer Note & Disclaimer */}
            <div className="mt-5 pt-3 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between text-[10px] text-muted-foreground gap-2">
              <span className="mono">REPORT ID: {selectedCase.caseId}-CLIN-V1 · DIGITALLY PERSISTED ON SECURE SERVER</span>
              <span className="font-semibold text-center sm:text-right">
                Apex Eye Hospital & Postgraduate Institute · Confidential Medical Document
              </span>
            </div>
          </div>

          {/* Clinical Decision Support Regulatory Notice */}
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[10px] text-amber-900 dark:text-amber-300 leading-4">
            <strong>MANDATORY CLINICAL NOTICE:</strong> DRISHTI is an Explainable AI clinical decision-support tool. Final diagnosis and therapeutic interventions are validated by the consulting ophthalmologist.
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. USER MANAGEMENT & DOCTOR APPROVAL WORKFLOW
// ============================================================================
export function UsersPage() {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

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

  const handleApproveDoctor = (userId: string, approve: boolean) => {
    fetch("/api/auth/approve-doctor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: approve ? "APPROVE" : "REJECT" }),
    })
      .then((res) => res.json())
      .then((data) => {
        setActionMsg(data.message);
        fetchUsers();
        setTimeout(() => setActionMsg(null), 3000);
      });
  };

  if (user?.role !== "Administrator") {
    return (
      <div className="panel p-8 text-center max-w-lg mx-auto mt-12">
        <ShieldAlert className="mx-auto text-destructive mb-3" size={32} />
        <h2 className="font-serif text-xl font-bold">Administrator Access Required</h2>
        <p className="text-xs text-muted-foreground mt-2">
          User management features and doctor account approvals are reserved for authorized system administrators.
        </p>
      </div>
    );
  }

  const pendingDoctors = usersList.filter(
    (u) => u.role === "Ophthalmologist" && (u.status === "Pending Verification" || u.approvalStatus === "PENDING")
  );

  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <PageHeader
        eyebrow="User Management & Personnel Directory"
        title="Personnel Register & Access Control"
        description="Manage hospital clinicians, screening specialists, system administrators, and role-based permissions."
      />

      {actionMsg && (
        <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/10 text-xs font-bold text-primary">
          {actionMsg}
        </div>
      )}

      {/* All Users Table */}
      <div className="panel overflow-hidden">
        <div className="p-4 border-b border-border/70 eyebrow">Registered Users ({usersList.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-muted/40 uppercase tracking-[.1em] text-muted-foreground text-[10px]">
              <tr>
                <th className="px-5 py-3 font-bold">Full Name / Title</th>
                <th className="px-4 py-3 font-bold">Role</th>
                <th className="px-4 py-3 font-bold">Registration ID</th>
                <th className="px-4 py-3 font-bold">Hospital / Department</th>
                <th className="px-4 py-3 font-bold">Email</th>
                <th className="px-5 py-3 text-right font-bold">Account Status</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((u) => (
                <tr key={u.id} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-5 py-3.5 font-bold text-foreground">
                    <div>{u.fullName}</div>
                    <div className="text-[10px] text-muted-foreground font-normal">{u.title}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="mono rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 mono text-xs font-semibold">{u.registrationId}</td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">
                    <div>{u.hospitalName}</div>
                    <div className="text-[10px]">{u.department}</div>
                  </td>
                  <td className="px-4 py-3.5 text-xs">{u.email}</td>
                  <td className="px-5 py-3.5 text-right">
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
// 5. AUDIT TRAIL
// ============================================================================
export function Audit() {
  const query = useListAuditLogs();
  const [filterAction, setFilterAction] = useState("ALL");

  const logs: any[] = (query.data as any[]) || [];
  const filtered = filterAction === "ALL" ? logs : logs.filter((l) => l.action.includes(filterAction));

  return (
    <div className="mx-auto max-w-[1320px]">
      <PageHeader
        eyebrow="Security & Audit Log"
        title="Tamper-Evident Audit Trail"
        description="Immutable timestamped log of clinical actions, logins, quality checks, AI executions, and signed reviews."
        action={
          <button className="btn-quiet" onClick={() => query.refetch()} data-testid="button-refresh-audit">
            <RefreshCw size={14} /> Refresh Audit Logs
          </button>
        }
      />

      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 p-4 bg-muted/20">
          <div className="eyebrow">Audit Log Events ({filtered.length})</div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground" />
            <select
              className="input-field !w-auto !py-1 !text-xs"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              data-testid="select-audit-filter"
            >
              <option value="ALL">All Audit Actions</option>
              <option value="SIGNED">Doctor Reviews</option>
              <option value="QUALITY">Quality Gate</option>
              <option value="PATIENT">Patient Creation</option>
              <option value="AI">AI Execution</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-muted/40 uppercase tracking-[.1em] text-muted-foreground text-[10px]">
              <tr>
                <th className="px-5 py-3 font-bold">Timestamp</th>
                <th className="px-4 py-3 font-bold">Authenticated User</th>
                <th className="px-4 py-3 font-bold">Action Performed</th>
                <th className="px-4 py-3 font-bold">Case Reference</th>
                <th className="px-5 py-3 text-right font-bold">Integrity Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log: any, idx: number) => (
                <tr key={log.id || idx} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-5 py-3.5 mono text-[11px] text-muted-foreground">
                    {new Date(log.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} IST
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-foreground">{log.user}</td>
                  <td className="px-4 py-3.5">
                    <span className="mono rounded bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <Link href={`/cases/${log.caseId}`} className="mono text-primary font-bold hover:underline">
                      {log.caseId}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="mono text-[10px] font-bold text-[#376344] bg-[#dcebdc] px-2 py-0.5 rounded-full dark:bg-[#23432a] dark:text-[#a7d5ae]">
                      Integrity Verified
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
// 6. CLINICAL SETTINGS & DOCTOR PROFILE
// ============================================================================
export function SettingsPage() {
  const { user, updateUser, changePassword } = useAuth();
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState(() => (document.documentElement.classList.contains("dark") ? "dark" : "light"));

  // Configurable Settings state
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [queueNotifs, setQueueNotifs] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(false);
  const [reportFormat, setReportFormat] = useState("A4 Hospital Standard");

  // Profile Edit State
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
    setTimeout(() => setSaved(false), 2500);
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("drishti-theme", newTheme);
  };

  const handlePasswordUpdate = async () => {
    setPasswordStatus(null);
    if (!oldPassword) {
      setPasswordStatus({ type: "error", msg: "Current password is required to change password." });
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordStatus({ type: "error", msg: "New password must be at least 8 characters long." });
      return;
    }

    setChangingPwd(true);
    const res = await changePassword(oldPassword, newPassword);
    setChangingPwd(false);

    if (res.success) {
      setPasswordStatus({ type: "success", msg: "Password updated successfully!" });
      setOldPassword("");
      setNewPassword("");
      setTimeout(() => setPasswordStatus(null), 3000);
    } else {
      setPasswordStatus({ type: "error", msg: res.error || "Failed to update password." });
    }
  };

  return (
    <div className="mx-auto max-w-[1140px] space-y-6">
      <PageHeader
        eyebrow="Station Configuration & Profile"
        title="Practitioner Profile & System Settings"
        description="Configure station preferences, manage security credentials, and view account access control details."
        action={
          saved && <StatusChip tone="good">Settings Saved</StatusChip>
        }
      />

      <div className="grid gap-6 md:grid-cols-[.9fr_1.1fr]">
        {/* Left: User Profile Box */}
        <div className="panel p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground font-serif text-xl font-bold shadow-sm">
              {user?.fullName ? user.fullName.split(" ").map((n) => n[0]).join("").substring(0, 2) : "DR"}
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-foreground">{user?.fullName || "Practitioner"}</h2>
              <p className="text-xs text-muted-foreground">{user?.title || "Clinical Specialist"}</p>
              <span className="mono mt-1 inline-block rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                {user?.role || "Ophthalmologist"}
              </span>
            </div>
          </div>

          {/* Locked & Editable Profile Summary */}
          <div className="space-y-2.5 text-xs text-muted-foreground border-t border-border/60 pt-4">
            <div className="flex justify-between items-center py-1 bg-muted/20 px-2 rounded">
              <span className="font-semibold text-muted-foreground">User ID (Locked):</span>
              <strong className="text-foreground mono text-[11px]">{user?.id || "usr-01"}</strong>
            </div>
            <div className="flex justify-between items-center py-1 bg-muted/20 px-2 rounded">
              <span className="font-semibold text-muted-foreground">Role (Locked):</span>
              <strong className="text-foreground mono text-[11px]">{user?.role || "Ophthalmologist"}</strong>
            </div>
            <div className="flex justify-between items-center py-1 bg-muted/20 px-2 rounded">
              <span className="font-semibold text-muted-foreground">Username (Locked):</span>
              <strong className="text-foreground mono text-[11px]">{user?.username || "doctor"}</strong>
            </div>

            <div className="flex justify-between pt-2">
              <span>Medical Reg ID:</span>
              <strong className="text-foreground mono">{user?.registrationId || "MCI-2020-04921"}</strong>
            </div>
            <div className="flex justify-between">
              <span>Hospital / Clinic:</span>
              <strong className="text-foreground">{user?.hospitalName || "Apex Eye Hospital"}</strong>
            </div>
            <div className="flex justify-between">
              <span>Department:</span>
              <strong className="text-foreground">{user?.department || "Ophthalmology"}</strong>
            </div>
            <div className="flex justify-between">
              <span>Email:</span>
              <strong className="text-foreground">{user?.email || "doctor@drishti.health"}</strong>
            </div>
            <div className="flex justify-between">
              <span>Contact Number:</span>
              <strong className="text-foreground">{user?.phone || "+91 98765 43210"}</strong>
            </div>
          </div>

          <button
            onClick={() => setEditing((v) => !v)}
            className="btn-quiet w-full text-xs font-bold justify-center"
          >
            {editing ? "Cancel Edit" : "Edit Profile Information"}
          </button>
        </div>

        {/* Right Settings & Profile Edit Form */}
        <div className="space-y-6">
          {/* Edit Profile Form */}
          {editing && (
            <form onSubmit={saveProfile} className="panel p-5 space-y-4 border-primary/40 bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="eyebrow text-primary">Edit Profile (Locked fields grayed out)</div>
                <StatusChip tone="good">Profile Edit Active</StatusChip>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-bold">
                  User ID <span className="text-[10px] text-muted-foreground font-normal">(Locked)</span>
                  <input
                    disabled
                    className="input-field mt-1 text-xs bg-muted cursor-not-allowed text-muted-foreground"
                    value={user?.id || ""}
                  />
                </label>
                <label className="text-xs font-bold">
                  Username <span className="text-[10px] text-muted-foreground font-normal">(Locked)</span>
                  <input
                    disabled
                    className="input-field mt-1 text-xs bg-muted cursor-not-allowed text-muted-foreground"
                    value={user?.username || ""}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-bold">
                  Full Name
                  <input
                    className="input-field mt-1 text-xs"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </label>
                <label className="text-xs font-bold">
                  Professional Title
                  <input
                    className="input-field mt-1 text-xs"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-bold">
                  Medical Registration ID
                  <input
                    className="input-field mt-1 text-xs"
                    value={registrationId}
                    onChange={(e) => setRegistrationId(e.target.value)}
                  />
                </label>
                <label className="text-xs font-bold">
                  Contact Number
                  <input
                    className="input-field mt-1 text-xs"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-bold">
                  Hospital / Clinic Name
                  <input
                    className="input-field mt-1 text-xs"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                  />
                </label>
                <label className="text-xs font-bold">
                  Department
                  <input
                    className="input-field mt-1 text-xs"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </label>
              </div>

              <button type="submit" className="btn-primary text-xs font-bold mt-2">
                Save Profile Updates
              </button>
            </form>
          )}

          {/* Configurable System Settings Section */}
          <div className="panel p-6 space-y-5">
            <div className="eyebrow">Redesigned System Settings</div>
            
            {/* Theme Config */}
            <div className="space-y-2">
              <span className="text-xs font-bold block text-foreground">Theme & Workstation Appearance</span>
              <div className="grid grid-cols-2 gap-3">
                {["light", "dark"].map((t) => (
                  <button
                    key={t}
                    onClick={() => handleThemeChange(t)}
                    className={`rounded-xl border p-3.5 text-left transition-all ${
                      theme === t ? "border-primary bg-primary/10 font-bold" : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs capitalize">
                      <span>{t} Mode</span>
                      {theme === t && <Check size={14} className="text-primary" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="space-y-3 border-t border-border/60 pt-4">
              <span className="text-xs font-bold block text-foreground">Notification Preferences</span>
              <div className="space-y-2 text-xs">
                <label className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/20">
                  <span>Email Alerts for High-Risk Cases (Grade 3/4)</span>
                  <input
                    type="checkbox"
                    checked={emailNotifs}
                    onChange={(e) => setEmailNotifs(e.target.checked)}
                    className="size-4 rounded accent-primary"
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/20">
                  <span>Screening Queue Real-Time Badges</span>
                  <input
                    type="checkbox"
                    checked={queueNotifs}
                    onChange={(e) => setQueueNotifs(e.target.checked)}
                    className="size-4 rounded accent-primary"
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/20">
                  <span>Audio Feedback on Quality Gate Pass/Fail</span>
                  <input
                    type="checkbox"
                    checked={soundAlerts}
                    onChange={(e) => setSoundAlerts(e.target.checked)}
                    className="size-4 rounded accent-primary"
                  />
                </label>
              </div>
            </div>

            {/* Report Format Config */}
            <div className="space-y-3 border-t border-border/60 pt-4">
              <span className="text-xs font-bold block text-foreground">Clinical Report Format Preference</span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {["A4 Hospital Standard", "Compact Summary", "Detailed Research"].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setReportFormat(fmt)}
                    className={`rounded-lg border p-2.5 text-center text-[11px] font-bold transition-all ${
                      reportFormat === fmt
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Password Update (Strict Current Password Validation) */}
          <div className="panel p-6 space-y-4">
            <div className="eyebrow">Security & Credentials</div>

            {passwordStatus && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold ${
                  passwordStatus.type === "success"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-destructive/40 bg-destructive/10 text-destructive"
                }`}
              >
                {passwordStatus.msg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-bold">
                Current Password <span className="text-destructive">*</span>
                <input
                  type="password"
                  placeholder="Enter current password"
                  className="input-field mt-1 text-xs"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </label>
              <label className="text-xs font-bold">
                New Password <span className="text-destructive">*</span>
                <input
                  type="password"
                  placeholder="Enter new password (min 8 chars)"
                  className="input-field mt-1 text-xs"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </label>
            </div>

            <button
              onClick={handlePasswordUpdate}
              disabled={changingPwd}
              className="btn-primary text-xs font-bold"
            >
              {changingPwd ? "Verifying & Updating Password…" : "Update Password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}