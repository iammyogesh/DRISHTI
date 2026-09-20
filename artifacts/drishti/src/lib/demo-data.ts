export type DemoCase = {
  caseId: string;
  patientId?: string;
  patientName?: string;
  gender?: string;
  phone?: string;
  researchId?: string;
  age: number;
  diabetesType: string;
  diabetesDuration?: string;
  eye: string;
  qualityStatus: "GOOD" | "BORDERLINE" | "UNGRADABLE";
  aiGrade: number;
  aiLabel: string;
  confidence: number;
  referable: boolean;
  reviewStatus: "AWAITING_REVIEW" | "REVIEWED" | "UNGRADABLE";
  finalGrade?: number | null;
  reviewerName?: string | null;
  reviewerNotes?: string;
  imageUrl?: string;
  createdAt: string;
};

export type LesionItem = {
  type: string;
  confidence: number;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  size?: number;
  description?: string;
};

export type DemoAnalysis = {
  grade: number;
  gradeLabel: string;
  confidence: number;
  referable: boolean;
  probabilities: Record<string, number>;
  modelVersion: string;
  processingTime: number;
  quality: {
    score: number;
    status: string;
    focus: number;
    illumination: number;
    fieldOfView: number;
    coverage: number;
    artifacts: number;
    feedback: string;
  };
  evidence: string[];
  lesions: LesionItem[];
  shapAvailable?: boolean;
  gradable?: boolean;
  images?: {
    original?: string;
    enhanced?: string;
    gradcam_overlay?: string;
    vessel_overlay?: string;
    lesion_overlay?: string;
    vessel_mask?: string;
  };
  vessels?: {
    vesselDensity: string;
    density?: number;
    tortuosityIndex?: string;
    avRatio?: string;
    note?: string;
  };
  opticDisc?: { x: number; y: number; radius: number };
  fovea?: { x: number; y: number; radius: number };
};

export const gradeLabels = ["No DR", "Mild NPDR", "Moderate NPDR", "Severe NPDR", "Proliferative DR"];

