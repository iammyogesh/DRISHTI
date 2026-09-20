import { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Flag,
  Save,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Sparkles,
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

  const [grade, setGrade] = useState<number>(caseItem.finalGrade ?? caseItem.aiGrade);
  const [overrideReason, setOverrideReason] = useState("");
  const [notes, setNotes] = useState(
    caseItem.reviewerNotes ||
      (caseItem.aiGrade >= 2
        ? "Findings consistent with referable diabetic retinopathy. Recommend 3–6 month ophthalmic evaluation, glycemic control, and tele-consultation."
        : "Retinal vasculature within normal limits. Advised annual diabetic eye screening and routine metabolic management.")
  );

  const doctorName = user?.fullName || "Consultant Ophthalmologist";
  const doctorReg = user?.registrationId || "MCI-2022-84920";

  const isOverride = grade !== analysis.grade;

  const submit = () => {
    review.mutate(
      {
        caseId: id,
        data: {
          finalGrade: grade,
          notes: `${notes}${isOverride && overrideReason ? ` | Doctor Override Rationale: ${overrideReason}` : ""}`,
        },
      },
      {
        onSuccess: () => setLocation(`/cases/${id}`),
        onError: () => setLocation(`/cases/${id}`),
      }
    );
  };

  const [selectedLayer, setSelectedLayer] = useState<"Original" | "CLAHE" | "Grad-CAM" | "Vessels" | "Lesions">("Original");

  // Determine actual image source from uploaded base64 / analysis overlays / case record
  const originalImage =
    caseItem.imageUrl && caseItem.imageUrl.startsWith("data:image")
      ? caseItem.imageUrl
      : analysis.images?.original
      ? `data:image/png;base64,${analysis.images.original}`
      : analysis.images?.enhanced
      ? `data:image/png;base64,${analysis.images.enhanced}`
      : caseItem.imageUrl || null;

  const claheImage =
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
    selectedLayer === "CLAHE"
      ? claheImage
      : selectedLayer === "Grad-CAM"
      ? gradcamImage
      : selectedLayer === "Vessels"
      ? vesselsImage
      : selectedLayer === "Lesions"
      ? lesionImage
      : originalImage;

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        eyebrow={`Ophthalmologist Clinical Review · Case ${id}`}
        title="Diagnostic Review & Clinical Sign-Off"
        description="Review AI multi-class findings, Grad-CAM evidence, and retinal images. Enter your final clinical assessment and sign the official diagnostic report."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/analysis/${id}`}
              className="btn-quiet"
              data-testid="link-review-analysis"
            >
              <ArrowLeft size={14} /> Back to Workstation
            </Link>
            <button
              className="btn-primary"
              onClick={submit}
              disabled={review.isPending || !notes.trim()}
              data-testid="button-save-review"
            >
              <Save size={15} /> {review.isPending ? "Signing…" : "Sign & Finalize Review"}
            </button>
          </div>
        }
      />

      {query.isLoading && !query.data ? (
        <LoadingState label="Preparing review workspace…" />
      ) : (
        <>
          {query.isError && (
            <div className="mb-5">
              <ErrorState retry={() => query.refetch()} />
            </div>
          )}

          {/* Clinical Banner */}
          <div className="mb-6 rounded-2xl border border-[#5c9565]/30 bg-[#dcebdc]/20 p-4">
            <div className="flex items-start gap-3.5">
              <ShieldCheck className="mt-0.5 text-primary" size={22} />
              <div className="text-xs leading-5">
                <strong className="text-sm font-bold text-foreground">
                  Clinical Decision Protocol
                </strong>
                <p className="mt-0.5 text-muted-foreground">
                  AI screening predictions are designed as decision support. Final medical diagnosis, referral routing, and patient management recommendations are determined and signed by the reviewing ophthalmologist.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
            {/* Left: Retinal Scan & Evidence */}
            <section className="panel flex flex-col overflow-hidden">
              <div className="border-b border-border/70 p-5 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="eyebrow">Retinal Scan & Evidence Summary</div>
                  <h2 className="font-serif text-xl font-bold text-foreground mt-0.5">
                    {caseItem.eye} Eye ({caseItem.caseId})
                  </h2>
                </div>
                <StatusChip tone={analysis.referable ? "danger" : "good"}>
                  AI Prediction: Grade {analysis.grade} ({analysis.gradeLabel})
                </StatusChip>
              </div>

              {/* Layer Selection Controls */}
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-2.5 bg-muted/10 text-xs">
                <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Inspect Retinal Layer:</span>
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
                  {(["Original", "CLAHE", "Grad-CAM", "Vessels", "Lesions"] as const).map((layer) => (
                    <button
                      key={layer}
                      type="button"
                      onClick={() => setSelectedLayer(layer)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedLayer === layer
                          ? "bg-card text-primary shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {layer}
                    </button>
                  ))}
                </div>
              </div>

              {/* Retinal Image Frame */}
              <div className="flex flex-1 items-center justify-center bg-[#0c141f] p-6">
                <div className="retina-disc relative aspect-square w-full max-w-[420px] rounded-full border-[10px] border-[#14202e] shadow-2xl overflow-hidden bg-black flex items-center justify-center">
                  {/* Real Image Render */}
                  {displayImgUrl ? (
                    <img
                      src={displayImgUrl}
                      alt="Fundus Retinal Scan"
                      className="size-full object-cover select-none"
                    />
                  ) : (
                    <div className="size-full bg-gradient-to-tr from-amber-950/80 via-red-950/60 to-orange-950/90" />
                  )}

                  {/* Grad-CAM Overlay Blend (if selected layer or fallback) */}
                  {selectedLayer === "Grad-CAM" && !analysis.images?.gradcam_overlay && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          analysis.grade >= 2
                            ? "radial-gradient(circle at 62% 44%, rgba(239, 68, 68, 0.45) 0%, rgba(245, 158, 11, 0.3) 30%, transparent 65%)"
                            : "radial-gradient(circle at 60% 42%, rgba(245, 158, 11, 0.3) 0%, transparent 50%)",
                      }}
                    />
                  )}

                  {/* Lesion Markers */}
                  {(selectedLayer === "Lesions" || selectedLayer === "Original") &&
                    analysis.lesions.map((lesion, idx) => (
                      <span
                        key={idx}
                        className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-400 bg-amber-400/40 shadow-[0_0_8px_rgba(251,191,36,0.8)] pointer-events-none"
                        style={{ left: `${lesion.x}%`, top: `${lesion.y}%` }}
                        title={`${lesion.type} (${Math.round(lesion.confidence * 100)}%)`}
                      />
                    ))}
                </div>
              </div>

              {/* Evidence Signals */}
              <div className="border-t border-border/70 p-5 bg-card">
                <div className="eyebrow mb-2.5">Key AI Retinal Findings</div>
                <div className="space-y-1.5">
                  {analysis.evidence.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="mono text-[10px] text-accent font-bold">0{idx + 1}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Right: Doctor Final Assessment & Notes */}
            <section className="panel flex flex-col p-6 md:p-8">
              <div className="eyebrow">Doctor Final Assessment</div>
              <h2 className="mt-1 font-serif text-2xl font-bold text-foreground">
                Confirm or Modify DR Severity Grade
              </h2>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Select your final clinical grade. The AI suggestion is displayed for reference and will not be overwritten in the record.
              </p>

              {/* Grade Selector */}
              <div className="mt-6 space-y-2.5">
                {gradeLabels.map((label, index) => {
                  const isSelected = grade === index;
                  const isAISuggestion = index === analysis.grade;

                  return (
                    <button
                      key={label}
                      className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-xs"
                          : "border-border hover:bg-muted/40"
                      }`}
                      onClick={() => setGrade(index)}
                      data-testid={`button-grade-${index}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`grid size-7 place-items-center rounded-full border text-xs font-bold ${
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {index}
                        </span>
                        <div>
                          <div className="text-sm font-bold text-foreground">
                            Grade {index}: {label}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {index === 0
                              ? "No DR lesions"
                              : index === 1
                              ? "Microaneurysms only"
                              : index === 2
                              ? "Referable: Microaneurysms, Exudates, Hemorrhages"
                              : index === 3
                              ? "Severe: 4-2-1 rule met / Venous beading"
                              : "Proliferative: Active Neovascularization"}
                          </div>
                        </div>
                      </div>

                      {isAISuggestion && (
                        <span className="mono rounded bg-secondary/30 px-2 py-0.5 text-[10px] font-bold text-foreground">
                          AI RESULT
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Override Rationale (If modified) */}
              {isOverride && (
                <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3.5 text-xs leading-5">
                  <div className="font-bold text-amber-700 dark:text-amber-300">
                    Clinical Override: AI predicted Grade {analysis.grade}, Doctor selected Grade {grade}.
                  </div>
                  <input
                    className="input-field mt-2 text-xs"
                    placeholder="Enter clinical rationale for override (e.g. peripheral lesion verified on high-res inspection)"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    data-testid="input-override-reason"
                  />
                </div>
              )}

              {/* Clinical Recommendations & Notes */}
              <div className="mt-6 space-y-2">
                <label className="text-xs font-bold text-foreground">
                  Ophthalmologist Clinical Findings & Recommendation Plan
                </label>
                <textarea
                  className="input-field min-h-[110px] resize-y text-xs leading-5"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter clinical notes, management advice, and follow-up timeline..."
                  aria-label="Clinical notes"
                  data-testid="textarea-clinical-notes"
                />
              </div>

              {/* Authenticated Doctor Signature Box */}
              <div className="mt-6 rounded-xl border border-border bg-muted/25 p-4 text-xs">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <UserCheck size={16} className="text-primary" />
                  <span>Authenticated Clinician Signature</span>
                </div>
                <div className="mt-2 text-xs">
                  <div className="font-bold text-foreground">{doctorName}</div>
                  <div className="text-muted-foreground text-[11px]">
                    Registration ID: <span className="mono font-semibold">{doctorReg}</span> · {user?.hospitalName || "Apex Eye Care"}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  className="btn-primary flex-1"
                  onClick={submit}
                  disabled={!notes.trim() || review.isPending}
                  data-testid="button-submit-review"
                >
                  <CheckCircle2 size={16} /> Sign & Finalize Clinical Review
                </button>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}