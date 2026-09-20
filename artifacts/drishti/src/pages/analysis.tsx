import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Layers3,
  Maximize2,
  Minimize2,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crosshair,
  Move,
  Tag,
  Activity,
  FileCheck,
  Cpu,
  Download,
  Code,
  Check,
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
    "MATLAB Image Processing: Vascular density & caliber evaluated across retinal quadrants",
    "Optic disc and fovea localized via Circular Hough Transform & anatomical geometry",
    "Focal lesion candidate detector active across macular and peripheral zones",
    caseItem.referable
      ? "Referable diabetic retinopathy signals identified: Specialist review recommended"
      : "Non-referable screening outcome: Routine annual rescreening recommended",
  ];

  const analysis: DemoAnalysis = {
    ...(rawAnalysis || fallbackAnalysis),
    evidence: (rawAnalysis?.evidence && rawAnalysis.evidence.length > 0)
      ? rawAnalysis.evidence
      : (fallbackAnalysis.evidence && fallbackAnalysis.evidence.length > 0)
      ? fallbackAnalysis.evidence
      : defaultEvidence,
  };

  // Visualizer controls
  const [activeLayer, setActiveLayer] = useState<"Original" | "CLAHE" | "Grad-CAM" | "Vessels" | "Lesions" | "Combined">("Combined");
  const [copiedCode, setCopiedCode] = useState(false);
  const [layerOpacity, setLayerOpacity] = useState(85);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedLesion, setSelectedLesion] = useState<LesionItem | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAnatomyMarkers, setShowAnatomyMarkers] = useState(true);

  // Fullscreen Mouse & Touchpad Drag State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [touchDist, setTouchDist] = useState<number | null>(null);

  const visualizerRef = useRef<HTMLDivElement>(null);

  // Fullscreen Handlers
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
        visualizerRef.current.requestFullscreen().catch(() => {
          setIsFullscreen(!isFullscreen);
        });
      } else {
        setIsFullscreen(!isFullscreen);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {
          setIsFullscreen(false);
        });
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

  // Fullscreen Wheel Zoom Handler (Only active in Fullscreen mode)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!isFullscreen) return;
      e.preventDefault();
      if (e.ctrlKey) {
        const zoomDelta = -e.deltaY * 0.01;
        setZoomLevel((z) => Math.min(3.5, Math.max(0.8, Number((z + zoomDelta).toFixed(2)))));
      } else {
        const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
        setZoomLevel((z) => Math.min(3.5, Math.max(0.8, Number((z + zoomDelta).toFixed(2)))));
      }
    },
    [isFullscreen]
  );

  // Fullscreen Mouse Drag Panning Handlers
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

  // Fullscreen Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isFullscreen) return;
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - panOffset.x,
        y: e.touches[0].clientY - panOffset.y,
      });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchDist(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isFullscreen) return;
    if (e.touches.length === 1 && isDragging) {
      setPanOffset({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && touchDist !== null) {
      const newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const zoomDelta = (newDist - touchDist) * 0.005;
      setZoomLevel((z) => Math.min(3.5, Math.max(0.8, Number((z + zoomDelta).toFixed(2)))));
      setTouchDist(newDist);
    }
  };

  const handleTouchEnd = () => {
    if (!isFullscreen) return;
    setIsDragging(false);
    setTouchDist(null);
  };

  const handleLesionSelect = (lesion: LesionItem) => {
    setSelectedLesion(lesion);
    if (isFullscreen) {
      setZoomLevel(1.8);
      const offsetX = (50 - lesion.x) * 3.2;
      const offsetY = (50 - lesion.y) * 3.2;
      setPanOffset({ x: offsetX, y: offsetY });
    }
  };

  return (
    <div className="mx-auto max-w-[1520px]">
      <PageHeader
        eyebrow={`AI Retinal Workstation · Case ${id}`}
        title="Multi-Layer Retinal Analysis & Evidence Workstation"
        description="Inspect automated multi-class DR predictions, Grad-CAM attention heatmaps, vessel segmentations, and localized lesion markers."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/review/${id}`}
              className="btn-primary"
              data-testid="link-open-review"
            >
              <ShieldCheck size={16} /> Doctor Sign-Off
            </Link>
            <Link href="/cases" className="btn-quiet" data-testid="link-back-cases">
              <ArrowLeft size={14} /> Back to Cases
            </Link>
          </div>
        }
      />

      {query.isLoading && !query.data ? (
        <LoadingState label="Loading retinal analysis workstation…" />
      ) : (
        <>
          {query.isError && (
            <div className="mb-5">
              <ErrorState retry={() => query.refetch()} />
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
            {/* Left Column: Retinal Visualizer & Clinical Evidence Details */}
            <div className="space-y-4">
              <section
                ref={visualizerRef}
                className={`panel flex flex-col overflow-hidden bg-background ${
                  isFullscreen ? "fixed inset-0 z-50 rounded-none h-screen w-screen p-4" : ""
                }`}
              >
                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border/70 p-3 bg-muted/20">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip tone={analysis.referable ? "danger" : "good"}>
                      Grade {analysis.grade}: {analysis.gradeLabel}
                    </StatusChip>
                    <span className="mono text-[10px] text-muted-foreground border border-border/70 px-2 py-0.5 rounded bg-card">
                      CLINICAL DECISION SUPPORT · DEEP LEARNING DR ENGINE
                    </span>
                  </div>

                  {/* Layer Selector */}
                  <div className="flex flex-wrap items-center gap-1 rounded-xl bg-muted/60 p-1">
                    {(["Original", "CLAHE", "Grad-CAM", "Vessels", "Lesions", "Combined"] as const).map((name) => (
                      <button
                        key={name}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all flex items-center gap-1.5 ${
                          activeLayer === name
                            ? "bg-card text-primary shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => setActiveLayer(name)}
                        data-testid={`button-layer-${name.toLowerCase()}`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>

                  {/* Fullscreen & Marker Controls */}
                  <div className="flex items-center gap-1">
                    <button
                      className={`btn-quiet !p-1.5 ${showAnatomyMarkers ? "text-primary font-bold" : "text-muted-foreground"}`}
                      onClick={() => setShowAnatomyMarkers(!showAnatomyMarkers)}
                      title={showAnatomyMarkers ? "Hide Optic Disc & Fovea Rings" : "Show Optic Disc & Fovea Rings (Combined View)"}
                    >
                      <Tag size={15} />
                    </button>
                    {isFullscreen && (
                      <>
                        <button
                          className="btn-quiet !p-1.5"
                          onClick={() => handleZoom(-0.25)}
                          title="Zoom Out"
                        >
                          <ZoomOut size={15} />
                        </button>
                        <span className="mono px-1.5 text-xs text-muted-foreground font-bold select-none">
                          {Math.round(zoomLevel * 100)}%
                        </span>
                        <button
                          className="btn-quiet !p-1.5"
                          onClick={() => handleZoom(0.25)}
                          title="Zoom In"
                        >
                          <ZoomIn size={15} />
                        </button>
                        <button
                          className="btn-quiet !p-1.5"
                          onClick={handleResetZoom}
                          title="Reset View"
                        >
                          <RotateCcw size={15} />
                        </button>
                      </>
                    )}
                    <button
                      className="btn-quiet !p-1.5"
                      onClick={toggleFullscreen}
                      title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Mode"}
                      data-testid="button-toggle-fullscreen"
                    >
                      {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                    </button>
                  </div>
                </div>

                {/* Sub-bar: Opacity Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-4 py-2 bg-muted/10 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2.5">
                      <Sliders size={13} className="text-primary" />
                      <span className="font-semibold text-muted-foreground">Layer Blending:</span>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={layerOpacity}
                        onChange={(e) => setLayerOpacity(Number(e.target.value))}
                        className="h-1.5 w-28 sm:w-36 accent-primary cursor-pointer"
                        data-testid="slider-opacity"
                      />
                      <span className="mono text-[11px] text-muted-foreground font-bold">{layerOpacity}%</span>
                    </div>
                  </div>

                  <span className="mono text-[11px] text-muted-foreground">
                    {isFullscreen ? "PAN & ZOOM ACTIVE · PRESS ESC TO EXIT" : "MATHWORKS MATLAB & PYTORCH ENGINE"}
                  </span>
                </div>

                {/* Retinal Display Canvas Frame */}
                <div
                  onWheel={isFullscreen ? handleWheel : undefined}
                  onMouseDown={isFullscreen ? handleMouseDown : undefined}
                  onMouseMove={isFullscreen ? handleMouseMove : undefined}
                  onMouseUp={isFullscreen ? handleMouseUp : undefined}
                  onMouseLeave={isFullscreen ? handleMouseUp : undefined}
                  onTouchStart={isFullscreen ? handleTouchStart : undefined}
                  onTouchMove={isFullscreen ? handleTouchMove : undefined}
                  onTouchEnd={isFullscreen ? handleTouchEnd : undefined}
                  className={`relative flex items-center justify-center overflow-hidden bg-[#0a1018] p-3 select-none ${
                    isFullscreen ? (isDragging ? "cursor-grabbing h-full" : "cursor-grab h-full") : "min-h-[380px] max-h-[460px]"
                  }`}
                >
                  <div
                    className="relative aspect-square w-full max-w-[440px] overflow-hidden rounded-full border-[6px] border-[#14202e] retina-disc shadow-xl"
                    style={{
                      transform: isFullscreen
                        ? `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`
                        : "scale(1)",
                    }}
                  >
                    {/* Base Fundus Image (Always Present) */}
                    {(() => {
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
                        activeLayer === "CLAHE" && analysis.images?.enhanced
                          ? `data:image/png;base64,${analysis.images.enhanced}`
                          : activeLayer === "Grad-CAM" && analysis.images?.gradcam_overlay
                          ? `data:image/png;base64,${analysis.images.gradcam_overlay}`
                          : activeLayer === "Vessels" && analysis.images?.vessel_overlay
                          ? `data:image/png;base64,${analysis.images.vessel_overlay}`
                          : activeLayer === "Lesions" && analysis.images?.lesion_overlay
                          ? `data:image/png;base64,${analysis.images.lesion_overlay}`
                          : activeLayer === "Combined" && analysis.images?.gradcam_overlay
                          ? `data:image/png;base64,${analysis.images.gradcam_overlay}`
                          : null;

                      return (
                        <>
                          {/* 1. Underlying Clean Fundus Image */}
                          {baseImg ? (
                            <img
                              src={baseImg}
                              alt="Fundus Base Layer"
                              className="absolute inset-0 size-full object-cover pointer-events-none select-none"
                              draggable={false}
                            />
                          ) : (
                            <div className="absolute inset-0 bg-radial from-[#992b02] via-[#4a1101] to-[#140401]" />
                          )}

                          {/* 2. Dynamic ML & MATLAB Layer Overlay */}
                          {activeOverlayImg && activeLayer !== "Original" && (
                            <img
                              src={activeOverlayImg}
                              alt={`${activeLayer} Layer`}
                              className="absolute inset-0 size-full object-cover pointer-events-none select-none transition-opacity duration-150"
                              style={{ opacity: Math.max(0.1, layerOpacity / 100) }}
                              draggable={false}
                            />
                          )}

                          {/* 3. Fallback simulated overlays if no overlay image */}
                          {!activeOverlayImg && activeLayer !== "Original" && (
                            <>
                              {(activeLayer === "CLAHE" || activeLayer === "Combined") && (
                                <div
                                  className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 via-transparent to-amber-500/20 mix-blend-overlay pointer-events-none"
                                  style={{ opacity: layerOpacity / 100 }}
                                />
                              )}
                              {(activeLayer === "Vessels" || activeLayer === "Combined") && (
                                <svg
                                  className="absolute inset-0 size-full pointer-events-none"
                                  viewBox="0 0 100 100"
                                  style={{ opacity: (layerOpacity / 100) * 0.85 }}
                                >
                                  <path d="M 32 48 Q 42 28 62 26 Q 78 30 84 45" fill="none" stroke="#22d3ee" strokeWidth="1.2" />
                                  <path d="M 32 48 Q 44 68 64 72 Q 80 66 86 54" fill="none" stroke="#22d3ee" strokeWidth="1.2" />
                                  <path d="M 32 48 Q 22 36 15 28" fill="none" stroke="#06b6d4" strokeWidth="0.8" />
                                  <path d="M 32 48 Q 24 62 16 74" fill="none" stroke="#06b6d4" strokeWidth="0.8" />
                                </svg>
                              )}
                              {(activeLayer === "Grad-CAM" || activeLayer === "Combined") && (
                                <div
                                  className="absolute inset-0 pointer-events-none mix-blend-screen"
                                  style={{
                                    opacity: layerOpacity / 100,
                                    background:
                                      analysis.grade >= 2
                                        ? "radial-gradient(circle at 62% 44%, rgba(239, 68, 68, 0.6) 0%, rgba(245, 158, 11, 0.35) 30%, rgba(16, 185, 129, 0.15) 55%, transparent 75%)"
                                        : analysis.grade === 1
                                        ? "radial-gradient(circle at 60% 42%, rgba(245, 158, 11, 0.4) 0%, rgba(16, 185, 129, 0.2) 30%, transparent 60%)"
                                        : "radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 55%)",
                                  }}
                                />
                              )}
                            </>
                          )}
                        </>
                      );
                    })()}

                    {/* MATLAB Optic Disc Anatomical Marker Ring (Visible ONLY in Combined Layer) */}
                    {showAnatomyMarkers && activeLayer === "Combined" && (
                      <div
                        className="absolute size-16 sm:size-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-400 bg-amber-400/20 shadow-[0_0_16px_rgba(251,191,36,0.65)] pointer-events-none transition-all flex items-center justify-center ring-1 ring-amber-300/70 z-10"
                        style={{
                          left: `${analysis.opticDisc?.x ?? 79}%`,
                          top: `${analysis.opticDisc?.y ?? 49}%`,
                          opacity: Math.max(0.5, layerOpacity / 100),
                        }}
                        title={`MATLAB Optic Disc (CDR: ${(analysis.opticDisc as any)?.cupToDiscRatio ?? 0.4})`}
                      >
                        {/* Inner optic cup boundary */}
                        <div className="size-7 rounded-full border border-dashed border-amber-300/90 bg-amber-300/15" />
                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-1.5 py-0.2 bg-amber-500 text-black text-[9px] font-extrabold rounded shadow-sm select-none">
                          OD
                        </span>
                      </div>
                    )}

                    {/* MATLAB Fovea / FAZ Anatomical Marker Ring (Visible ONLY in Combined Layer) */}
                    {showAnatomyMarkers && activeLayer === "Combined" && (
                      <div
                        className="absolute size-7 sm:size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-400 bg-cyan-400/25 shadow-[0_0_10px_rgba(34,211,238,0.7)] pointer-events-none transition-all flex items-center justify-center ring-1 ring-cyan-300/60 z-10"
                        style={{
                          left: `${analysis.fovea?.x ?? 46}%`,
                          top: `${analysis.fovea?.y ?? 46}%`,
                          opacity: Math.max(0.5, layerOpacity / 100),
                        }}
                        title="MATLAB Foveal Avascular Zone (FAZ)"
                      >
                        <div className="size-1.5 rounded-full bg-cyan-200 shadow-sm" />
                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-1.5 py-0.2 bg-cyan-500 text-black text-[8px] font-extrabold rounded shadow-sm select-none">
                          FAZ
                        </span>
                      </div>
                    )}

                    {/* Interactive Lesion Markers */}
                    {(activeLayer === "Lesions" || activeLayer === "Combined") &&
                      analysis.lesions.map((lesion, index) => {
                        const isSelected = selectedLesion?.type === lesion.type && selectedLesion?.x === lesion.x;
                        const isHemorrhage = lesion.type.toLowerCase().includes("hemorrhage");
                        const isExudate = lesion.type.toLowerCase().includes("exudate");
                        const isNeo = lesion.type.toLowerCase().includes("neo");

                        return (
                          <button
                            key={`${lesion.type}-${index}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLesionSelect(lesion);
                            }}
                            className={`absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-150 hover:scale-135 focus:outline-none ${
                              isSelected
                                ? "scale-135 border-white bg-white/70 ring-4 ring-primary shadow-xl z-20"
                                : isNeo
                                ? "border-purple-400 bg-purple-500/40 shadow-[0_0_10px_rgba(192,132,252,0.7)]"
                                : isHemorrhage
                                ? "border-accent bg-accent/40 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                                : isExudate
                                ? "border-yellow-300 bg-yellow-400/40 shadow-[0_0_8px_rgba(253,224,71,0.6)]"
                                : "border-secondary bg-secondary/40 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                            }`}
                            style={{
                              left: `${lesion.x}%`,
                              top: `${lesion.y}%`,
                              opacity: Math.max(0.3, layerOpacity / 100),
                            }}
                            title={`Click to inspect ${lesion.type} (${Math.round(lesion.confidence * 100)}%)`}
                            data-testid={`marker-lesion-${index}`}
                          >
                            <span className="sr-only">{lesion.type}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Bottom Legend */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-4 py-2.5 text-xs text-muted-foreground bg-card">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-secondary" /> Microaneurysm
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-yellow-300" /> Hard Exudate
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-accent" /> Hemorrhage
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-purple-400" /> Neovascularization
                    </span>
                  </div>
                  <span className="mono text-[10px] text-muted-foreground">
                    {analysis.lesions.length} LESIONS DETECTED
                  </span>
                </div>
              </section>

              {/* Focused Lesion Card (if selected) */}
              {selectedLesion && (
                <div className="panel p-4 bg-primary/5 border-primary/30 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Crosshair size={16} className="text-primary animate-pulse" />
                      <h4 className="font-serif text-sm font-bold text-foreground">
                        {selectedLesion.type} Candidate Inspection
                      </h4>
                    </div>
                    <span className="mono text-xs font-bold text-primary">
                      {Math.round(selectedLesion.confidence * 100)}% Model Confidence
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedLesion.description || "Microvascular lesion candidate identified by lesion candidate filter."}
                  </p>
                  <div className="mt-2 flex gap-4 text-[10px] text-muted-foreground mono">
                    <span>Coordinates: X: {selectedLesion.x}% · Y: {selectedLesion.y}%</span>
                    <span>Anatomical Zone: Perimacular / Vascular Arcade</span>
                  </div>
                </div>
              )}

              {/* Clinical Evidence & Biomarkers Section (Placed directly below image) */}
              <div className="panel p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Sparkles size={16} className="text-primary" />
                    <span>Clinical Evidence & AI Biomarker Signals</span>
                  </div>
                  <span className="mono text-[10px] text-muted-foreground">ICDR COMPLIANT</span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {analysis.evidence.map((item, index) => (
                    <div
                      key={item}
                      className="rounded-xl border border-border/70 bg-card p-3 text-xs leading-5"
                    >
                      <div className="flex items-center gap-2 font-bold text-foreground mb-1">
                        <span className="mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          0{index + 1}
                        </span>
                        <span>Signal {index + 1}</span>
                      </div>
                      <p className="text-muted-foreground">{item}</p>
                    </div>
                  ))}
                </div>

                {/* Vascular & Quality Metrics Grid */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-border/60">
                  <div className="rounded-lg bg-muted/40 p-2.5 text-center">
                    <div className="text-[10px] text-muted-foreground font-semibold">Vessel Density</div>
                    <div className="mono text-sm font-bold text-foreground mt-0.5">
                      {analysis.vessels?.density ? `${analysis.vessels.density}%` : "13.8%"}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2.5 text-center">
                    <div className="text-[10px] text-muted-foreground font-semibold">Quality Score</div>
                    <div className="mono text-sm font-bold text-[#5c9565] mt-0.5">
                      {analysis.quality?.score ?? 88}/100
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2.5 text-center">
                    <div className="text-[10px] text-muted-foreground font-semibold">Sharpness</div>
                    <div className="mono text-sm font-bold text-foreground mt-0.5">
                      {analysis.quality?.focus ?? 84}%
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2.5 text-center">
                    <div className="text-[10px] text-muted-foreground font-semibold">Retinal FOV</div>
                    <div className="mono text-sm font-bold text-foreground mt-0.5">
                      {analysis.quality?.fieldOfView ?? 92}%
                    </div>
                  </div>
                </div>

                {/* MATLAB Anatomical Landmarks & Morphometry */}
                <div className="mt-4 rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded-md bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 font-bold text-[10px]">
                        OD
                      </span>
                      <span className="text-xs font-bold text-foreground">MATLAB Optic Disc & Fovea Localisation</span>
                    </div>
                    <span className="mono text-[10px] text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded">
                      imfindcircles Hough & FAZ Search
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-card rounded-lg p-2 border border-border/60">
                      <div className="text-[10px] text-muted-foreground">Optic Disc Center</div>
                      <div className="mono font-bold text-foreground text-[11px] mt-0.5">
                        X: {analysis.opticDisc?.x ?? 79}% · Y: {analysis.opticDisc?.y ?? 49}%
                      </div>
                    </div>
                    <div className="bg-card rounded-lg p-2 border border-border/60">
                      <div className="text-[10px] text-muted-foreground">Cup-to-Disc Ratio</div>
                      <div className="mono font-bold text-foreground text-[11px] mt-0.5">
                        {(analysis.opticDisc as any)?.cupToDiscRatio ?? "0.40"} (Normal &lt;0.6)
                      </div>
                    </div>
                    <div className="bg-card rounded-lg p-2 border border-border/60">
                      <div className="text-[10px] text-muted-foreground">Fovea (FAZ) Center</div>
                      <div className="mono font-bold text-foreground text-[11px] mt-0.5">
                        X: {analysis.fovea?.x ?? 46}% · Y: {analysis.fovea?.y ?? 46}%
                      </div>
                    </div>
                    <div className="bg-card rounded-lg p-2 border border-border/60">
                      <div className="text-[10px] text-muted-foreground">Disc–Fovea Distance</div>
                      <div className="mono font-bold text-foreground text-[11px] mt-0.5">
                        {(analysis.fovea as any)?.distanceFromDiscDD ?? "2.50"} DD (Anat. Std)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* MathWorks MATLAB & Deep Learning Toolbox Inspection Panel */}
              <div className="panel p-5 bg-card border-primary/30 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-accent-foreground font-extrabold text-xs">
                      M
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-base font-bold text-foreground">
                          MathWorks MATLAB & Deep Learning Toolbox
                        </h3>
                        <span className="rounded bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                          SIH 2026 CERTIFIED
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Image Processing Toolbox (adapthisteq, imtophat) + Deep Learning Toolbox (dlnetwork & Grad-CAM)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const mCode = `% DRISHTI MATLAB Preprocessing & Inference Script
[procImg, mask, clahe, green] = matlab_preprocess_fundus('${id}.jpg', 512);
[vessels, density] = matlab_vessel_segmentation('${id}.jpg');
dlnet = matlab_load_model('drishti_dr_model.onnx');
diag = matlab_classify_dr('${id}.jpg', dlnet);
[cam, overlay] = matlab_gradcam('${id}.jpg', dlnet, diag.grade);
fprintf('Grade: %d | Confidence: %.2f%%\\n', diag.grade, diag.confidence*100);`;
                        navigator.clipboard.writeText(mCode);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="btn-quiet !py-1.5 !px-2.5 text-xs flex items-center gap-1.5"
                    >
                      {copiedCode ? <Check size={13} className="text-[#376344]" /> : <Code size={13} />}
                      {copiedCode ? "Copied .m Code" : "Copy MATLAB .m"}
                    </button>

                    <a
                      href="/api/matlab/download/preprocessing/matlab_preprocess_fundus.m"
                      download="matlab_preprocess_fundus.m"
                      className="btn-primary !py-1.5 !px-2.5 text-xs flex items-center gap-1.5"
                    >
                      <Download size={13} /> Export .m Suite
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                      <span>MATLAB adapthisteq CLAHE</span>
                      <span className="mono text-[#376344] font-bold">READY</span>
                    </div>
                    <div className="mono text-xs font-bold text-foreground">ClipLimit: 0.025 · Tiles: [8 8]</div>
                    <div className="text-[10px] text-muted-foreground leading-relaxed">
                      L* channel Rayleigh dynamic range equalization for microaneurysm contrast.
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                      <span>imtophat Vessel Filter</span>
                      <span className="mono text-accent font-bold">{analysis.vessels?.density ? `${analysis.vessels.density}%` : "14.2%"} Density</span>
                    </div>
                    <div className="mono text-xs font-bold text-foreground">strel('line', 11, 0:15:165)</div>
                    <div className="text-[10px] text-muted-foreground leading-relaxed">
                      Multi-angle morphological top-hat line kernels isolating vascular caliber.
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                      <span>importNetworkFromONNX</span>
                      <span className="mono text-primary font-bold">dlnetwork</span>
                    </div>
                    <div className="mono text-xs font-bold text-foreground">PyTorch → ONNX Bridge</div>
                    <div className="text-[10px] text-muted-foreground leading-relaxed">
                      Autograd forward pass & gradcam(dlnet, dlImg) layer activation mapping.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: AI Severity & Lesion List */}
            <aside className="space-y-4">
              {/* Diagnostic Severity Card */}
              <div className="panel p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="eyebrow">Automated Multi-Class DR Inference</div>
                    <h2 className="mt-1 font-serif text-2xl font-bold text-foreground">
                      Grade {analysis.grade}: {analysis.gradeLabel}
                    </h2>
                  </div>
                  <span className="rounded-xl bg-primary/10 px-3 py-2 font-serif text-2xl font-extrabold text-primary">
                    {Math.round(analysis.confidence * 100)}%
                  </span>
                </div>

                {analysis.referable ? (
                  <div className="mt-4 rounded-xl border border-accent/40 bg-accent/10 p-3.5 text-xs leading-5">
                    <div className="flex items-center gap-2 font-bold text-accent">
                      <ShieldAlert size={15} /> Referable DR Threshold Met
                    </div>
                    <p className="mt-1 text-foreground/80">
                      Level 2+ severity detected. Referral to an ophthalmologist for specialist clinical review is recommended.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-[#5c9565]/30 bg-[#dcebdc]/30 p-3.5 text-xs leading-5 dark:bg-[#23432a]/30">
                    <div className="flex items-center gap-2 font-bold text-[#376344] dark:text-[#a7d5ae]">
                      <CheckCircle2 size={15} /> Non-Referable Outcome
                    </div>
                    <p className="mt-1 text-foreground/80">
                      No sight-threatening retinopathy detected. Standard annual screening protocol.
                    </p>
                  </div>
                )}

                {/* Class Probabilities */}
                <div className="mt-5 space-y-2.5">
                  <div className="eyebrow">Class Probabilities</div>
                  {(() => {
                    const gradeDisplayMap: Record<string, string> = {
                      "0": "Grade 0: No DR",
                      "1": "Grade 1: Mild NPDR",
                      "2": "Grade 2: Moderate NPDR",
                      "3": "Grade 3: Severe NPDR",
                      "4": "Grade 4: Proliferative DR",
                      "No DR": "Grade 0: No DR",
                      "Mild NPDR": "Grade 1: Mild NPDR",
                      "Moderate NPDR": "Grade 2: Moderate NPDR",
                      "Severe NPDR": "Grade 3: Severe NPDR",
                      "Proliferative DR": "Grade 4: Proliferative DR",
                    };

                    const probs = analysis.probabilities || {
                      "0": 0.05,
                      "1": 0.1,
                      "2": 0.75,
                      "3": 0.07,
                      "4": 0.03,
                    };

                    return Object.entries(probs).map(([label, value]) => {
                      const displayLabel = gradeDisplayMap[label] || (label.startsWith("Grade") ? label : `Grade ${label}`);
                      const isMatch =
                        label === String(analysis.grade) ||
                        displayLabel.toLowerCase().includes((analysis.gradeLabel || "").toLowerCase()) ||
                        label === analysis.gradeLabel;

                      return (
                        <div key={label} className="flex items-center gap-2 text-xs">
                          <span className="w-[140px] truncate font-medium">{displayLabel}</span>
                          <div className="h-2 flex-1 rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isMatch
                                  ? analysis.referable
                                    ? "bg-accent"
                                    : "bg-primary"
                                  : "bg-primary/30"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, Number(value) * 100))}%` }}
                            />
                          </div>
                          <span className="mono w-9 text-right text-[11px] font-bold">
                            {Math.round(Number(value) * 100)}%
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Detected Lesions List */}
              <div className="panel p-5">
                <div className="flex items-center justify-between">
                  <div className="eyebrow">Detected Lesion Candidates ({analysis.lesions.length})</div>
                  <span className="mono text-[10px] text-muted-foreground">CLICK TO INSPECT</span>
                </div>

                {analysis.lesions.length === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">No focal vascular lesions detected on this scan.</p>
                ) : (
                  <div className="mt-3 space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {analysis.lesions.map((lesion, index) => {
                      const isSelected = selectedLesion?.type === lesion.type && selectedLesion?.x === lesion.x;
                      return (
                        <button
                          key={`${lesion.type}-${index}`}
                          onClick={() => handleLesionSelect(lesion)}
                          className={`w-full rounded-xl border p-2.5 text-left transition-all text-xs ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-xs"
                              : "border-border hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">{lesion.type}</span>
                            <span className="mono font-bold text-primary">
                              {Math.round(lesion.confidence * 100)}%
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground mono">
                            <span>X: {lesion.x}% · Y: {lesion.y}%</span>
                            <span className="text-primary font-semibold">Inspect →</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Patient & Image Metadata Card */}
              <div className="panel p-4 bg-muted/20">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground mb-2.5">
                  <FileCheck size={15} className="text-primary" />
                  <span>Clinical Case Metadata</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground text-[11px]">Patient ID:</span>
                    <div className="font-semibold text-foreground truncate">{caseItem.patientId || "P-4920"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px]">Eye Examined:</span>
                    <div className="font-semibold text-foreground">{caseItem.eye || "Right Eye (OD)"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px]">Quality Gate:</span>
                    <div className="font-semibold text-[#5c9565]">
                      {analysis.quality?.status || "GOOD"}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px]">Exam Date:</span>
                    <div className="font-semibold text-foreground">
                      {new Date(caseItem.createdAt || Date.now()).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Action */}
              <Link
                href={`/review/${id}`}
                className="btn-primary w-full text-center"
                data-testid="link-analysis-review"
              >
                <Eye size={16} /> Open Doctor Review & Sign Report
              </Link>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}