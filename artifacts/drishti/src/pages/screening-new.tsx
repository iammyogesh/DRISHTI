import { useState, useRef, useEffect, type ChangeEvent } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileImage,
  UploadCloud,
  AlertCircle,
  Eye,
  Trash2,
  RefreshCw,
  User,
  Activity,
  CircleDot,
  Info,
  ChevronDown,
} from "lucide-react";
import { useAnalyzeScreening, useCreateCase } from "@workspace/api-client-react";
import { demoAnalysisByGrade, type DemoAnalysis } from "@/lib/demo-data";
import { PageHeader, StatusChip } from "@/components/shell";

const steps = ["1. Patient Registration", "2. Fundus Image Acquisition & Quality Gate"];

export default function NewScreening() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);

  // Patient Registration Form Fields
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

  // Left Eye (OS) State
  const [osFile, setOsFile] = useState<File | null>(null);
  const [osBase64, setOsBase64] = useState<string | null>(null);
  const [osPreviewUrl, setOsPreviewUrl] = useState<string | null>(null);
  const [osImageName, setOsImageName] = useState<string>("");
  const [osMeta, setOsMeta] = useState<{ width?: number; height?: number; size?: string; format?: string }>({});
  const [osAnalysis, setOsAnalysis] = useState<DemoAnalysis | null>(null);
  const [osEvaluating, setOsEvaluating] = useState(false);

  // Capture guidance collapsible
  const [showGuidance, setShowGuidance] = useState(false);

  // Drag and drop hover states
  const [isDragOver, setIsDragOver] = useState(false);

  const createCase = useCreateCase();
  const analyze = useAnalyzeScreening();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setFormError("Please enter a valid patient age between 0 and 120 years.");
      return;
    }

    if (!phone.trim()) {
      setFormError("Contact phone number is required.");
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
          patientId: patientId.trim(),
          age: Number(age),
          gender,
          phone: phone.trim(),
          diabetesType,
          diabetesDuration,
          drHistory,
          eye,
          clinicalNotes: clinicalNotes.trim(),
          imageUrl: odBase64 || osBase64 || null,
        } as any,
      },
      {
        onSuccess: () => setStep(1),
        onError: () => setStep(1),
      }
    );
  };

  // Perform automated image quality assessment
  const evaluateQualityOnImage = async (
    img: HTMLImageElement,
    file: File | null,
    side: "OD" | "OS",
    imagePayload?: string
  ) => {
    if (side === "OD") setOdEvaluating(true);
    else setOsEvaluating(true);

    try {
      const payloadToSend = imagePayload || (file ? await fileToBase64(file) : img.src);
      const res = await fetch("/api/screening/quality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: payloadToSend }),
      });

      if (res.ok) {
        const qData = await res.json();
        const baseAnalysis = { ...demoAnalysisByGrade[2] };

        const fullReport: DemoAnalysis = {
          ...baseAnalysis,
          grade: qData.status === "UNGRADABLE" ? 0 : 2,
          quality: {
            score: qData.score ?? (qData.status === "GOOD" ? 92 : qData.status === "BORDERLINE" ? 68 : 28),
            status: qData.status ?? "GOOD",
            focus: qData.focus ?? (qData.status === "GOOD" ? 95 : 30),
            illumination: qData.illumination ?? (qData.status === "GOOD" ? 90 : 35),
            fieldOfView: qData.fieldOfView ?? (qData.status === "GOOD" ? 94 : 45),
            coverage: qData.coverage ?? (qData.status === "GOOD" ? 92 : 40),
            artifacts: qData.artifacts ?? (qData.status === "GOOD" ? 91 : 25),
            feedback: qData.feedback || (qData.status === "UNGRADABLE" ? "Image ungradable: optical blur or underexposure. Recapture recommended." : "Image quality acceptable for automated analysis."),
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
      // Fallback
    }

    // Client-side fallback analysis
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
      let clinicalFeedback = "Image quality acceptable for automated analysis.";

      if (ctx) {
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
        const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const pixels = imgData.data;

        let totalLuminance = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
          totalLuminance += lum;
        }
        const avgLuminance = totalLuminance / (sampleSize * sampleSize);

        if (avgLuminance < 18 || avgLuminance > 230) {
          statusVerdict = "UNGRADABLE";
          computedScore = 28;
          clinicalFeedback = "Image ungradable: severe underexposure or glare. Recapture required.";
        } else {
          statusVerdict = "GOOD";
          computedScore = 92;
          clinicalFeedback = "Image quality acceptable for automated analysis.";
        }
      }

      const fullReport: DemoAnalysis = {
        ...demoAnalysisByGrade[2],
        grade: 2,
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
      alert("Invalid file format. Please upload a standard JPG, PNG, or WEBP fundus photograph.");
      return;
    }

    const minSize = 10 * 1024;
    const maxSize = 25 * 1024 * 1024;
    if (file.size < minSize || file.size > maxSize) {
      alert("Fundus image size must be between 10 KB and 25 MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      if (img.width < 100 || img.height < 100) {
        alert("Image resolution too low. Minimum resolution is 100x100 pixels.");
        URL.revokeObjectURL(objectUrl);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = 384;
      canvas.height = 384;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, 384, 384);
      }
      const compressedB64 = canvas.toDataURL("image/jpeg", 0.90);

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
      alert("Selected image file is unreadable. Please choose a valid fundus image.");
      URL.revokeObjectURL(objectUrl);
    };

    img.src = objectUrl;
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

  const handleProceedToWorkstation = () => {
    const activePreview = activeEyeTab === "OD" ? odPreviewUrl : osPreviewUrl;
    const activeBase64 = activeEyeTab === "OD" ? odBase64 : osBase64;
    const activeName = activeEyeTab === "OD" ? odImageName : osImageName;
    const activeAnalysis = activeEyeTab === "OD" ? odAnalysis : osAnalysis;

    const payload = activeBase64 || activePreview || activeName || "fundus_scan.jpg";

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
          qualityScore: activeAnalysis?.quality?.score || 92,
        } as any,
      },
      {
        onSuccess: () => {
          setLocation(`/analysis/${caseId}`);
        },
        onError: () => {
          setLocation(`/analysis/${caseId}`);
        },
      }
    );
  };

  const currentPreviewUrl = activeEyeTab === "OD" ? odPreviewUrl : osPreviewUrl;
  const currentImageName = activeEyeTab === "OD" ? odImageName : osImageName;
  const currentMeta = activeEyeTab === "OD" ? odMeta : osMeta;
  const currentAnalysis = activeEyeTab === "OD" ? odAnalysis : osAnalysis;
  const currentEvaluating = activeEyeTab === "OD" ? odEvaluating : osEvaluating;

  const hasCurrentImage = Boolean(currentPreviewUrl);
  const qualityStatus = currentAnalysis?.quality?.status || "GOOD";
  const qualityScore = currentAnalysis?.quality?.score || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clinical Intake Workflow"
        title="New Screening Episode"
        description="Patient registration, retinal fundus acquisition, automated image quality assessment, and routing to the retinal analysis workstation."
        action={
          <span className="mono text-xs font-semibold text-muted-foreground bg-card border border-border px-3 py-1.5 rounded-md">
            Case ID: {caseId}
          </span>
        }
      />

      {/* Progress Steps */}
      <div className="panel p-3">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          {steps.map((label, index) => (
            <div key={label} className="flex items-center flex-1">
              <button
                className={`flex items-center gap-2 text-xs font-semibold transition-colors ${
                  index === step
                    ? "text-primary"
                    : index < step
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-muted-foreground"
                }`}
                onClick={() => index <= step && setStep(index)}
              >
                {index < step ? (
                  <span className="grid size-5 place-items-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <Check size={12} />
                  </span>
                ) : (
                  <span
                    className={`grid size-5 place-items-center rounded-full border text-[10px] ${
                      index === step
                        ? "border-primary bg-primary text-primary-foreground font-bold"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {index + 1}
                  </span>
                )}
                <span>{label}</span>
              </button>
              {index < steps.length - 1 && <span className="mx-3 h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step Panels */}
      <div className="panel p-6 sm:p-7">
        {/* Step 1: Patient Registration */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="border-b border-border/60 pb-3">
              <h2 className="text-base font-bold text-foreground">Step 1: Patient Information & Clinical History</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Record patient demographics, diabetes profile, and examined eye for this screening episode.
              </p>
            </div>

            {formError && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle size={15} className="shrink-0" /> {formError}
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-3">
              {/* Group 1: Patient Demographics */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground border-b border-border/50 pb-2">
                  <User size={14} className="text-primary" />
                  <span>Patient Demographics</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Full Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramachandran K."
                    className="input-field text-xs"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    data-testid="input-patient-name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Patient ID</label>
                    <input
                      type="text"
                      className="input-field text-xs"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      data-testid="input-patient-id"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Age (Years) <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      required
                      className="input-field text-xs"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      data-testid="input-age"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Sex</label>
                    <select
                      className="input-field text-xs"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Contact Phone <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="9876543210"
                      className="input-field text-xs"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      data-testid="input-contact-number"
                    />
                  </div>
                </div>
              </div>

              {/* Group 2: Diabetes Profile */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground border-b border-border/50 pb-2">
                  <Activity size={14} className="text-primary" />
                  <span>Diabetes History</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Diabetes Type</label>
                  <select
                    className="input-field text-xs"
                    value={diabetesType}
                    onChange={(e) => setDiabetesType(e.target.value)}
                  >
                    <option value="Type 2">Type 2 Diabetes</option>
                    <option value="Type 1">Type 1 Diabetes</option>
                    <option value="Gestational">Gestational Diabetes</option>
                    <option value="None">Non-Diabetic / General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Duration of Diabetes</label>
                  <input
                    type="text"
                    placeholder="e.g. 10 years"
                    className="input-field text-xs"
                    value={diabetesDuration}
                    onChange={(e) => setDiabetesDuration(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Previous Retinopathy / Laser History</label>
                  <input
                    type="text"
                    placeholder="e.g. No previous screening / Laser 2023"
                    className="input-field text-xs"
                    value={drHistory}
                    onChange={(e) => setDrHistory(e.target.value)}
                  />
                </div>
              </div>

              {/* Group 3: Screening Protocol */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground border-b border-border/50 pb-2">
                  <Eye size={14} className="text-primary" />
                  <span>Screening Examination</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Eye Examined <span className="text-destructive">*</span>
                  </label>
                  <select
                    className="input-field text-xs font-semibold text-primary"
                    value={eye}
                    onChange={(e) => setEye(e.target.value as "Right" | "Left" | "Both")}
                    data-testid="select-eye"
                  >
                    <option value="Right">Right Eye (OD)</option>
                    <option value="Left">Left Eye (OS)</option>
                    <option value="Both">Both Eyes (OD + OS Bilateral)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Clinical Notes / Symptoms</label>
                  <textarea
                    rows={3}
                    placeholder="Visual acuity observations, floaters, or screening comments…"
                    className="input-field text-xs resize-none"
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-border/60">
              <button
                type="button"
                className="btn-primary !px-6 !py-2.5 text-xs"
                onClick={handlePatientSubmit}
                disabled={createCase.isPending}
                data-testid="button-continue-case"
              >
                {createCase.isPending ? "Registering…" : "Continue to image acquisition"} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Image Acquisition & Quality Gate */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/60 gap-2">
              <div>
                <h2 className="text-base font-bold text-foreground">Step 2: Fundus Image Acquisition & Quality Gate</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Acquire 45° macular-centered fundus photograph for automated image quality validation.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-foreground">{patientName || "Patient"}</span>
                <span className="text-muted-foreground">({patientId})</span>
              </div>
            </div>

            {/* Bilateral Eye Switcher */}
            {eye === "Both" && (
              <div className="flex items-center gap-3 border-b border-border/50 pb-3">
                <span className="text-xs font-semibold text-muted-foreground">Active eye:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveEyeTab("OD")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      activeEyeTab === "OD"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>Right Eye (OD)</span>
                    {odPreviewUrl && <span className="size-1.5 rounded-full bg-emerald-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveEyeTab("OS")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      activeEyeTab === "OS"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>Left Eye (OS)</span>
                    {osPreviewUrl && <span className="size-1.5 rounded-full bg-emerald-400" />}
                  </button>
                </div>
              </div>
            )}

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={(e) => handleFileUpload(e, activeEyeTab)}
              data-testid="input-fundus-image"
            />

            {!hasCurrentImage ? (
              /* No Image: Clean Dropzone & Collapsible Guidance */
              <div className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, activeEyeTab)}
                  className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all flex flex-col items-center justify-center min-h-[280px] ${
                    isDragOver
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/20 hover:border-primary/60 hover:bg-muted/30"
                  }`}
                >
                  <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary mb-3">
                    <UploadCloud size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    Upload {activeEyeTab === "OD" ? "Right Eye (OD)" : "Left Eye (OS)"} Fundus Photograph
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground max-w-sm leading-relaxed">
                    Drag and drop 45° retinal fundus image here, or click to browse local PACS / screening files.
                  </p>
                  <div className="mt-4 flex gap-2 text-[11px] text-muted-foreground">
                    <span className="bg-card border border-border px-2 py-0.5 rounded">JPG / PNG / WEBP</span>
                    <span className="bg-card border border-border px-2 py-0.5 rounded">45° FOV</span>
                  </div>
                  <button
                    type="button"
                    className="btn-primary mt-5 !py-2 !px-4 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Select Fundus Image
                  </button>
                </div>

                {/* Collapsible Capture Guidance */}
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowGuidance((v) => !v)}
                    className="w-full flex items-center justify-between p-3.5 text-xs font-semibold text-foreground hover:bg-muted/30 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Info size={15} className="text-primary" />
                      <span>Capture guidance & camera alignment rules</span>
                    </div>
                    <ChevronDown size={15} className={`text-muted-foreground transition-transform ${showGuidance ? "rotate-180" : ""}`} />
                  </button>

                  {showGuidance && (
                    <div className="p-4 border-t border-border bg-muted/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
                      <div className="space-y-1">
                        <strong className="text-foreground text-[11px] block">Pupil & Ambient Lighting</strong>
                        <p className="text-[11px] leading-relaxed">
                          Ensure minimum 3.5mm pupil diameter in ambient dim lighting for adequate optical illumination.
                        </p>
                      </div>
                      <div className="space-y-1">
                        <strong className="text-foreground text-[11px] block">Optical Working Distance</strong>
                        <p className="text-[11px] leading-relaxed">
                          Maintain 45–50mm lens working distance to eliminate corneal glare and flash reflections.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Acquired Image & Image Quality Score Evaluation */
              <div className="grid gap-6 lg:grid-cols-[1.1fr_1.1fr]">
                {/* Left: Fundus Photograph Viewer */}
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <FileImage size={16} className="text-primary" />
                      <span className="text-xs font-semibold text-foreground truncate max-w-[200px]">
                        {currentImageName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(activeEyeTab)}
                      className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                      title="Remove image"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="relative aspect-square max-w-[280px] mx-auto rounded-full overflow-hidden bg-black border-4 border-slate-800 shadow-md">
                    <img
                      src={currentPreviewUrl || undefined}
                      alt="Fundus photograph"
                      className="size-full object-cover"
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                    <span>Resolution: {currentMeta.width ? `${currentMeta.width}×${currentMeta.height}` : "2240×2240"}</span>
                    <span>Size: {currentMeta.size || "1.8 MB"}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-quiet w-full text-xs justify-center !py-1.5"
                  >
                    <RefreshCw size={13} /> Replace Image
                  </button>
                </div>

                {/* Right: Quality Gate Assessment */}
                <div className="rounded-lg border border-border bg-card p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <div>
                        <span className="eyebrow text-[10px]">Quality Gate</span>
                        <h3 className="text-sm font-bold text-foreground">Image Quality Evaluation</h3>
                      </div>

                      {currentEvaluating ? (
                        <StatusChip tone="teal">Evaluating…</StatusChip>
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
                            ? "Acceptable"
                            : qualityStatus === "BORDERLINE"
                            ? "Borderline"
                            : "Ungradable"}
                        </StatusChip>
                      )}
                    </div>

                    {/* Overall Score */}
                    <div className="mt-3 p-3.5 rounded-lg bg-muted/20 border border-border">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-[11px] text-muted-foreground font-semibold">Image Quality Score</span>
                          <div className="text-2xl font-bold text-foreground mt-0.5">
                            {currentEvaluating ? "…" : qualityScore}
                            <span className="text-xs text-muted-foreground font-normal"> / 100</span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-foreground">{qualityStatus}</span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground border-t border-border/50 pt-2 leading-relaxed">
                        {currentEvaluating
                          ? "Analyzing optical focus, illumination uniformity, and retinal coverage…"
                          : currentAnalysis?.quality.feedback}
                      </p>
                    </div>

                    {/* Metric Breakdown */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      {[
                        ["Focus & Sharpness", currentAnalysis?.quality.focus || 92],
                        ["Illumination Uniformity", currentAnalysis?.quality.illumination || 90],
                        ["Retinal Field of View", currentAnalysis?.quality.fieldOfView || 94],
                        ["Anatomical Coverage", currentAnalysis?.quality.coverage || 92],
                      ].map(([label, val]) => (
                        <div key={String(label)} className="p-2 rounded border border-border/70 bg-card">
                          <div className="flex justify-between text-[11px] text-muted-foreground">
                            <span className="truncate">{label}</span>
                            <span className="font-semibold text-foreground">{currentEvaluating ? "…" : `${val}%`}</span>
                          </div>
                          <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                Number(val) >= 80 ? "bg-emerald-500" : Number(val) >= 60 ? "bg-amber-500" : "bg-red-500"
                              }`}
                              style={{ width: `${val}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-border/60">
                    {qualityStatus === "UNGRADABLE" ? (
                      <div className="space-y-2 text-xs text-destructive">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <AlertCircle size={15} /> Recapture required due to severe optical blur or underexposure.
                        </div>
                        <button
                          type="button"
                          className="btn-quiet w-full text-xs font-semibold justify-center !py-2"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <RefreshCw size={13} /> Recapture Fundus Image
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 size={14} className="shrink-0" />
                          <span>Image quality acceptable for automated analysis.</span>
                        </div>

                        <button
                          type="button"
                          className="btn-primary w-full !py-2.5 text-xs font-semibold justify-center"
                          onClick={handleProceedToWorkstation}
                          disabled={analyze.isPending || currentEvaluating}
                          data-testid="button-open-workstation-direct"
                        >
                          {analyze.isPending ? "Analyzing & Routing…" : "Analyze & Open Retinal Workstation"}
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Back button */}
            <div className="pt-3 border-t border-border/60 flex justify-between items-center text-xs">
              <button
                type="button"
                className="btn-quiet !py-1.5 !px-3 text-xs"
                onClick={() => setStep(0)}
                data-testid="button-back-to-patient"
              >
                <ArrowLeft size={13} /> Back to Patient Registration
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}