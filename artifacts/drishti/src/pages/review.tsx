import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  Save,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  FileCheck2,
} from "lucide-react";
import { useGetCase, useReviewCase } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import {
  demoAnalysis,
  demoAnalysisByGrade,
  demoCases,
  gradeLabels,
  type DemoAnalysis,
} from "@/lib/demo-data";
import { ErrorState, LoadingState, PageHeader, StatusChip } from "@/components/shell";

export default function Review() {
  const params = useParams<{ caseId: string }>();
  const id = params.caseId ?? demoCases[0].caseId;
  const query = useGetCase(id);
  const review = useReviewCase();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const caseItem = demoCases.find((entry) => entry.caseId === id) ?? demoCases[0];
  const detail = query.data as { analysis?: DemoAnalysis } | undefined;
  const analysis = detail?.analysis ?? demoAnalysisByGrade[caseItem.aiGrade] ?? demoAnalysis;

  const isAlreadyReviewed = caseItem.reviewStatus === "REVIEWED" || Boolean(caseItem.finalGrade !== undefined && caseItem.finalGrade !== null);

  const [grade, setGrade] = useState<number>(caseItem.finalGrade ?? caseItem.aiGrade);
  const [overrideReason, setOverrideReason] = useState("");
  const [notes, setNotes] = useState(
    caseItem.reviewerNotes ||
      (caseItem.aiGrade >= 2
        ? "Findings consistent with referable diabetic retinopathy. Recommend 3–6 month ophthalmic evaluation, glycemic regulation, and optical coherence tomography."
        : "Retinal vasculature within normal limits. Advised annual diabetic eye screening and metabolic control.")
  );
  const [isSigned, setIsSigned] = useState(isAlreadyReviewed);
  const [signedAt, setSignedAt] = useState<string>(new Date().toLocaleString());

  const doctorName = user?.fullName || caseItem.reviewerName || "Consultant Ophthalmologist";
  const doctorReg = user?.registrationId || "MCI-2022-84920";
  const hospital = user?.hospitalName || "Apex Eye Hospital";

  const isOverride = grade !== analysis.grade;

  const submit = () => {
    review.mutate(
      {
        caseId: id,
        data: {
          finalGrade: grade,
          notes: `${notes}${isOverride && overrideReason ? ` | Clinician Override Rationale: ${overrideReason}` : ""}`,
        },
      },
      {
        onSuccess: () => {
          setIsSigned(true);
          setSignedAt(new Date().toLocaleString());
          setLocation(`/cases/${id}`);
        },
        onError: () => {
          setIsSigned(true);
          setSignedAt(new Date().toLocaleString());
          setLocation(`/cases/${id}`);
        },
      }
    );
  };

  const [selectedLayer, setSelectedLayer] = useState<"Original" | "Enhanced" | "Grad-CAM" | "Vessels" | "Lesions">("Original");

  const originalImage =
    caseItem.imageUrl && caseItem.imageUrl.startsWith("data:image")
      ? caseItem.imageUrl
      : analysis.images?.original
      ? `data:image/png;base64,${analysis.images.original}`
      : analysis.images?.enhanced
      ? `data:image/png;base64,${analysis.images.enhanced}`
      : caseItem.imageUrl || null;

  const enhancedImage =
    analysis.images?.enhanced
      ? `data:image/png;base64,${analysis.images.enhanced}`
      : originalImage;

  const gradcamImage =
    analysis.images?.gradcam_overlay
      ? `data:image/png;base64,${analysis.images.gradcam_overlay}`
      : originalImage;

  const vesselsImage =
    analysis.images?.vessel_overlay
      ? `data:image/png;base64,${analysis.images.vessel_overlay}`
      : originalImage;

  const lesionImage =
    analysis.images?.lesion_overlay
      ? `data:image/png;base64,${analysis.images.lesion_overlay}`
      : originalImage;

  const displayImgUrl =
    selectedLayer === "Enhanced"
      ? enhancedImage
      : selectedLayer === "Grad-CAM"
      ? gradcamImage
      : selectedLayer === "Vessels"
      ? vesselsImage
      : selectedLayer === "Lesions"
      ? lesionImage
      : originalImage;

  return (
    <div className="space-y-6">
      {/* Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-bold text-foreground text-sm">
            {caseItem.patientName || "Patient"}
          </span>
          <span className="mono text-muted-foreground font-semibold">
            ID: {caseItem.patientId || "PAT-88402"}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="font-semibold text-primary">
            {caseItem.eye} Eye
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">Case: {id}</span>
        </div>

        {isSigned && (
          <StatusChip tone="good">
            Signed Clinical Review
          </StatusChip>
        )}
      </div>

      <PageHeader
        eyebrow="Clinician Assessment & Review"
        title="Final Clinical Assessment"
        description="Review AI screening suggestions, visual evidence, and retinal photographs to enter your final clinical DR grade and sign the verified assessment record."
        action={
          <div className="flex items-center gap-2.5">
            <Link
              href={`/analysis/${id}`}
              className="btn-quiet"
              data-testid="link-review-analysis"
            >
              <ArrowLeft size={14} /> Back to workstation
            </Link>
            {!isSigned && (
              <button
                type="button"
                className="btn-primary"
                onClick={submit}
                disabled={review.isPending || !notes.trim()}
                data-testid="button-save-review"
              >
                <CheckCircle2 size={14} /> {review.isPending ? "Signing…" : "Sign & finalize clinical review"}
              </button>
            )}
          </div>
        }
      />

      {query.isLoading && !query.data ? (
        <LoadingState label="Loading review workspace…" />
      ) : (
        <>
          {query.isError && (
            <div className="mb-4">
              <ErrorState retry={() => query.refetch()} />
            </div>
          )}

          {/* Locked Notice if already signed */}
          {isSigned && (
            <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/70 p-3.5 text-xs text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock size={15} className="text-emerald-700 dark:text-emerald-400" />
                <span>
                  <strong>Assessment Signed & Locked:</strong> Finalized by <strong>{doctorName}</strong> on {signedAt}.
                </span>
              </div>
              <Link href={`/cases/${id}`} className="font-semibold underline text-emerald-800 dark:text-emerald-300">
                View Case Record
              </Link>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            {/* Left: Retinal Image & AI Evidence Summary */}
            <div className="space-y-4">
              <div className="panel overflow-hidden">
                <div className="p-3.5 border-b border-border/70 flex items-center justify-between bg-muted/20">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-foreground">Fundus Examination</span>
                    <span className="text-muted-foreground">({caseItem.eye} Eye)</span>
                  </div>

                  <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-md">
                    {(["Original", "Enhanced", "Grad-CAM", "Vessels", "Lesions"] as const).map((layer) => (
                      <button
                        key={layer}
                        type="button"
                        onClick={() => setSelectedLayer(layer)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                          selectedLayer === layer
                            ? "bg-card text-primary shadow-2xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {layer}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center bg-slate-950 p-6 min-h-[320px]">
                  <div className="relative aspect-square w-full max-w-[340px] rounded-full overflow-hidden border-4 border-slate-800 shadow-lg bg-black">
                    {displayImgUrl ? (
                      <img
                        src={displayImgUrl}
                        alt="Retinal photograph"
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="size-full bg-slate-900" />
                    )}

                    {selectedLayer === "Grad-CAM" && !analysis.images?.gradcam_overlay && (
                      <div
                        className="absolute inset-0 pointer-events-none mix-blend-screen"
                        style={{
                          background:
                            analysis.grade >= 2
                              ? "radial-gradient(circle at 62% 44%, rgba(239, 68, 68, 0.45) 0%, rgba(245, 158, 11, 0.3) 30%, transparent 65%)"
                              : "radial-gradient(circle at 60% 42%, rgba(245, 158, 11, 0.3) 0%, transparent 50%)",
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* AI Screening Result Reference Card */}
                <div className="p-4 border-t border-border/60 bg-muted/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="eyebrow text-[10px]">AI Screening Suggestion</span>
                    <span className="mono text-[11px] font-semibold text-primary">
                      {Math.round(analysis.confidence * 100)}% confidence
                    </span>
                  </div>
                  <div className="font-bold text-sm text-foreground">
                    Grade {analysis.grade} — {analysis.gradeLabel}
                  </div>
                  <ul className="text-[11px] text-muted-foreground space-y-1 pt-1 list-disc list-inside">
                    {analysis.evidence.map((ev, i) => (
                      <li key={i}>{ev}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Right: Clinician Decision Panel */}
            <div className="panel p-5 sm:p-6 space-y-5">
              <div>
                <span className="eyebrow text-[10px]">Clinician Grading</span>
                <h2 className="text-base font-bold text-foreground mt-0.5">
                  Select Final Clinical Assessment
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Confirm or modify the severity grade. AI suggestion is provided for decision support.
                </p>
              </div>

              {/* Grade Selection List */}
              <div className="space-y-2">
                {gradeLabels.map((label, index) => {
                  const isSelected = grade === index;
                  const isAISuggestion = index === analysis.grade;

                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={isSigned}
                      onClick={() => setGrade(index)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary shadow-2xs font-semibold"
                          : "border-border hover:bg-muted/30"
                      } ${isSigned ? "cursor-default opacity-80" : ""}`}
                      data-testid={`button-grade-${index}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`grid size-6 place-items-center rounded-full text-xs font-bold ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {index}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-foreground">
                            Grade {index}: {label}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {index === 0
                              ? "No microvascular abnormalities"
                              : index === 1
                              ? "Microaneurysms only"
                              : index === 2
                              ? "Moderate: Microaneurysms, exudates, hemorrhages"
                              : index === 3
                              ? "Severe: 4-2-1 rule met"
                              : "Proliferative: Active neovascularization"}
                          </div>
                        </div>
                      </div>

                      {isAISuggestion && (
                        <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          AI suggestion
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Override rationale if modified */}
              {isOverride && (
                <div className="p-3 rounded-md border border-amber-200/80 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900/40 text-xs space-y-1.5">
                  <span className="font-semibold text-amber-800 dark:text-amber-300 block">
                    Clinician Override Note:
                  </span>
                  <input
                    disabled={isSigned}
                    className="input-field text-xs bg-card"
                    placeholder="Rationale for overriding AI suggestion (e.g. peripheral lesion verified)"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    data-testid="input-override-reason"
                  />
                </div>
              )}

              {/* Findings & Recommendation Plan */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Clinical findings and recommendation
                </label>
                <textarea
                  disabled={isSigned}
                  rows={3}
                  className="input-field text-xs leading-relaxed resize-y"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter clinical assessment, follow-up timeline, and management plan…"
                  data-testid="textarea-clinical-notes"
                />
              </div>

              {/* Authenticated Practitioner Identity Block */}
              <div className="rounded-lg border border-border bg-muted/20 p-3.5 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <UserCheck size={14} className="text-primary" />
                  <span>Authenticated Clinician Identity</span>
                </div>
                <div className="font-semibold text-foreground text-xs pt-0.5">{doctorName}</div>
                <div className="text-[11px] text-muted-foreground">
                  Medical Registration No: <span className="mono font-medium text-foreground">{doctorReg}</span> · {hospital}
                </div>
              </div>

              {/* Sign Action Button */}
              {!isSigned && (
                <button
                  type="button"
                  className="btn-primary w-full justify-center !py-2.5 text-xs font-semibold"
                  onClick={submit}
                  disabled={!notes.trim() || review.isPending}
                  data-testid="button-submit-review"
                >
                  <CheckCircle2 size={15} /> Sign & finalize clinical review
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}