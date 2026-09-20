import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  FileCheck,
} from "lucide-react";
import { useGetCase } from "@workspace/api-client-react";
import { demoAnalysis, demoAnalysisByGrade, demoCases, sampleRetinaPresets, type DemoAnalysis, type LesionItem } from "@/lib/demo-data";
import { ErrorState, LoadingState, PageHeader, StatusChip } from "@/components/shell";

export default function AnalysisWorkstation() {
  const params = useParams<{ caseId: string }>();
  const id = params.caseId ?? demoCases[0].caseId;
  const query = useGetCase(id);

  const serverData = query.data as (any & { analysis?: DemoAnalysis }) | undefined;
  const demoFallback = demoCases.find((c) => c.caseId === id) || demoCases[0];
  const caseItem = serverData && (serverData.caseId === id || serverData.id === id)
    ? { ...demoFallback, ...serverData }
    : (demoCases.find((c) => c.caseId === id) || demoCases[0]);

  const rawAnalysis: DemoAnalysis | undefined = serverData?.analysis;
  const fallbackAnalysis = demoAnalysisByGrade[caseItem.aiGrade ?? caseItem.finalGrade ?? 0] || demoAnalysis;

  const defaultEvidence = [
    "Retinal vascular density evaluated across macular and peripapillary zones",
    "Optic disc and foveal landmarks identified",
    caseItem.referable
      ? "Microvascular lesion candidates detected: Refer for ophthalmologist review"
      : "No sight-threatening diabetic retinopathy lesions detected",
  ];

  const analysis: DemoAnalysis = {
    ...(rawAnalysis || fallbackAnalysis),
    evidence: (rawAnalysis?.evidence && rawAnalysis.evidence.length > 0)
      ? rawAnalysis.evidence
      : (fallbackAnalysis.evidence && fallbackAnalysis.evidence.length > 0)
      ? fallbackAnalysis.evidence
      : defaultEvidence,
  };

  // Visualizer controls - DEFAULT TO "Original" as requested
  const [activeLayer, setActiveLayer] = useState<"Original" | "Enhanced" | "Grad-CAM" | "Vessels" | "Lesions">("Original");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [layerOpacity, setLayerOpacity] = useState(85);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedLesion, setSelectedLesion] = useState<LesionItem | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fullscreen Pan State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const visualizerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      setIsFullscreen(isFull);
      if (!isFull) {
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!visualizerRef.current) return;
    if (!document.fullscreenElement) {
      if (visualizerRef.current.requestFullscreen) {
        visualizerRef.current.requestFullscreen().catch(() => setIsFullscreen(!isFullscreen));
      } else {
        setIsFullscreen(!isFullscreen);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => setIsFullscreen(false));
      } else {
        setIsFullscreen(false);
      }
    }
  };

  const handleZoom = (delta: number) => {
    setZoomLevel((z) => Math.min(3.5, Math.max(0.8, Number((z + delta).toFixed(2)))));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setSelectedLesion(null);
  };

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!isFullscreen) return;
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
      setZoomLevel((z) => Math.min(3.5, Math.max(0.8, Number((z + zoomDelta).toFixed(2)))));
    },
    [isFullscreen]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isFullscreen || e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isFullscreen || !isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    if (isFullscreen) setIsDragging(false);
  };

  const handleLesionSelect = (lesion: LesionItem) => {
    setSelectedLesion(lesion);
    if (activeLayer !== "Lesions") {
      setActiveLayer("Lesions");
    }
  };

  const resolveFundusSource = (imgSrc?: string, grade: number = 0): string => {
    if (!imgSrc) return sampleRetinaPresets[Math.min(4, Math.max(0, grade))]?.thumbnail || "";
    if (imgSrc.startsWith("data:image") || imgSrc.startsWith("http") || imgSrc.startsWith("/")) {
      return imgSrc;
    }
    const foundPreset = sampleRetinaPresets.find((p) => p.id === imgSrc || imgSrc.includes(p.id));
    if (foundPreset) return foundPreset.thumbnail;
    return sampleRetinaPresets[Math.min(4, Math.max(0, grade))]?.thumbnail || "";
  };

  const baseImg =
    analysis.images?.original
      ? `data:image/png;base64,${analysis.images.original}`
      : analysis.images?.enhanced
      ? `data:image/png;base64,${analysis.images.enhanced}`
      : resolveFundusSource(caseItem.imageUrl, caseItem.aiGrade ?? analysis.grade);

  const activeOverlayImg =
    activeLayer === "Enhanced" && analysis.images?.enhanced
      ? `data:image/png;base64,${analysis.images.enhanced}`
      : activeLayer === "Grad-CAM" && analysis.images?.gradcam_overlay
      ? `data:image/png;base64,${analysis.images.gradcam_overlay}`
      : activeLayer === "Vessels" && analysis.images?.vessel_overlay
      ? `data:image/png;base64,${analysis.images.vessel_overlay}`
      : activeLayer === "Lesions" && analysis.images?.lesion_overlay
      ? `data:image/png;base64,${analysis.images.lesion_overlay}`
      : null;

  return (
    <div className="space-y-6">
      {/* Patient Context Bar */}
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
          <span className="text-muted-foreground">
            Age: {caseItem.age}y · {caseItem.diabetesType || "Type 2"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="mono text-xs text-muted-foreground">Case: {id}</span>
          <StatusChip
            tone={
              analysis.quality?.status === "GOOD"
                ? "good"
                : analysis.quality?.status === "BORDERLINE"
                ? "warn"
                : "danger"
            }
          >
            Quality: {analysis.quality?.status || "GOOD"} ({analysis.quality?.score ?? 92}/100)
          </StatusChip>
        </div>
      </div>

      <PageHeader
        eyebrow="Primary Clinical Evidence Review"
        title="Retinal Analysis"
        description="Inspect retinal fundus layers, Grad-CAM visual evidence heatmaps, and focal lesion candidates."
        action={
          <div className="flex items-center gap-2.5">
            <Link href="/cases" className="btn-quiet" data-testid="link-back-cases">
              <ArrowLeft size={14} /> Back to cases
            </Link>
            <Link
              href={`/review/${id}`}
              className="btn-primary"
              data-testid="link-open-review"
            >
              Continue to clinical review <ArrowRight size={14} />
            </Link>
          </div>
        }
      />

      {query.isLoading && !query.data ? (
        <LoadingState label="Loading retinal analysis…" />
      ) : (
        <>
          {query.isError && (
            <div className="mb-4">
              <ErrorState retry={() => query.refetch()} />
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
            {/* Left: Retinal Image Viewport */}
            <div className="space-y-4">
              <div
                ref={visualizerRef}
                className={`panel flex flex-col overflow-hidden bg-card ${
                  isFullscreen ? "fixed inset-0 z-50 rounded-none h-screen w-screen p-4 bg-background" : ""
                }`}
              >
                {/* Viewport Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 border-b border-border/70 bg-muted/20">
                  {/* Layer Tabs: Default Original */}
                  <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-md">
                    {(["Original", "Enhanced", "Grad-CAM", "Vessels", "Lesions"] as const).map((layer) => (
                      <button
                        key={layer}
                        type="button"
                        onClick={() => setActiveLayer(layer)}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                          activeLayer === layer
                            ? "bg-card text-primary shadow-2xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        data-testid={`button-layer-${layer.toLowerCase()}`}
                      >
                        {layer}
                      </button>
                    ))}
                  </div>

                  {/* Zoom & Fullscreen Controls */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced((v) => !v)}
                      className={`btn-quiet !p-1.5 text-xs ${showAdvanced ? "!bg-muted font-bold" : ""}`}
                      title="Advanced visualization blending"
                    >
                      <Sliders size={14} />
                    </button>
                    {isFullscreen && (
                      <>
                        <button
                          type="button"
                          className="btn-quiet !p-1.5"
                          onClick={() => handleZoom(-0.25)}
                          title="Zoom out"
                        >
                          <ZoomOut size={14} />
                        </button>
                        <span className="mono text-xs px-1 text-muted-foreground font-semibold">
                          {Math.round(zoomLevel * 100)}%
                        </span>
                        <button
                          type="button"
                          className="btn-quiet !p-1.5"
                          onClick={() => handleZoom(0.25)}
                          title="Zoom in"
                        >
                          <ZoomIn size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-quiet !p-1.5"
                          onClick={handleResetZoom}
                          title="Reset view"
                        >
                          <RotateCcw size={14} />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="btn-quiet !p-1.5"
                      onClick={toggleFullscreen}
                      title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                      data-testid="button-toggle-fullscreen"
                    >
                      {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Advanced Visualization Blending Slider */}
                {showAdvanced && (
                  <div className="flex items-center justify-between border-b border-border/50 px-4 py-2 bg-muted/10 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium">Layer Opacity:</span>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={layerOpacity}
                        onChange={(e) => setLayerOpacity(Number(e.target.value))}
                        className="h-1.5 w-32 accent-primary cursor-pointer"
                      />
                      <span className="mono text-[11px] font-semibold text-foreground">{layerOpacity}%</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">Adjust evidence layer blending</span>
                  </div>
                )}

                {/* Retinal Canvas Display */}
                <div
                  onWheel={isFullscreen ? handleWheel : undefined}
                  onMouseDown={isFullscreen ? handleMouseDown : undefined}
                  onMouseMove={isFullscreen ? handleMouseMove : undefined}
                  onMouseUp={isFullscreen ? handleMouseUp : undefined}
                  onMouseLeave={isFullscreen ? handleMouseUp : undefined}
                  className={`relative flex items-center justify-center overflow-hidden bg-slate-950 p-4 select-none ${
                    isFullscreen ? (isDragging ? "cursor-grabbing h-full" : "cursor-grab h-full") : "min-h-[380px] max-h-[460px]"
                  }`}
                >
                  <div
                    className="relative aspect-square w-full max-w-[420px] overflow-hidden rounded-full border-4 border-slate-800 shadow-xl bg-black"
                    style={{
                      transform: isFullscreen
                        ? `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`
                        : "scale(1)",
                    }}
                  >
                    {/* Base Fundus Image */}
                    {baseImg ? (
                      <img
                        src={baseImg}
                        alt="Fundus scan"
                        className="absolute inset-0 size-full object-cover pointer-events-none select-none"
                        draggable={false}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-slate-900" />
                    )}

                    {/* Active Layer Overlay */}
                    {activeOverlayImg && activeLayer !== "Original" && (
                      <img
                        src={activeOverlayImg}
                        alt={`${activeLayer} layer`}
                        className="absolute inset-0 size-full object-cover pointer-events-none select-none transition-opacity duration-150"
                        style={{ opacity: Math.max(0.1, layerOpacity / 100) }}
                        draggable={false}
                      />
                    )}

                    {/* Fallback Layer Overlays */}
                    {!activeOverlayImg && activeLayer !== "Original" && (
                      <>
                        {activeLayer === "Enhanced" && (
                          <div
                            className="absolute inset-0 bg-teal-500/15 mix-blend-overlay pointer-events-none"
                            style={{ opacity: layerOpacity / 100 }}
                          />
                        )}
                        {activeLayer === "Grad-CAM" && (
                          <div
                            className="absolute inset-0 pointer-events-none mix-blend-screen"
                            style={{
                              opacity: layerOpacity / 100,
                              background:
                                analysis.grade >= 2
                                  ? "radial-gradient(circle at 62% 44%, rgba(239, 68, 68, 0.55) 0%, rgba(245, 158, 11, 0.3) 30%, transparent 65%)"
                                  : "radial-gradient(circle at 60% 42%, rgba(245, 158, 11, 0.35) 0%, transparent 50%)",
                            }}
                          />
                        )}
                      </>
                    )}

                    {/* Interactive Lesion Candidates (Visible in Lesions layer) */}
                    {activeLayer === "Lesions" &&
                      analysis.lesions.map((lesion, idx) => {
                        const isSelected = selectedLesion?.type === lesion.type && selectedLesion?.x === lesion.x;
                        return (
                          <button
                            key={`${lesion.type}-${idx}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLesionSelect(lesion);
                            }}
                            className={`absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all ${
                              isSelected
                                ? "scale-130 border-white bg-white/80 ring-2 ring-primary shadow-md z-10"
                                : "border-amber-400 bg-amber-400/40 hover:scale-120"
                            }`}
                            style={{
                              left: `${lesion.x}%`,
                              top: `${lesion.y}%`,
                            }}
                            title={`${lesion.type} (${Math.round(lesion.confidence * 100)}%)`}
                          >
                            <span className="sr-only">{lesion.type}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Viewport Footer */}
                <div className="flex items-center justify-between p-3 border-t border-border/60 text-xs text-muted-foreground bg-card">
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-amber-400" /> Lesion candidate
                    </span>
                    <span>FOV: 45° Posterior Pole</span>
                  </div>
                  <span className="mono text-[11px] text-muted-foreground">
                    {analysis.lesions.length} lesion candidates detected
                  </span>
                </div>
              </div>

              {/* Selected Lesion Candidate Details */}
              {selectedLesion && (
                <div className="panel p-3.5 bg-teal-50/40 border-teal-200/80 dark:bg-teal-950/20 dark:border-teal-900/40 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-foreground">
                    <span className="flex items-center gap-1.5">
                      <Crosshair size={14} className="text-primary" /> {selectedLesion.type} Candidate
                    </span>
                    <span className="mono text-primary">{Math.round(selectedLesion.confidence * 100)}% Confidence</span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    {selectedLesion.description || "Localized microvascular change identified for clinician inspection."}
                  </p>
                </div>
              )}
            </div>

            {/* Right: AI Screening Result & Visual Evidence Panel */}
            <div className="space-y-4">
              {/* Primary AI Result Card */}
              <div className="panel p-5 space-y-4">
                <div className="flex items-start justify-between border-b border-border/60 pb-3">
                  <div>
                    <span className="eyebrow text-[10px]">AI Screening Result</span>
                    <h2 className="text-lg font-bold text-foreground mt-0.5">
                      Grade {analysis.grade} — {analysis.gradeLabel}
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Model Confidence</span>
                    <span className="text-xl font-bold text-primary">
                      {Math.round(analysis.confidence * 100)}%
                    </span>
                  </div>
                </div>

                {/* Recommendation */}
                {analysis.referable ? (
                  <div className="rounded-md border border-red-200/80 bg-red-50/60 p-3 text-xs dark:bg-red-950/30 dark:border-red-900/50">
                    <div className="font-semibold text-red-800 dark:text-red-300 flex items-center gap-1.5">
                      <AlertTriangle size={14} /> Screening Recommendation: Refer for ophthalmologist review
                    </div>
                    <p className="text-red-700/80 dark:text-red-300/80 text-[11px] mt-0.5 leading-relaxed">
                      Findings consistent with Grade 2+ referable diabetic retinopathy. Specialist clinical assessment recommended.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border border-emerald-200/80 bg-emerald-50/60 p-3 text-xs dark:bg-emerald-950/30 dark:border-emerald-900/50">
                    <div className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> Screening Recommendation: Routine screening
                    </div>
                    <p className="text-emerald-700/80 dark:text-emerald-300/80 text-[11px] mt-0.5 leading-relaxed">
                      No referable diabetic retinopathy detected. Standard annual screening interval recommended.
                    </p>
                  </div>
                )}

                {/* Visual Evidence Summary */}
                <div className="space-y-2 pt-1">
                  <span className="eyebrow text-[10px]">Visual Evidence</span>
                  <div className="space-y-1.5">
                    {analysis.evidence.map((ev, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground p-2 rounded bg-muted/20 border border-border/50">
                        <span className="mono text-[10px] font-bold text-primary shrink-0 mt-0.5">
                          0{i + 1}
                        </span>
                        <span className="text-[11px] leading-relaxed text-foreground/90">{ev}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Class Probabilities Breakdown */}
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <span className="eyebrow text-[10px]">Classification Distribution</span>
                  {(() => {
                    const probs = analysis.probabilities || {
                      "0": 0.05,
                      "1": 0.10,
                      "2": 0.75,
                      "3": 0.07,
                      "4": 0.03,
                    };
                    const labels: Record<string, string> = {
                      "0": "Grade 0: No DR",
                      "1": "Grade 1: Mild NPDR",
                      "2": "Grade 2: Moderate NPDR",
                      "3": "Grade 3: Severe NPDR",
                      "4": "Grade 4: Proliferative DR",
                    };
                    return Object.entries(probs).map(([key, val]) => {
                      const isTarget = key === String(analysis.grade);
                      return (
                        <div key={key} className="flex items-center gap-2 text-xs">
                          <span className={`w-36 truncate text-[11px] ${isTarget ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                            {labels[key] || `Grade ${key}`}
                          </span>
                          <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isTarget ? "bg-primary" : "bg-primary/30"}`}
                              style={{ width: `${Math.round(Number(val) * 100)}%` }}
                            />
                          </div>
                          <span className="mono w-8 text-right text-[10px] text-muted-foreground">
                            {Math.round(Number(val) * 100)}%
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Detected Lesion Candidates List */}
              <div className="panel p-4 space-y-2.5">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span className="eyebrow text-[10px]">Detected Lesion Candidates</span>
                  <span className="text-[10px] text-muted-foreground">Click to locate</span>
                </div>

                {analysis.lesions.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No localized lesion candidates identified.</p>
                ) : (
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {analysis.lesions.map((lesion, idx) => (
                      <button
                        key={`${lesion.type}-${idx}`}
                        type="button"
                        onClick={() => handleLesionSelect(lesion)}
                        className={`w-full flex items-center justify-between p-2 rounded text-xs transition-colors border ${
                          selectedLesion?.type === lesion.type && selectedLesion?.x === lesion.x
                            ? "border-primary bg-primary/10 font-bold"
                            : "border-border/60 hover:bg-muted/30"
                        }`}
                      >
                        <span className="text-foreground text-[11px]">{lesion.type}</span>
                        <span className="mono text-[10px] text-primary font-semibold">
                          {Math.round(lesion.confidence * 100)}%
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <Link
                href={`/review/${id}`}
                className="btn-primary w-full justify-center !py-2.5 text-xs font-semibold"
                data-testid="button-open-review-cta"
              >
                Continue to clinical review <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}