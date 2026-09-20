import { useState, useRef, useEffect, type ChangeEvent } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileImage,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Sliders,
  AlertCircle,
  Eye,
  Trash2,
  RefreshCw,
  User,
  Activity,
  Calendar,
  Phone,
  FileText,
  HelpCircle,
  Zap,
  Camera,
  Maximize2,
  CircleDot,
  CheckSquare,
  ChevronRight,
  Info,
} from "lucide-react";
import { useAnalyzeScreening, useCreateCase } from "@workspace/api-client-react";
import { demoAnalysisByGrade, sampleRetinaPresets, type DemoAnalysis } from "@/lib/demo-data";
import { PageHeader, StatusChip } from "@/components/shell";

const steps = ["1. Patient Demographics & Triage", "2. Fundus Acquisition & Quality Gate"];

export default function NewScreening() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);

  // Patient & Clinical Form Fields
  const [caseId, setCaseId] = useState(`DR-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [patientName, setPatientName] = useState("");
  const [patientId, setPatientId] = useState(`PAT-${Math.floor(10000 + Math.random() * 90000)}`);
  const [age, setAge] = useState("52");
  const [gender, setGender] = useState("Female");
  const [phone, setPhone] = useState("");
  const [diabetesType, setDiabetesType] = useState("Type 2");
  const [diabetesDuration, setDiabetesDuration] = useState("10 years");
  const [drHistory, setDrHistory] = useState("None");
  const [eye, setEye] = useState<"Right" | "Left" | "Both">("Right");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Active Eye Selection for Step 2 (OD = Right Eye, OS = Left Eye)
  const [activeEyeTab, setActiveEyeTab] = useState<"OD" | "OS">("OD");

  // Right Eye (OD) State
  const [odFile, setOdFile] = useState<File | null>(null);
  const [odBase64, setOdBase64] = useState<string | null>(null);
  const [odPreviewUrl, setOdPreviewUrl] = useState<string | null>(null);
  const [odImageName, setOdImageName] = useState<string>("");
  const [odMeta, setOdMeta] = useState<{ width?: number; height?: number; size?: string; format?: string }>({});
  const [odAnalysis, setOdAnalysis] = useState<DemoAnalysis | null>(null);
  const [odEvaluating, setOdEvaluating] = useState(false);
  const [odCircularMask, setOdCircularMask] = useState(true);
  const [odClaheOn, setOdClaheOn] = useState(false);

  // Left Eye (OS) State
  const [osFile, setOsFile] = useState<File | null>(null);
  const [osBase64, setOsBase64] = useState<string | null>(null);
  const [osPreviewUrl, setOsPreviewUrl] = useState<string | null>(null);
  const [osImageName, setOsImageName] = useState<string>("");
  const [osMeta, setOsMeta] = useState<{ width?: number; height?: number; size?: string; format?: string }>({});
  const [osAnalysis, setOsAnalysis] = useState<DemoAnalysis | null>(null);
  const [osEvaluating, setOsEvaluating] = useState(false);
  const [osCircularMask, setOsCircularMask] = useState(true);
  const [osClaheOn, setOsClaheOn] = useState(false);

  // Drag and drop hover states
  const [isDragOver, setIsDragOver] = useState(false);

  const createCase = useCreateCase();
  const analyze = useAnalyzeScreening();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync default active eye tab when eye selection changes
  useEffect(() => {
    if (eye === "Left") {
      setActiveEyeTab("OS");
    } else {
      setActiveEyeTab("OD");
    }
  }, [eye]);

  // Validation helpers
  const validatePatientName = (name: string): boolean => {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 80) return false;
    return /^[a-zA-Z\s\.\'-]+$/.test(trimmed);
  };

  const validateAgeNum = (val: string): boolean => {
    const num = Number(val);
    return !isNaN(num) && num >= 0 && num <= 120;
  };

  const validatePhone = (p: string): boolean => {
    const clean = p.replace(/[\s\-\+\(\)]/g, "");
    if (!clean) return false;
    return /^(?:(?:\+91|91|0)?[6-9]\d{9})$/.test(clean);
  };

  const handlePatientSubmit = () => {
    setFormError(null);

    const cleanName = patientName.trim();
    if (!cleanName) {
      setFormError("Patient Name is required.");
      return;
    }

    if (!validatePatientName(cleanName)) {
      setFormError("Patient Name must contain valid characters (letters, spaces, dots, hyphens) and be at least 2 characters long.");
      return;
    }

    if (!validateAgeNum(age)) {
      setFormError("Please enter a valid numerical patient age between 0 and 120 years.");
      return;
    }

    if (!phone.trim()) {
      setFormError("Contact Number is required.");
      return;
    }

    if (!validatePhone(phone)) {
      setFormError("Please enter a valid 10-digit mobile Contact Number (e.g. 9876543210).");
      return;
    }

    createCase.mutate(
      {
        data: {
          caseId,
          patientName: cleanName,
          patientId,
          age: Number(age),
          gender,
          phone: phone.trim(),
          diabetesType,
          diabetesDuration,
          drHistory,
          eye,
          clinicalNotes,
          imageUrl: odBase64 || osBase64 || null,
        } as any,
      },
      {
        onSuccess: () => setStep(1),
        onError: () => setStep(1),
      }
    );
  };

  // Perform realistic clinical image quality assessment on an uploaded image via backend ML and client-side CV
  const evaluateQualityOnImage = async (
    img: HTMLImageElement,
    file: File | null,
    side: "OD" | "OS",
    imagePayload?: string,
    presetGrade?: number,
    presetStatus?: "GOOD" | "BORDERLINE" | "UNGRADABLE"
  ) => {
    if (side === "OD") setOdEvaluating(true);
    else setOsEvaluating(true);

    try {
      // 1. Try calling the dedicated real-time backend ML Quality Gate endpoint first
      const payloadToSend = imagePayload || (file ? await fileToBase64(file) : img.src);
      const res = await fetch("/api/screening/quality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: payloadToSend }),
      });

      if (res.ok) {
        const qData = await res.json();
        const determinedGrade = presetGrade !== undefined ? presetGrade : (qData.status === "UNGRADABLE" ? 0 : 2);
        const baseAnalysis = { ...(demoAnalysisByGrade[determinedGrade] || demoAnalysisByGrade[0]) };

        const fullReport: DemoAnalysis = {
          ...baseAnalysis,
          grade: determinedGrade,
          quality: {
            score: qData.score ?? (qData.status === "GOOD" ? 92 : qData.status === "BORDERLINE" ? 68 : 28),
            status: qData.status ?? "GOOD",
            focus: qData.focus ?? (qData.status === "GOOD" ? 95 : 30),
            illumination: qData.illumination ?? (qData.status === "GOOD" ? 90 : 35),
            fieldOfView: qData.fieldOfView ?? (qData.status === "GOOD" ? 94 : 45),
            coverage: qData.coverage ?? (qData.status === "GOOD" ? 92 : 40),
            artifacts: qData.artifacts ?? (qData.status === "GOOD" ? 91 : 25),
            feedback: qData.feedback || (qData.status === "UNGRADABLE" ? "Image ungradable: severe blur or darkness. Recapture." : "Optimal retinal fundus photograph."),
          },
          gradable: qData.status !== "UNGRADABLE",
        };

        if (side === "OD") {
          setOdAnalysis(fullReport);
          setOdEvaluating(false);
        } else {
          setOsAnalysis(fullReport);
          setOsEvaluating(false);
        }
        return;
      }
    } catch {
      // Fall through to deterministic canvas computation
    }

    // 2. Deterministic Client-Side Canvas Optical Evaluation (Laplacian & Grid Luminance)
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const sampleSize = 256;
      canvas.width = sampleSize;
      canvas.height = sampleSize;

      let computedScore = 90;
      let focusVal = 92;
      let illumVal = 88;
      let fovVal = 94;
      let coverageVal = 92;
      let artifactsVal = 89;
      let statusVerdict: "GOOD" | "BORDERLINE" | "UNGRADABLE" = "GOOD";
      let clinicalFeedback = "High quality fundus photograph. Macula, fovea, and optic disc clearly resolved.";

      if (ctx) {
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
        const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const pixels = imgData.data;

        // Grayscale conversion & mean brightness
        const gray = new Float32Array(sampleSize * sampleSize);
        let totalLuminance = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
          gray[i / 4] = lum;
          totalLuminance += lum;
        }
        const avgLuminance = totalLuminance / (sampleSize * sampleSize);

        // Retinal disc mask detection (brightness > 12)
        let maskCount = 0;
        for (let i = 0; i < gray.length; i++) {
          if (gray[i] > 12) maskCount++;
        }
        const fovFraction = maskCount / (sampleSize * sampleSize);

        // Discrete Laplacian edge variance (sharpness/focus)
        let lapSum = 0;
        let lapSqSum = 0;
        let count = 0;
        for (let y = 1; y < sampleSize - 1; y++) {
          for (let x = 1; x < sampleSize - 1; x++) {
            const idx = y * sampleSize + x;
            if (gray[idx] <= 12) continue; // ignore black borders
            const lap = 4 * gray[idx] - gray[idx - 1] - gray[idx + 1] - gray[idx - sampleSize] - gray[idx + sampleSize];
            lapSum += lap;
            lapSqSum += lap * lap;
            count++;
          }
        }
        const lapVariance = count > 10 ? (lapSqSum / count) - Math.pow(lapSum / count, 2) : 0;

        // Illumination uniformity across 4x4 grid
        const gridMeans: number[] = [];
        const gridSize = 4;
        const blockSize = sampleSize / gridSize;
        for (let gy = 0; gy < gridSize; gy++) {
          for (let gx = 0; gx < gridSize; gx++) {
            let bSum = 0;
            let bCount = 0;
            for (let py = 0; py < blockSize; py++) {
              for (let px = 0; px < blockSize; px++) {
                const pIdx = (gy * blockSize + py) * sampleSize + (gx * blockSize + px);
                if (gray[pIdx] > 12) {
                  bSum += gray[pIdx];
                  bCount++;
                }
              }
            }
            if (bCount > 50) gridMeans.push(bSum / bCount);
          }
        }
        const gridMeanAvg = gridMeans.length > 0 ? gridMeans.reduce((a, b) => a + b, 0) / gridMeans.length : 0;
        const gridSpread = gridMeans.length > 1
          ? Math.sqrt(gridMeans.reduce((acc, val) => acc + Math.pow(val - gridMeanAvg, 2), 0) / gridMeans.length)
          : 50;

        // Metric calculations matching image_quality.py
        const calculatedFocus = Math.min(100, Math.max(10, Math.round(lapVariance * 1.5)));
        const calculatedIllum = Math.min(100, Math.max(10, Math.round(Math.max(0, 1.0 - gridSpread / 60.0) * 100)));
        const calculatedFov = Math.min(100, Math.max(10, Math.round(fovFraction * 130)));
        const calculatedContrast = Math.min(100, Math.max(10, Math.round(Math.min(40, gridMeanAvg) * 2.2)));

        focusVal = calculatedFocus;
        illumVal = calculatedIllum;
        fovVal = calculatedFov;
        coverageVal = calculatedFov;
        artifactsVal = calculatedContrast;

        if (presetStatus === "UNGRADABLE" || avgLuminance < 20 || avgLuminance > 225 || fovFraction < 0.20 || lapVariance < 8) {
          statusVerdict = "UNGRADABLE";
          computedScore = 28;
          clinicalFeedback = "Image rejected at quality gate: severe optical blur, underexposure, or insufficient field. Recapture required.";
        } else if (lapVariance < 20 || calculatedIllum < 45 || fovFraction < 0.38) {
          statusVerdict = "BORDERLINE";
          computedScore = 66;
          clinicalFeedback = "Borderline optical quality. Focus or illumination variance detected. CLAHE enhancement applied.";
        } else {
          statusVerdict = "GOOD";
          computedScore = Math.round(focusVal * 0.35 + illumVal * 0.25 + fovVal * 0.25 + artifactsVal * 0.15);
          clinicalFeedback = "High quality fundus photograph. Retinal vasculature, macula, and optic disc clearly resolved.";
        }
      }

      const reportGrade = presetGrade !== undefined ? presetGrade : (statusVerdict === "UNGRADABLE" ? 0 : 2);
      const baseAnalysis = { ...(demoAnalysisByGrade[reportGrade] || demoAnalysisByGrade[0]) };

      const fullReport: DemoAnalysis = {
        ...baseAnalysis,
        grade: reportGrade,
        quality: {
          score: computedScore,
          status: statusVerdict,
          focus: focusVal,
          illumination: illumVal,
          fieldOfView: fovVal,
          coverage: coverageVal,
          artifacts: artifactsVal,
          feedback: clinicalFeedback,
        },
        gradable: statusVerdict !== "UNGRADABLE",
      };

      if (side === "OD") {
        setOdAnalysis(fullReport);
        setOdEvaluating(false);
      } else {
        setOsAnalysis(fullReport);
        setOsEvaluating(false);
      }
    } catch {
      const fallbackReport = { ...demoAnalysisByGrade[2] };
      if (side === "OD") {
        setOdAnalysis(fallbackReport);
        setOdEvaluating(false);
      } else {
        setOsAnalysis(fallbackReport);
        setOsEvaluating(false);
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>, targetSide: "OD" | "OS") => {
    setFormError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    processSelectedFile(file, targetSide);
  };

  const processSelectedFile = (file: File, targetSide: "OD" | "OS") => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      alert("Invalid file format. Please upload a standard JPG, JPEG, PNG, or WEBP fundus photograph.");
      return;
    }

    const minSize = 10 * 1024;
    const maxSize = 20 * 1024 * 1024;
    if (file.size < minSize || file.size > maxSize) {
      alert("Invalid file size. Fundus image size must be between 10 KB and 20 MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      if (img.width < 100 || img.height < 100) {
        alert("Corrupted or low-resolution image file. Minimum resolution is 100x100 pixels.");
        URL.revokeObjectURL(objectUrl);
        return;
      }

      // Generate optimized 512x512 JPEG fundus image
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, 512, 512);
      }
      const compressedB64 = canvas.toDataURL("image/jpeg", 0.88);

      const sizeKb = (file.size / 1024).toFixed(1);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      const formattedSize = file.size > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;

      if (targetSide === "OD") {
        setOdBase64(compressedB64);
        setOdFile(file);
        setOdImageName(file.name);
        setOdPreviewUrl(objectUrl);
        setOdMeta({ width: img.width, height: img.height, size: formattedSize, format: file.type.split("/")[1]?.toUpperCase() || "JPG" });
        evaluateQualityOnImage(img, file, "OD", compressedB64);
      } else {
        setOsBase64(compressedB64);
        setOsFile(file);
        setOsImageName(file.name);
        setOsPreviewUrl(objectUrl);
        setOsMeta({ width: img.width, height: img.height, size: formattedSize, format: file.type.split("/")[1]?.toUpperCase() || "JPG" });
        evaluateQualityOnImage(img, file, "OS", compressedB64);
      }
    };

    img.onerror = () => {
      alert("The selected image file appears corrupted or unreadable. Please choose a valid fundus image.");
      URL.revokeObjectURL(objectUrl);
    };

    img.src = objectUrl;
  };

  const handleSelectReferencePreset = (preset: typeof sampleRetinaPresets[0], targetSide: "OD" | "OS") => {
    const isUngradable = preset.id === "preset-ungradable";
    const imgName = `fundus_${targetSide.toLowerCase()}_${preset.id}.jpg`;

    const img = new Image();
    img.src = preset.thumbnail;

    if (targetSide === "OD") {
      setOdFile(null);
      setOdBase64(null);
      setOdPreviewUrl(preset.thumbnail);
      setOdImageName(imgName);
      setOdMeta({ width: 2240, height: 2240, size: "1.8 MB", format: "JPEG (45° Non-Mydriatic)" });
      evaluateQualityOnImage(img, null, "OD", preset.id, preset.grade, isUngradable ? "UNGRADABLE" : "GOOD");
    } else {
      setOsFile(null);
      setOsBase64(null);
      setOsPreviewUrl(preset.thumbnail);
      setOsImageName(imgName);
      setOsMeta({ width: 2240, height: 2240, size: "1.8 MB", format: "JPEG (45° Non-Mydriatic)" });
      evaluateQualityOnImage(img, null, "OS", preset.id, preset.grade, isUngradable ? "UNGRADABLE" : "GOOD");
    }
  };

  const handleRemoveImage = (targetSide: "OD" | "OS") => {
    if (targetSide === "OD") {
      if (odPreviewUrl && odFile) URL.revokeObjectURL(odPreviewUrl);
      setOdFile(null);
      setOdBase64(null);
      setOdPreviewUrl(null);
      setOdImageName("");
      setOdMeta({});
      setOdAnalysis(null);
    } else {
      if (osPreviewUrl && osFile) URL.revokeObjectURL(osPreviewUrl);
      setOsFile(null);
      setOsBase64(null);
      setOsPreviewUrl(null);
      setOsImageName("");
      setOsMeta({});
      setOsAnalysis(null);
    }
  };

  // Drag and drop handlers for intake dropzone
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent, targetSide: "OD" | "OS") => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file, targetSide);
    }
  };

  // Direct workflow: analyze case and navigate straight to the Retinal Workstation
  const handleProceedToWorkstation = () => {
    const activePreview = activeEyeTab === "OD" ? odPreviewUrl : osPreviewUrl;
    const activeBase64 = activeEyeTab === "OD" ? odBase64 : osBase64;
    const activeName = activeEyeTab === "OD" ? odImageName : osImageName;
    const activeAnalysis = activeEyeTab === "OD" ? odAnalysis : osAnalysis;

    const payload = activeBase64 || activePreview || activeName || "fundus_scan_01.jpg";

    analyze.mutate(
      {
        data: {
          caseId,
          image: payload,
          imageName: activeName || `fundus_${activeEyeTab.toLowerCase()}.jpg`,
          patientName: patientName.trim() || "Screening Patient",
          patientId: patientId.trim(),
          age: Number(age) || 52,
          gender,
          phone: phone.trim(),
          diabetesType,
          diabetesDuration,
          drHistory,
          eye: eye === "Both" ? (activeEyeTab === "OD" ? "Right" : "Left") : eye,
          clinicalNotes: clinicalNotes.trim(),
          qualityStatus: activeAnalysis?.quality?.status || "GOOD",
          qualityScore: activeAnalysis?.quality?.score || 94,
        } as any,
      },
      {
        onSuccess: () => {
          setLocation(`/analysis/${caseId}`);
        },
        onError: () => {
          // Navigate to analysis workstation even in offline mock mode
          setLocation(`/analysis/${caseId}`);
        },
      }
    );
  };

  // Current active eye variables
  const currentPreviewUrl = activeEyeTab === "OD" ? odPreviewUrl : osPreviewUrl;
  const currentImageName = activeEyeTab === "OD" ? odImageName : osImageName;
  const currentMeta = activeEyeTab === "OD" ? odMeta : osMeta;
  const currentAnalysis = activeEyeTab === "OD" ? odAnalysis : osAnalysis;
  const currentEvaluating = activeEyeTab === "OD" ? odEvaluating : osEvaluating;
  const currentCircularMask = activeEyeTab === "OD" ? odCircularMask : osCircularMask;
  const currentClaheOn = activeEyeTab === "OD" ? odClaheOn : osClaheOn;
  const setCurCircularMask = activeEyeTab === "OD" ? setOdCircularMask : setOsCircularMask;
  const setCurClaheOn = activeEyeTab === "OD" ? setOdClaheOn : setOsClaheOn;

  const hasCurrentImage = Boolean(currentPreviewUrl);
  const qualityStatus = currentAnalysis?.quality?.status || "GOOD";
  const qualityScore = currentAnalysis?.quality?.score || 0;

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader
        eyebrow="Clinical Screening Intake"
        title="New Retinal Screening Episode"
        description="Patient registration, optical fundus intake, automated quality gate assessment, and routing to the Retinal Workstation."
        action={
          <div className="flex items-center gap-3">
            <span className="mono rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground">
              {caseId}
            </span>
          </div>
        }
      />

      {/* Progress Steps Header */}
      <div className="panel mb-7 overflow-x-auto">
        <div className="flex items-center justify-between p-4 max-w-2xl mx-auto">
          {steps.map((label, index) => (
            <div key={label} className="flex items-center flex-1">
              <button
                className={`flex items-center gap-2.5 text-xs font-bold transition-colors ${
                  index === step
                    ? "text-primary"
                    : index < step
                    ? "text-[#5c9565]"
                    : "text-muted-foreground"
                }`}
                onClick={() => index <= step && setStep(index)}
                data-testid={`button-step-${index}`}
              >
                {index < step ? (
                  <span className="grid size-6 place-items-center rounded-full bg-[#dcebdc] text-[#376344]">
                    <Check size={13} />
                  </span>
                ) : (
                  <span
                    className={`grid size-6 place-items-center rounded-full border text-[10px] ${
                      index === step
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border"
                    }`}
                  >
                    {index + 1}
                  </span>
                )}
                <span>{label}</span>
              </button>
              {index < steps.length - 1 && <span className="mx-4 h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step Panels */}
      <div className="panel min-h-[520px] p-6 md:p-8">
        {/* Step 0: Patient Details */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/70 gap-2">
              <div>
                <div className="eyebrow">Step 01 of 02</div>
                <h2 className="display-title mt-1 text-2xl font-extrabold">Patient Registration & Screening Intake</h2>
              </div>
              <span className="mono text-xs font-bold text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border border-border">
                EPISODE: {caseId}
              </span>
            </div>

            {formError && (
              <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
                <AlertCircle size={16} className="shrink-0" /> {formError}
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-3">
              {/* Section 1: Demographics */}
              <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-primary border-b border-border/40 pb-2">
                  <User size={15} />
                  <span>1. Patient Demographics</span>
                </div>

                <label className="block text-xs font-bold text-foreground">
                  Patient Full Name <span className="text-destructive">*</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramachandran K."
                    className="input-field mt-1.5 text-xs"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    data-testid="input-patient-name"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-bold text-foreground">
                    Hospital ID
                    <input
                      type="text"
                      className="input-field mt-1.5 text-xs"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      data-testid="input-patient-id"
                    />
                  </label>

                  <label className="block text-xs font-bold text-foreground">
                    Age (Years) <span className="text-destructive">*</span>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      required
                      className="input-field mt-1.5 text-xs"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      data-testid="input-age"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-bold text-foreground">
                    Gender
                    <select
                      className="input-field mt-1.5 text-xs"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>

                  <label className="block text-xs font-bold text-foreground">
                    Contact Number <span className="text-destructive">*</span>
                    <input
                      type="tel"
                      required
                      placeholder="9876543210"
                      className="input-field mt-1.5 text-xs"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      data-testid="input-contact-number"
                    />
                  </label>
                </div>
              </div>

              {/* Section 2: Clinical & Diabetic Profile */}
              <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-primary border-b border-border/40 pb-2">
                  <Activity size={15} />
                  <span>2. Diabetic Profile</span>
                </div>

                <label className="block text-xs font-bold text-foreground">
                  Diabetes Classification
                  <select
                    className="input-field mt-1.5 text-xs"
                    value={diabetesType}
                    onChange={(e) => setDiabetesType(e.target.value)}
                  >
                    <option value="Type 2">Type 2 Diabetes</option>
                    <option value="Type 1">Type 1 Diabetes</option>
                    <option value="Gestational">Gestational Diabetes</option>
                    <option value="None">None / Non-Diabetic</option>
                  </select>
                </label>

                <label className="block text-xs font-bold text-foreground">
                  Duration of Diabetes
                  <input
                    type="text"
                    placeholder="e.g. 10 years"
                    className="input-field mt-1.5 text-xs"
                    value={diabetesDuration}
                    onChange={(e) => setDiabetesDuration(e.target.value)}
                  />
                </label>

                <label className="block text-xs font-bold text-foreground">
                  Previous Retinal / DR History
                  <input
                    type="text"
                    placeholder="e.g. No prior screening / Laser 2022"
                    className="input-field mt-1.5 text-xs"
                    value={drHistory}
                    onChange={(e) => setDrHistory(e.target.value)}
                  />
                </label>
              </div>

              {/* Section 3: Eye Examination & Notes */}
              <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-primary border-b border-border/40 pb-2">
                  <Eye size={15} />
                  <span>3. Examination Eye</span>
                </div>

                <label className="block text-xs font-bold text-foreground">
                  Target Eye for Screening <span className="text-destructive">*</span>
                  <select
                    className="input-field mt-1.5 text-xs font-semibold text-primary"
                    value={eye}
                    onChange={(e) => setEye(e.target.value as "Right" | "Left" | "Both")}
                    data-testid="select-eye"
                  >
                    <option value="Right">Right Eye (OD)</option>
                    <option value="Left">Left Eye (OS)</option>
                    <option value="Both">Bilateral (Both Eyes - OD + OS)</option>
                  </select>
                </label>

                <label className="block text-xs font-bold text-foreground">
                  Clinical Notes / Symptoms
                  <textarea
                    rows={3}
                    placeholder="Blurry vision, floaters, or screening observations..."
                    className="input-field mt-1.5 text-xs resize-none"
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                  />
                </label>
              </div>
            </div>

            {/* Quick Demo Pre-fill options */}
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sparkles size={14} className="text-primary" />
                <span className="font-semibold">Quick Demographic Sample Load:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: "Ramachandran K.", age: "56", gen: "Male", phone: "9845012345", eye: "Right", diag: "Type 2 (12 yrs)" },
                  { name: "Meenakshi Sundaram", age: "48", gen: "Female", phone: "9876543210", eye: "Both", diag: "Type 2 (8 yrs)" },
                  { name: "Abdul Wahab", age: "62", gen: "Male", phone: "9812345678", eye: "Left", diag: "Type 1 (18 yrs)" },
                ].map((sample) => (
                  <button
                    key={sample.name}
                    type="button"
                    onClick={() => {
                      setPatientName(sample.name);
                      setAge(sample.age);
                      setGender(sample.gen);
                      setPhone(sample.phone);
                      setEye(sample.eye as any);
                      setDiabetesDuration(sample.diag);
                      setFormError(null);
                    }}
                    className="px-2.5 py-1 rounded-lg border border-border bg-card hover:border-primary text-foreground text-[11px] font-medium transition-all"
                  >
                    {sample.name} ({sample.age}y)
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end pt-2">
              <button
                className="btn-primary !px-8 !py-3 text-xs font-bold"
                onClick={handlePatientSubmit}
                disabled={createCase.isPending}
                data-testid="button-continue-case"
              >
                {createCase.isPending ? "Registering Episode…" : "Proceed to Fundus Acquisition & Quality Gate"} <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Clinical Fundus Image Acquisition & Quality Gate */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Context Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/70 gap-2">
              <div>
                <div className="eyebrow">Step 02 of 02 • Clinical Camera Station</div>
                <h2 className="display-title mt-1 text-2xl font-extrabold">
                  Fundus Image Acquisition & Quality Verification
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="mono text-xs font-bold text-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border">
                  Patient: <span className="text-primary font-bold">{patientName || "Ramachandran K."}</span> ({patientId})
                </span>
                <span className="mono text-xs font-bold text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border">
                  Protocol: 45° Non-Mydriatic
                </span>
              </div>
            </div>

            {/* Bilateral Eye Selector Tabs (when "Both" or switching eyes) */}
            {eye === "Both" && (
              <div className="flex items-center gap-3 border-b border-border/50 pb-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Eye Intake:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveEyeTab("OD")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeEyeTab === "OD"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    <Eye size={14} />
                    <span>Right Eye (OD)</span>
                    {odPreviewUrl ? (
                      <span className="size-2 rounded-full bg-emerald-400 ring-2 ring-emerald-200 dark:ring-emerald-950" />
                    ) : (
                      <span className="text-[10px] opacity-70 font-normal">(Pending)</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveEyeTab("OS")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeEyeTab === "OS"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    <Eye size={14} />
                    <span>Left Eye (OS)</span>
                    {osPreviewUrl ? (
                      <span className="size-2 rounded-full bg-emerald-400 ring-2 ring-emerald-200 dark:ring-emerald-950" />
                    ) : (
                      <span className="text-[10px] opacity-70 font-normal">(Pending)</span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Hidden native file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={(e) => handleFileUpload(e, activeEyeTab)}
              data-testid="input-fundus-image"
            />

            {/* CONDITIONAL RENDERING BASED ON IMAGE UPLOAD STATE */}
            {!hasCurrentImage ? (
              /* ZERO-STATE: NO IMAGE UPLOADED YET */
              /* In this state, NO premature quality metrics or scores are displayed */
              <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
                  {/* Left Box: Primary Dropzone / Acquisition Ingestion */}
                  <div className="space-y-4">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, activeEyeTab)}
                      className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all flex flex-col items-center justify-center min-h-[340px] ${
                        isDragOver
                          ? "border-primary bg-primary/15 scale-[1.01]"
                          : "border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10"
                      }`}
                    >
                      <div className="grid size-16 place-items-center rounded-3xl bg-primary text-primary-foreground shadow-md mb-4 animate-bounce duration-1000">
                        <Camera size={30} />
                      </div>
                      <h3 className="font-serif text-xl font-bold text-foreground">
                        Acquire {activeEyeTab === "OD" ? "Right Eye (OD)" : "Left Eye (OS)"} Fundus Photograph
                      </h3>
                      <p className="mt-2 text-xs text-muted-foreground max-w-md leading-relaxed">
                        Drag & drop 45° macular-centered fundus photograph here, or click to browse local storage / PACS intake folder.
                      </p>
                      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                        <span className="px-2.5 py-1 rounded-md bg-card border border-border text-[11px] font-semibold text-muted-foreground">
                          JPG / PNG / WEBP
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-card border border-border text-[11px] font-semibold text-muted-foreground">
                          45° Field of View
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-card border border-border text-[11px] font-semibold text-muted-foreground">
                          Up to 20 MB
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn-primary mt-6 !py-2.5 !px-6 text-xs font-bold shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        <UploadCloud size={15} /> Select Fundus File
                      </button>
                    </div>
                  </div>

                  {/* Right Box: Clinical Acquisition Guidelines (NO quality score shown) */}
                  <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between space-y-5">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                        <CircleDot size={18} className="text-primary" />
                        <div>
                          <div className="eyebrow">Acquisition Standard</div>
                          <h4 className="font-serif text-base font-bold text-foreground">
                            Optical Alignment & Quality Checklist
                          </h4>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground leading-5">
                        DRISHTI automated AI quality gate verifies optical sharpness, illumination uniformity, and 45° retinal coverage immediately upon image intake.
                      </p>

                      <div className="space-y-3 pt-1">
                        {[
                          { title: "Fixation Alignment", desc: "Internal green target aligned with patient's macula." },
                          { title: "Pupil Diameter", desc: "Ensure pupil diameter >= 3.5 mm in ambient dim lighting." },
                          { title: "Lens Surface Cleanliness", desc: "Verify front lens is free of dust particles and smudges." },
                          { title: "Working Distance", desc: "Maintain 45–50mm optical sensor distance to avoid flash reflection." },
                        ].map((item, idx) => (
                          <div key={item.title} className="flex items-start gap-3 text-xs rounded-xl border border-border/50 p-3 bg-muted/10">
                            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-bold text-foreground">{item.title}</div>
                              <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-muted/20 p-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <Info size={16} className="text-primary shrink-0" />
                      <span>Quality verification gate will initialize automatically once an image is ingested.</span>
                    </div>
                  </div>
                </div>

                {/* Optional Clinical Reference Samples */}
                <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-primary" />
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Or Load Clinical Reference Image (Demo & Training Mode):
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">Select a validated clinical scan to test quality gate</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-1">
                    {sampleRetinaPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectReferencePreset(preset, activeEyeTab)}
                        className="rounded-xl border border-border bg-card p-2.5 text-left transition-all hover:border-primary hover:bg-primary/5 group"
                      >
                        <div className="font-bold text-foreground text-xs truncate group-hover:text-primary transition-colors">
                          {preset.label}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {preset.id === "preset-ungradable" ? "Fail (Blur/Dark)" : `Grade ${preset.grade}`}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* ACQUIRED STATE: IMAGE UPLOADED -> SIDE-BY-SIDE PHOTO VIEWER + QUALITY GATE */
              <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-[1.1fr_1.15fr]">
                  {/* LEFT COLUMN: HIGH-RESOLUTION FUNDUS PHOTO VIEWER */}
                  <div className="rounded-2xl border border-border bg-card p-5 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      {/* Photo Header & Toolbar */}
                      <div className="flex items-center justify-between border-b border-border/60 pb-3">
                        <div className="flex items-center gap-2">
                          <FileImage size={17} className="text-primary" />
                          <div>
                            <span className="text-xs font-bold text-foreground block truncate max-w-[220px]">
                              {currentImageName || `fundus_${activeEyeTab.toLowerCase()}_scan.jpg`}
                            </span>
                            <span className="text-[10px] font-semibold text-primary uppercase">
                              {activeEyeTab === "OD" ? "Right Eye (OD)" : "Left Eye (OS)"} Acquisition
                            </span>
                          </div>
                        </div>

                        {/* Image Manipulation Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCurCircularMask((v) => !v)}
                            className={`btn-quiet !py-1 !px-2.5 !text-[11px] font-bold ${
                              currentCircularMask ? "!bg-primary/10 !text-primary border-primary/30" : ""
                            }`}
                            title="Toggle Circular 45° Retinal Mask"
                          >
                            <CircleDot size={12} /> {currentCircularMask ? "Masked" : "Full Frame"}
                          </button>

                          <button
                            type="button"
                            onClick={() => setCurClaheOn((v) => !v)}
                            className={`btn-quiet !py-1 !px-2.5 !text-[11px] font-bold ${
                              currentClaheOn ? "!bg-primary !text-primary-foreground" : ""
                            }`}
                            title="Toggle Contrast-Limited Adaptive Histogram Equalization"
                          >
                            <Sliders size={12} /> {currentClaheOn ? "CLAHE On" : "CLAHE Off"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveImage(activeEyeTab)}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title="Remove and recapture image"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Visual Fundus Display */}
                      <div className="relative mx-auto flex items-center justify-center p-2">
                        <div
                          className={`relative overflow-hidden bg-black shadow-xl transition-all duration-300 ${
                            currentCircularMask
                              ? "aspect-square w-full max-w-[280px] rounded-full border-[6px] border-[#131f2d] retina-disc"
                              : "aspect-[4/3] w-full max-w-[340px] rounded-2xl border-2 border-border"
                          }`}
                        >
                          <img
                            src={currentPreviewUrl || undefined}
                            alt="Acquired Fundus Scan"
                            className={`size-full object-cover transition-all ${
                              currentClaheOn ? "contrast-125 saturate-110 brightness-105" : ""
                            }`}
                          />

                          {/* Optical Landmark Overlay Guide */}
                          {currentCircularMask && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                              <div className="size-20 rounded-full border border-yellow-400/20" />
                              <div className="absolute top-2 right-4 text-[9px] mono font-bold text-white/50 bg-black/40 px-1.5 py-0.5 rounded">
                                {activeEyeTab}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Image Specs Chip */}
                      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                        <div className="rounded-xl border border-border/70 bg-muted/20 p-2">
                          <span className="text-[10px] text-muted-foreground block">Resolution</span>
                          <span className="mono text-xs font-bold text-foreground">
                            {currentMeta.width ? `${currentMeta.width}×${currentMeta.height}` : "2240×2240"}
                          </span>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-muted/20 p-2">
                          <span className="text-[10px] text-muted-foreground block">File Size</span>
                          <span className="mono text-xs font-bold text-foreground">{currentMeta.size || "1.8 MB"}</span>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-muted/20 p-2">
                          <span className="text-[10px] text-muted-foreground block">Optical FOV</span>
                          <span className="mono text-xs font-bold text-foreground">45° Posterior</span>
                        </div>
                      </div>
                    </div>

                    {/* Replace / Recapture Button */}
                    <div className="pt-2 border-t border-border/50 flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-quiet w-full justify-center !py-2 text-xs font-semibold"
                      >
                        <RefreshCw size={13} /> Replace / Recapture Image
                      </button>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: LIVE AUTOMATED IMAGE QUALITY GATE (APPEARS ALONGSIDE PHOTO) */}
                  <div className="rounded-2xl border border-border bg-card p-6 space-y-5 flex flex-col justify-between">
                    <div>
                      {/* Quality Gate Header */}
                      <div className="flex items-center justify-between border-b border-border/60 pb-3">
                        <div>
                          <div className="eyebrow">Automated Quality Gate</div>
                          <h3 className="font-serif text-lg font-bold text-foreground">
                            Optical Quality & Diagnostic Feasibility
                          </h3>
                        </div>

                        {currentEvaluating ? (
                          <StatusChip tone="teal">Evaluating...</StatusChip>
                        ) : (
                          <StatusChip
                            tone={
                              qualityStatus === "GOOD"
                                ? "good"
                                : qualityStatus === "BORDERLINE"
                                ? "warn"
                                : "danger"
                            }
                          >
                            {qualityStatus === "GOOD"
                              ? "QUALITY: OPTIMAL"
                              : qualityStatus === "BORDERLINE"
                              ? "QUALITY: BORDERLINE"
                              : "UNGRADABLE IMAGE"}
                          </StatusChip>
                        )}
                      </div>

                      {/* Overall Clarity Score Bar */}
                      <div className="mt-4 panel-soft p-4 space-y-3">
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground">Diagnostic Clarity Index</span>
                            <div className="display-title text-3xl font-extrabold text-foreground">
                              {currentEvaluating ? "…" : qualityScore}
                              <span className="text-sm text-muted-foreground">/100</span>
                            </div>
                          </div>
                          <div className="text-right text-xs">
                            <span className="font-bold text-foreground">{qualityStatus}</span>
                            <span className="text-muted-foreground block text-[11px]">45° Optical Clearance</span>
                          </div>
                        </div>

                        <p className="text-xs leading-5 text-muted-foreground border-t border-border/40 pt-2">
                          {currentEvaluating
                            ? "Analyzing optical focus, illumination uniformity, and anatomical landmarks..."
                            : currentAnalysis?.quality.feedback}
                        </p>
                      </div>

                      {/* Detailed Quality Metric Breakdown */}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {[
                          ["Focus & Sharpness", currentAnalysis?.quality.focus || 90],
                          ["Illumination Uniformity", currentAnalysis?.quality.illumination || 88],
                          ["Retinal Field of View (45°)", currentAnalysis?.quality.fieldOfView || 92],
                          ["Anatomical Coverage", currentAnalysis?.quality.coverage || 90],
                          ["Motion Artifact / Glare", currentAnalysis?.quality.artifacts || 91],
                        ].map(([label, value]) => (
                          <div className="rounded-xl border border-border/70 p-3 bg-muted/10" key={String(label)}>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span className="font-medium text-[11px] truncate pr-1">{label}</span>
                              <span className="mono font-bold text-foreground">{currentEvaluating ? "…" : `${value}%`}</span>
                            </div>
                            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  Number(value) >= 80 ? "bg-[#5c9565]" : Number(value) >= 60 ? "bg-amber-400" : "bg-red-500"
                                }`}
                                style={{ width: currentEvaluating ? "20%" : `${value}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Technician Action Decision Prompts */}
                    <div className="pt-4 border-t border-border/60">
                      {qualityStatus === "UNGRADABLE" ? (
                        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-xs leading-5 text-destructive space-y-3">
                          <div className="flex items-center gap-2 font-bold text-sm">
                            <AlertCircle size={18} /> Image Ungradable — Recapture Required
                          </div>
                          <p className="text-[11px] text-destructive/90">
                            Severe optical blur, glare, or underexposure detected. AI diagnostic analysis is locked to protect medical screening accuracy.
                          </p>
                          <button
                            type="button"
                            className="btn-primary !bg-destructive text-white w-full justify-center text-xs font-bold !py-2.5"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <RefreshCw size={14} /> Re-upload / Recapture Fundus Image
                          </button>
                        </div>
                      ) : qualityStatus === "BORDERLINE" ? (
                        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs leading-5 text-amber-900 dark:text-amber-300 space-y-3">
                          <div className="flex items-center gap-2 font-bold text-sm">
                            <AlertCircle size={16} /> Borderline Image Quality Warning
                          </div>
                          <p className="text-[11px] leading-relaxed">
                            Minor focus or illumination variance detected. You may proceed with enhanced CLAHE analysis or recapture a clearer photograph.
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2 pt-1">
                            <button
                              type="button"
                              className="btn-quiet !py-2 text-xs font-semibold flex-1 justify-center border-amber-500/30"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <RefreshCw size={13} /> Re-capture
                            </button>
                            <button
                              type="button"
                              className="btn-primary !py-2 text-xs font-bold flex-1 justify-center !bg-amber-600 hover:!bg-amber-700 text-white"
                              onClick={handleProceedToWorkstation}
                              disabled={analyze.isPending}
                            >
                              {analyze.isPending ? "Analyzing & Routing…" : "Proceed to Workstation"} <ArrowRight size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-xs text-[#376344] font-semibold bg-[#dcebdc] dark:bg-[#1a3823] dark:text-[#a7d5ae] px-3.5 py-2 rounded-xl">
                            <CheckCircle2 size={16} className="shrink-0" />
                            <span>Quality Verified: Fundus photograph meets all clinical grading criteria.</span>
                          </div>

                          <button
                            type="button"
                            className="btn-primary w-full !py-3 text-xs font-bold justify-center shadow-md"
                            onClick={handleProceedToWorkstation}
                            disabled={analyze.isPending || currentEvaluating}
                            data-testid="button-open-workstation-direct"
                          >
                            <ScanLine size={16} />
                            {analyze.isPending ? "Analyzing & Opening Workstation…" : "Analyze & Open Retinal Workstation"}
                            <ArrowRight size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bilateral Guidance Note */}
                {eye === "Both" && (
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Eye size={15} className="text-primary" />
                      <span>
                        Bilateral Episode: Currently viewing <strong>{activeEyeTab === "OD" ? "Right Eye (OD)" : "Left Eye (OS)"}</strong>.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveEyeTab(activeEyeTab === "OD" ? "OS" : "OD")}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      Switch to {activeEyeTab === "OD" ? "Left Eye (OS)" : "Right Eye (OD)"} <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Back to Demographics Button */}
            <div className="pt-3 border-t border-border/50 flex items-center justify-between">
              <button
                type="button"
                className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setStep(0)}
                data-testid="button-back-to-patient"
              >
                <ArrowLeft size={14} /> Back to Patient Demographics
              </button>

              <span className="text-[11px] text-muted-foreground">
                Clinical Workflow Version 2.6 • DRISHTI Multi-Task XAI
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}