// Helper to create SVG data URIs for clinical fundus presets
const createFundusSvg = (grade: number, features: string) => {
  const bgColors: Record<number, string> = {
    0: "radial-gradient(circle at 45% 50%, #8b2500 0%, #4a1000 70%, #1a0500 100%)",
    1: "radial-gradient(circle at 45% 50%, #8c2600 0%, #4c1202 70%, #1c0601 100%)",
    2: "radial-gradient(circle at 45% 50%, #822200 0%, #450f00 70%, #150300 100%)",
    3: "radial-gradient(circle at 45% 50%, #701800 0%, #3a0b00 70%, #0d0100 100%)",
    4: "radial-gradient(circle at 45% 50%, #5e1100 0%, #2f0600 70%, #080000 100%)",
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
    <defs>
      <radialGradient id="fundusBg" cx="45%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#992b02"/>
        <stop offset="70%" stop-color="#4a1101"/>
        <stop offset="100%" stop-color="#140401"/>
      </radialGradient>
      <radialGradient id="discGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff5cc"/>
        <stop offset="70%" stop-color="#f5a623"/>
        <stop offset="100%" stop-color="#c45a00"/>
      </radialGradient>
    </defs>
    <circle cx="200" cy="200" r="195" fill="url(#fundusBg)" stroke="#222" stroke-width="4"/>
    <!-- Optic Disc -->
    <ellipse cx="120" cy="200" rx="30" ry="36" fill="url(#discGlow)" opacity="0.9"/>
    <!-- Retinal Blood Vessels -->
    <path d="M120 180 Q140 130 180 100 T280 70 M120 220 Q140 270 190 300 T290 320 M110 190 Q80 150 50 120 M110 210 Q80 250 50 280" fill="none" stroke="#6b0d00" stroke-width="5" stroke-linecap="round" opacity="0.85"/>
    <path d="M120 180 Q170 140 230 130 T320 140 M120 220 Q170 260 240 265 T330 250" fill="none" stroke="#480500" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
    <!-- Fovea / Macula -->
    <circle cx="255" cy="200" r="14" fill="#2b0500" opacity="0.6"/>
    <circle cx="255" cy="200" r="4" fill="#140200" opacity="0.8"/>
    ${features}
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const sampleRetinaPresets = [
  {
    id: "preset-normal",
    title: "Normal Fundus (Grade 0)",
    grade: 0,
    label: "No DR",
    eye: "Right",
    quality: "GOOD",
    description: "Clear optical disc, normal arteriovenous ratio, intact foveal avascular zone.",
    tag: "NORMAL_SCREENING",
    thumbnail: createFundusSvg(0, ""),
  },
  {
    id: "preset-mild",
    title: "Mild NPDR (Grade 1)",
    grade: 1,
    label: "Mild NPDR",
    eye: "Left",
    quality: "GOOD",
    description: "Discrete microaneurysms temporal to macula; no hemorrhages or hard exudates.",
    tag: "NON_REFERABLE",
    thumbnail: createFundusSvg(
      1,
      `<circle cx="275" cy="180" r="3" fill="#ff1a1a"/>
       <circle cx="290" cy="220" r="2.5" fill="#ff1a1a"/>
       <circle cx="240" cy="165" r="2" fill="#ff1a1a"/>`
    ),
  },
  {
    id: "preset-moderate",
    title: "Moderate NPDR (Grade 2)",
    grade: 2,
    label: "Moderate NPDR",
    eye: "Right",
    quality: "GOOD",
    description: "Multiple microaneurysm clusters, hard lipid exudates encroaching near macula.",
    tag: "REFERABLE_DR",
    thumbnail: createFundusSvg(
      2,
      `<circle cx="275" cy="180" r="4" fill="#ff1a1a"/>
       <circle cx="290" cy="220" r="3.5" fill="#ff1a1a"/>
       <circle cx="230" cy="235" r="5" fill="#cc0000"/>
       <ellipse cx="280" cy="160" rx="4" ry="2" fill="#ffea75" opacity="0.9"/>
       <ellipse cx="295" cy="170" rx="6" ry="3" fill="#ffea75" opacity="0.9"/>
       <ellipse cx="285" cy="178" rx="3" ry="2" fill="#ffea75" opacity="0.9"/>
       <circle cx="210" cy="150" r="4" fill="#b30000"/>`
    ),
  },
  {
    id: "preset-severe",
    title: "Severe NPDR (Grade 3)",
    grade: 3,
    label: "Severe NPDR",
    eye: "Left",
    quality: "BORDERLINE",
    description: "4-2-1 rule positive: blot hemorrhages in 4 quadrants, venous beading, IRMA.",
    tag: "URGENT_REFERRAL",
    thumbnail: createFundusSvg(
      3,
      `<circle cx="160" cy="120" r="10" fill="#8b0000" opacity="0.9"/>
       <circle cx="290" cy="110" r="12" fill="#8b0000" opacity="0.9"/>
       <circle cx="150" cy="290" r="11" fill="#8b0000" opacity="0.9"/>
       <circle cx="280" cy="290" r="13" fill="#8b0000" opacity="0.9"/>
       <path d="M120 180 Q145 150 170 140 T210 135" fill="none" stroke="#5a0500" stroke-width="6" stroke-dasharray="4,3"/>
       <circle cx="260" cy="180" r="6" fill="#ff2222"/>
       <circle cx="240" cy="220" r="7" fill="#b30000"/>`
    ),
  },
  {
    id: "preset-pdr",
    title: "Proliferative DR (Grade 4)",
    grade: 4,
    label: "Proliferative DR",
    eye: "Both",
    quality: "GOOD",
    description: "Active neovascularization of the optic disc (NVD), vitreous traction, preretinal hemorrhage.",
    tag: "EMERGENCY_REFERRAL",
    thumbnail: createFundusSvg(
      4,
      `<path d="M120 190 Q125 170 135 175 T140 195 T130 210 Z" fill="none" stroke="#ff3333" stroke-width="2.5"/>
       <path d="M120 200 Q130 185 145 190 T150 205" fill="none" stroke="#ff4444" stroke-width="2"/>
       <ellipse cx="230" cy="230" rx="35" ry="18" fill="#500000" opacity="0.95"/>
       <path d="M210 220 Q240 210 265 225" fill="none" stroke="#ff8888" stroke-width="3" opacity="0.7"/>`
    ),
  },
  {
    id: "preset-ungradable",
    title: "Ungradable Quality (Blur/Dark)",
    grade: 0,
    label: "Ungradable",
    eye: "Right",
    quality: "UNGRADABLE",
    description: "Severe motion blur and underexposure. Requires camera stabilization and immediate recapture.",
    tag: "RECAPTURE_REQUIRED",
    thumbnail: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <circle cx="200" cy="200" r="195" fill="#0d0402" stroke="#222" stroke-width="4"/>
        <ellipse cx="180" cy="200" rx="90" ry="40" fill="#3a1005" opacity="0.4" transform="rotate(-25 180 200)"/>
        <text x="200" y="210" fill="#ff4444" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle">UNGRADABLE (BLUR/DARK)</text>
      </svg>
    `)}`,
  },
];

export const demoCases: DemoCase[] = [
  {
    caseId: "DR-2026-0142",
    researchId: "IDRID-0482",
    age: 56,
    diabetesType: "Type 2 (12 yrs)",
    eye: "Right",
    qualityStatus: "GOOD",
    aiGrade: 2,
    aiLabel: "Moderate NPDR",
    confidence: 0.912,
    referable: true,
    reviewStatus: "AWAITING_REVIEW",
    finalGrade: null,
    createdAt: "2026-08-23T09:42:00Z",
  },
  {
    caseId: "DR-2026-0141",
    researchId: "APTOS-1092",
    age: 48,
    diabetesType: "Type 2 (5 yrs)",
    eye: "Both",
    qualityStatus: "GOOD",
    aiGrade: 1,
    aiLabel: "Mild NPDR",
    confidence: 0.884,
    referable: false,
    reviewStatus: "REVIEWED",
    finalGrade: 1,
    createdAt: "2026-08-23T09:18:00Z",
    reviewerNotes: "Confirmed Mild NPDR. Isolated microaneurysms temporal to macula. Advised strict glycemic control and 9-month follow-up.",
  },
  {
    caseId: "DR-2026-0140",
    researchId: "IDRID-0480",
    age: 63,
    diabetesType: "Type 2 (18 yrs)",
    eye: "Left",
    qualityStatus: "BORDERLINE",
    aiGrade: 3,
    aiLabel: "Severe NPDR",
    confidence: 0.941,
    referable: true,
    reviewStatus: "AWAITING_REVIEW",
    finalGrade: null,
    createdAt: "2026-08-23T08:55:00Z",
  },
  {
    caseId: "DR-2026-0139",
    researchId: "EYEPACS-8839",
    age: 39,
    diabetesType: "Type 1 (14 yrs)",
    eye: "Right",
    qualityStatus: "UNGRADABLE",
    aiGrade: 0,
    aiLabel: "Ungradable",
    confidence: 0.18,
    referable: false,
    reviewStatus: "UNGRADABLE",
    finalGrade: null,
    createdAt: "2026-08-22T16:30:00Z",
    reviewerNotes: "Image rejected at quality gate due to motion blur and severe under-illumination. Recapture requested.",
  },
  {
    caseId: "DR-2026-0138",
    researchId: "APTOS-0838",
    age: 71,
    diabetesType: "Type 2 (24 yrs)",
    eye: "Both",
    qualityStatus: "GOOD",
    aiGrade: 4,
    aiLabel: "Proliferative DR",
    confidence: 0.967,
    referable: true,
    reviewStatus: "REVIEWED",
    finalGrade: 4,
    createdAt: "2026-08-22T15:12:00Z",
    reviewerNotes: "Urgent: Active neovascularization of the disc (NVD) with vitreous traction. Scheduled for immediate pan-retinal photocoagulation at District Hospital.",
  },
  {
    caseId: "DR-2026-0137",
    researchId: "MESSIDOR-0137",
    age: 44,
    diabetesType: "Type 2 (3 yrs)",
    eye: "Left",
    qualityStatus: "GOOD",
    aiGrade: 0,
    aiLabel: "No DR",
    confidence: 0.953,
    referable: false,
    reviewStatus: "REVIEWED",
    finalGrade: 0,
    createdAt: "2026-08-22T14:46:00Z",
    reviewerNotes: "Clear retinal vasculature and sharp macula. Normal screening outcome. Annual rescreening scheduled.",
  },
];

export const demoAnalysisByGrade: Record<number, DemoAnalysis> = {
  0: {
    grade: 0,
    gradeLabel: "No DR",
    confidence: 0.953,
    referable: false,
    probabilities: { "No DR": 0.953, "Mild NPDR": 0.031, "Moderate NPDR": 0.012, "Severe NPDR": 0.003, "Proliferative DR": 0.001 },
    modelVersion: "DRISHTI-XAI v1.2 (ResNet50 + CLAHE + Grad-CAM)",
    processingTime: 1.74,
    quality: {
      score: 95,
      status: "GOOD",
      focus: 96,
      illumination: 94,
      fieldOfView: 97,
      coverage: 95,
      artifacts: 94,
      feedback: "Excellent fundus image quality. Macula, fovea, and optic disc clearly visible for clinical inference.",
    },
    evidence: [
      "Normal retinal vasculature with distinct vessel margins",
      "Optic disc boundaries clearly demarcated and sharp",
      "Macular avascular zone (FAZ) intact without microvascular abnormalities",
      "No microaneurysms, hemorrhages, or lipid exudation detected",
    ],
    lesions: [],
    shapAvailable: true,
    opticDisc: { x: 79, y: 49, radius: 36 },
    fovea: { x: 46, y: 46, radius: 14 },
  },
  1: {
    grade: 1,
    gradeLabel: "Mild NPDR",
    confidence: 0.884,
    referable: false,
    probabilities: { "No DR": 0.062, "Mild NPDR": 0.884, "Moderate NPDR": 0.041, "Severe NPDR": 0.010, "Proliferative DR": 0.003 },
    modelVersion: "DRISHTI-XAI v1.2 (ResNet50 + CLAHE + Grad-CAM)",
    processingTime: 1.82,
    quality: {
      score: 93,
      status: "GOOD",
      focus: 94,
      illumination: 91,
      fieldOfView: 95,
      coverage: 92,
      artifacts: 90,
      feedback: "Image suitable for assisted grading. Microvascular structures in focus.",
    },
    evidence: [
      "Isolated microaneurysms detected temporal to the foveal avascular zone",
      "No soft exudates (cotton wool spots) or intraretinal microvascular abnormalities",
      "Vessel caliber ratio (Arteriole-to-Venule) within normal baseline",
    ],
    lesions: [
      { type: "Microaneurysm", confidence: 0.88, x: 62, y: 44, description: "Small outpouching in capillary wall near superior temporal arcade" },
      { type: "Microaneurysm", confidence: 0.82, x: 57, y: 38, description: "Isolated punctate microvascular lesion" },
    ],
    shapAvailable: true,
    opticDisc: { x: 79, y: 49, radius: 36 },
    fovea: { x: 46, y: 46, radius: 14 },
  },
  2: {
    grade: 2,
    gradeLabel: "Moderate NPDR",
    confidence: 0.912,
    referable: true,
    probabilities: { "No DR": 0.014, "Mild NPDR": 0.052, "Moderate NPDR": 0.912, "Severe NPDR": 0.018, "Proliferative DR": 0.004 },
    modelVersion: "DRISHTI-XAI v1.2 (ResNet50 + CLAHE + Grad-CAM)",
    processingTime: 1.84,
    quality: {
      score: 92,
      status: "GOOD",
      focus: 93,
      illumination: 90,
      fieldOfView: 95,
      coverage: 92,
      artifacts: 88,
      feedback: "High clarity image. Disc, macula, and vascular arcades are fully gradable.",
    },
    evidence: [
      "Multiple discrete microaneurysm clusters across superior temporal arcade",
      "Hard lipid exudates identified encroaching near macular region",
      "Scattered flame and dot hemorrhages in inferior temporal quadrant",
      "Referable DR detected (Grade 2+) requiring 3–6 month specialist evaluation",
    ],
    lesions: [
      { type: "Microaneurysm", confidence: 0.92, x: 61, y: 42, description: "Punctate microvascular dilatation" },
      { type: "Hard Exudate", confidence: 0.86, x: 72, y: 35, description: "Yellowish lipid and protein residue deposit" },
      { type: "Dot Hemorrhage", confidence: 0.89, x: 68, y: 56, description: "Deep intraretinal capillary bleed" },
      { type: "Cotton Wool Spot", confidence: 0.78, x: 45, y: 62, description: "Localized axoplasmic stasis in nerve fiber layer" },
    ],
    shapAvailable: true,
    opticDisc: { x: 79, y: 49, radius: 36 },
    fovea: { x: 46, y: 46, radius: 14 },
  },
  3: {
    grade: 3,
    gradeLabel: "Severe NPDR",
    confidence: 0.941,
    referable: true,
    probabilities: { "No DR": 0.002, "Mild NPDR": 0.011, "Moderate NPDR": 0.038, "Severe NPDR": 0.941, "Proliferative DR": 0.008 },
    modelVersion: "DRISHTI-XAI v1.2 (ResNet50 + CLAHE + Grad-CAM)",
    processingTime: 2.45,
    quality: {
      score: 68,
      status: "BORDERLINE",
      focus: 71,
      illumination: 64,
      fieldOfView: 75,
      coverage: 69,
      artifacts: 62,
      feedback: "Image passed with adaptive CLAHE enhancement: illumination corrected for assisted grading.",
    },
    evidence: [
      "Extensive intraretinal hemorrhages observed in all 4 retinal quadrants (4-2-1 rule)",
      "Definite venous beading detected along the superior temporal vein",
      "Prominent intraretinal microvascular abnormalities (IRMA) identified",
      "Urgent referable alert: high risk of progression to proliferative DR",
    ],
    lesions: [
      { type: "Blot Hemorrhage (Q1)", confidence: 0.95, x: 64, y: 32, description: "Extensive blot bleed in superior temporal quadrant" },
      { type: "Blot Hemorrhage (Q2)", confidence: 0.93, x: 38, y: 41, description: "Large intraretinal bleed in superior nasal quadrant" },
      { type: "Blot Hemorrhage (Q3)", confidence: 0.91, x: 44, y: 68, description: "Inferior nasal hemorrhage cluster" },
      { type: "Blot Hemorrhage (Q4)", confidence: 0.94, x: 71, y: 63, description: "Inferior temporal hemorrhage cluster" },
      { type: "Venous Beading", confidence: 0.89, x: 52, y: 36, description: "Irregular caliber changes in retinal vein" },
      { type: "IRMA Candidate", confidence: 0.84, x: 58, y: 59, description: "Intraretinal microvascular shunt vessels" },
    ],
    shapAvailable: true,
    opticDisc: { x: 79, y: 49, radius: 36 },
    fovea: { x: 46, y: 46, radius: 14 },
  },
  4: {
    grade: 4,
    gradeLabel: "Proliferative DR",
    confidence: 0.967,
    referable: true,
    probabilities: { "No DR": 0.001, "Mild NPDR": 0.003, "Moderate NPDR": 0.011, "Severe NPDR": 0.018, "Proliferative DR": 0.967 },
    modelVersion: "DRISHTI-XAI v1.2 (ResNet50 + CLAHE + Grad-CAM)",
    processingTime: 1.95,
    quality: {
      score: 91,
      status: "GOOD",
      focus: 92,
      illumination: 89,
      fieldOfView: 94,
      coverage: 91,
      artifacts: 87,
      feedback: "High contrast image. Disc and neovascular arcade are sharply visible.",
    },
    evidence: [
      "Active neovascularization of the optic disc (NVD) with capillary loops",
      "Extensive preretinal and vitreous hemorrhage compromising visual axis",
      "Severe fibrovascular traction across temporal arcades",
      "Critical referable emergency: immediate pan-retinal photocoagulation recommended",
    ],
    lesions: [
      { type: "Neovascularization (NVD)", confidence: 0.98, x: 50, y: 48, description: "Fragile new vessel formation on optic nerve head" },
      { type: "Vitreous Traction", confidence: 0.94, x: 56, y: 44, description: "Preretinal fibrovascular tissue tugging retina" },
      { type: "Preretinal Hemorrhage", confidence: 0.96, x: 67, y: 52, description: "Boat-shaped hemorrhage anterior to internal limiting membrane" },
      { type: "Fibrovascular Proliferation", confidence: 0.91, x: 43, y: 54, description: "Gliosis and secondary vascular sprouting" },
    ],
    shapAvailable: true,
    opticDisc: { x: 79, y: 49, radius: 36 },
    fovea: { x: 46, y: 46, radius: 14 },
  },
};

export const demoAnalysis: DemoAnalysis = demoAnalysisByGrade[2];

// 5x5 Confusion Matrix data for Research Validation (Rows: Ground Truth, Columns: Predicted)
export const confusionMatrix5x5 = {
  labels: ["No DR", "Mild NPDR", "Mod NPDR", "Sev NPDR", "PDR"],
  matrix: [
    [1840, 68, 12, 0, 0],    // Actual No DR
    [48, 864, 52, 6, 0],     // Actual Mild NPDR
    [8, 38, 912, 42, 10],    // Actual Mod NPDR
    [0, 4, 32, 440, 24],     // Actual Sev NPDR
    [0, 0, 6, 18, 376],      // Actual PDR
  ],
  totals: {
    samples: 4800,
    accuracy: 92.33,
    referableSensitivity: 94.8,  // Target >90%
    referableSpecificity: 92.1,  // Target >85%
    rocAuc: 0.974,
  },
};

export const researchBenchmarks = [
  { dataset: "APTOS 2019 (Blindness Detection)", samples: 3662, sensitivity: 94.8, specificity: 92.1, rocAuc: 0.974, f1Score: 0.932, year: 2019, origin: "Aravind Eye Hospital / Kaggle" },
  { dataset: "IDRiD (Indian Retinopathy Dataset)", samples: 516, sensitivity: 93.9, specificity: 90.6, rocAuc: 0.961, f1Score: 0.921, year: 2018, origin: "Eye Clinic Nanded, India" },
  { dataset: "EyePACS (Kaggle Standard)", samples: 17480, sensitivity: 92.4, specificity: 89.8, rocAuc: 0.953, f1Score: 0.908, year: 2015, origin: "EyePACS Tele-ophthalmology" },
  { dataset: "Messidor-2 (Clinical Benchmark)", samples: 3192, sensitivity: 95.2, specificity: 93.4, rocAuc: 0.981, f1Score: 0.945, year: 2014, origin: "Messidor Research Consortium" },
];

export const formatDate = (value: string) => {
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d);
  } catch {
    return value;
  }
};