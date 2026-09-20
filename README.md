h=# DRISHTI (दृष्टि)
### Explainable AI & Deep Learning Platform for Diabetic Retinopathy Screening in Rural India
**Smart India Hackathon (SIH 2026)**  
*Institution:* GL Bajaj Group of Institutions, Mathura  
*Team:* Agrim

---

## 1. Executive Summary & Problem Context

Diabetic Retinopathy (DR) is the primary cause of preventable blindness among working-age adults globally. In India, with over **77 million individuals living with diabetes** and a severe deficit of ophthalmologists in rural Primary Health Centres (PHCs) and Community Health Centres (CHCs), regular manual screening is infeasible.

Portable fundus cameras enable decentralized retinal imaging at grassroots clinics, but real-world screening faces 3 critical barriers:
1. **Variable Image Quality:** Motion blur, underexposure, poor illumination, off-center capture, and media opacities produce diagnostic misclassifications if unvetted.
2. **The "Black-Box" AI Dilemma:** Unexplained numerical grades cannot be audited or trusted by clinicians and visiting ophthalmologists.
3. **Tele-Ophthalmology Backlogs:** Without automated triage, district hospitals are inundated with ungradable scans and routine non-referable cases.

**DRISHTI** solves these challenges with an integrated, quality-aware, explainable, human-in-the-loop clinical decision support and tele-ophthalmology screening system powered by PyTorch deep learning and classical computer vision.

---

## 2. End-to-End Screening Workflow

```
       [ Patient Demographics & Consent (DPDP Act 2023) ]
                              │
                              ▼
        [ Retinal Fundus Photograph Intake / Upload ]
                              │
                              ▼
       ┌──────────────────────────────────────────────┐
       │   Automated Image Quality Assessment Gate    │
       │   - Sharpness (Laplacian Variance)           │
       │   - Illumination Uniformity (4x4 Grid)       │
       │   - Usable Retinal Field of View (FOV)       │
       │   - Contrast / Glare Standard Deviation      │
       └──────────────────────┬───────────────────────┘
                              │
             ┌────────────────┴────────────────┐
             │                                 │
      (UNGRADABLE)                      (BORDERLINE / GOOD)
             │                                 │
             ▼                                 ▼
   [ Actionable Recapture Feedback ]     [ Ben Graham Circular Crop & CLAHE ]
   (Prevents false predictions)                │
                                               ▼
                              ┌─────────────────────────────────┐
                              │  PyTorch Multi-Class CNN Engine │
                              │  (EfficientNetV2-S + TTA)       │
                              │  Predictions: Grades 0, 1, 2, 3, 4
                              └────────────────┬────────────────┘
                                               │
                                               ▼
     ┌──────────────────────────────────────────────────────────────────┐
     │           Explainable AI (XAI) Multi-Layer Synthesis             │
     │  ├── Grad-CAM++ Attention Heatmap (Backprop Activation)          │
     │  ├── Frangi Hessian-Eigenvalue Vessel Segmentation & Density    │
     │  ├── Classical Lesion Detection (Microaneurysms, Exudates, Bleeds)
     │  └── Anatomical Landmarks (Optic Disc & Foveal Avascular Zone)   │
     └─────────────────────────────────┬────────────────────────────────┘
                                       │
                                       ▼
     [ Clinical Triage & Referable DR Alert (Grade >= 2 Trigger) ]
                                       │
                                       ▼
     [ Ophthalmologist Workstation Review & Human-in-the-Loop Sign-Off ]
                                       │
                                       ▼
     [ Tamper-Evident SHA-256 Audit Trail & Official Signed Diagnostic PDF ]
                                       │
                                       ▼
     [ District Operations Simulation (100k+ Patients/Yr Capacity Planning) ]
```

---

## 3. Clinical Severity Standards: ICDR Scale

DRISHTI adheres to the **International Clinical Diabetic Retinopathy Disease Severity Scale (ICDR)**:

| Level | Clinical Grade | Retinal Pathologies | Triage & Clinical Protocol |
|:---:|:---|:---|:---|
| **Grade 0** | **No DR** | Normal retinal vasculature, sharp disc margins, intact fovea | Routine annual rescreening at PHC |
| **Grade 1** | **Mild NPDR** | Microaneurysms only (isolated focal dilations) | Follow-up rescreening in 6–12 months |
| **Grade 2** | **Moderate NPDR** | Microaneurysms, dot/blot hemorrhages, hard lipid exudates | **Referable DR!** 3–6 month specialist referral |
| **Grade 3** | **Severe NPDR** | 4-2-1 Rule: >20 hemorrhages in 4 quadrants, venous beading, IRMA | **Urgent Specialist Referral** within 2–4 weeks |
| **Grade 4** | **Proliferative DR (PDR)** | Neovascularization of disc (NVD/NVE), vitreous hemorrhage | **Emergency Referral** / Immediate laser photocoagulation |

---

## 4. Machine Learning & Computer Vision Pipeline

### 4.1 PyTorch Deep Learning Classifier
- **Backbone Architecture:** `tf_efficientnetv2_s.in21k_ft_in1k` transfer-learned from ImageNet weights.
- **Model Checkpoint:** `artifacts/drishti_ml/checkpoints/best_model.pt` (5-class softmax output).
- **Test-Time Augmentation (TTA):** Bilateral horizontal flip averaging during inference for enhanced calibration and boundary stability.
- **Trained Classes:** `0: No DR`, `1: Mild NPDR`, `2: Moderate NPDR`, `3: Severe NPDR`, `4: Proliferative DR`.

### 4.2 Automated Image Quality Gate (`src/image_quality.py`)
- **Focus & Sharpness:** Measured via the variance of the Laplacian over the retinal mask.
- **Illumination Uniformity:** Computed by partitioning the retinal circle into a 4x4 spatial grid and calculating the standard deviation of local block means.
- **Retinal FOV:** Validates that usable retinal tissue occupies at least $\ge 45\%$ of the camera frame (rejecting extreme off-center or obstructed captures).
- **Quality Verdicts:** `GOOD` (Score 80-100), `BORDERLINE` (Score 60-79, triggers adaptive enhancement), or `UNGRADABLE` (Score < 60, triggers recapture feedback).

### 4.3 Preprocessing & Enhancement (`src/preprocessing.py`)
- **Retina Circle Localization:** Otsu thresholding + contour analysis to identify the exact retinal boundary and generate a circular mask.
- **Ben Graham Transformation:** Blends the cropped retina with a Gaussian local-average blurred counterpart to eliminate uneven illumination across camera lenses.
- **CLAHE Enhancement:** Contrast Limited Adaptive Histogram Equalization applied to the green luminance channel.

### 4.4 Explainable AI: Grad-CAM++ (`src/gradcam.py`)
- Hooks into the last convolutional stage (`conv_head`) of EfficientNetV2-S.
- Computes positive partial derivatives with second and third-order gradient weighting to localize discriminative features responsible for the predicted DR grade.
- Overlays a high-resolution colormap heatmap on the enhanced fundus image.

### 4.5 Vasculature Analysis (`src/vessel_segmentation.py`)
- Applies the **Frangi "vesselness" filter** utilizing Hessian matrix eigenvalues across multiple spatial scales to highlight tubular structures.
- Calculates vessel caliber density as a percentage of the total retinal area.

### 4.6 Candidate Lesion Detection (`src/lesion_analysis.py`)
- **Microaneurysms:** Morphological top-hat transform on the inverted green channel to detect small dark punctate lesions.
- **Hard Exudates:** High-luminance thresholding in CIELAB color space, excluding the optic disc.
- **Hemorrhages:** Median-blurred top-hat filtering with vessel subtraction to extract intraretinal blood collections.
- **Optic Disc & Fovea:** Gaussian intensity peak centroid tracking for anatomical referencing.

---

## 5. Technology Stack & Directory Structure

```
Drishti/
├── artifacts/
│   ├── drishti/             # React 19 Frontend Web Application (Vite + TailwindCSS v4)
│   │   ├── src/
│   │   │   ├── pages/       # Dashboard, Screening, Analysis Workstation, Review, Cases
│   │   │   ├── components/  # Shell, Nav, UI components, Retinal Canvas Visualizer
│   │   │   └── lib/         # Auth, Demo Data, API bindings
│   ├── api-server/          # Node.js / Express 5 REST API Server
│   │   ├── src/
│   │   │   ├── routes/      # Screening, Patients, Auth, Review, Audit, Operations
│   │   │   └── lib/         # ML Client Bridge, Logger, Security Middlewares
│   └── drishti_ml/          # PyTorch Machine Learning Inference Engine
│       ├── checkpoints/     # Trained model weights (best_model.pt)
│       ├── src/             # Inference pipeline, Grad-CAM++, Vessels, Lesions, Quality
│       ├── config.py        # ML hyperparameter & path configurations
│       ├── service.py       # FastAPI high-performance inference microservice
│       ├── predict.py       # CLI single-image prediction runner
│       └── requirements.txt # Production ML requirements
├── lib/
│   ├── db/                  # PostgreSQL Database Schema & Drizzle ORM
│   ├── api-spec/            # OpenAPI 3.1 Specifications
│   └── api-client-react/    # Auto-generated TanStack React Query Hooks
├── package.json             # Monorepo scripts & package manager configuration
└── README.md                # Project documentation
```

---

## 6. Setup & Execution Guide

### Prerequisites
- **Node.js**: v20.x or higher
- **pnpm**: v9.x or higher
- **Python**: v3.10 to v3.12 (with PyTorch and torchvision)
- **PostgreSQL** *(optional, falls back to in-memory state if DATABASE_URL is not set)*

---

### Step 1: Install Dependencies

```bash
# 1. Install Node.js workspace dependencies
pnpm install

# 2. Set up Python ML environment (in artifacts/drishti_ml)
cd artifacts/drishti_ml
python -m venv .venv

# On Windows:
.venv\Scripts\activate
pip install -r requirements.txt

# On Linux/macOS:
source .venv/bin/activate
pip install -r requirements.txt

cd ../..
```

---

### Step 2: Running the System

You can run the full stack simultaneously with one command:

```bash
# Run all services concurrently (ML Engine + Express API Server + Vite Frontend)
pnpm run dev:all
```

Or run each service individually:

#### Terminal 1 — Python ML Inference Service:
```bash
# Starts the PyTorch inference microservice on http://127.0.0.1:5001
pnpm run ml:service
```

#### Terminal 2 — Express API Server:
```bash
# Starts the Node.js API server on http://localhost:5000
pnpm run dev:server
```

#### Terminal 3 — React Frontend Client:
```bash
# Starts the Vite web client on http://localhost:5173
pnpm run dev:client
```

---

### Step 3: Command-Line Single-Image Diagnosis

You can evaluate any fundus photograph directly from the terminal without launching the web application:

```bash
# Run diagnosis on a single fundus image
pnpm run ml:predict -- --image path/to/fundus_image.jpg

# Or directly via python:
artifacts\drishti_ml\.venv\Scripts\python.exe artifacts/drishti_ml/predict.py --image path/to/fundus.jpg --output-dir outputs/demo
```

---

## 7. API Reference

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/healthz` | Health check verifying API server status |
| `GET` | `/api/dashboard` | Dashboard overview with daily screening counts and triage stats |
| `GET` | `/api/cases` | List all registered screening cases |
| `POST` | `/api/cases` | Register a new screening case (demographics, fundus photograph) |
| `GET` | `/api/cases/:caseId` | Retrieve detailed case record with full AI analysis and overlays |
| `POST` | `/api/screening/analyze` | Run full PyTorch quality gate, DR classification, Grad-CAM, and vessels |
| `POST` | `/api/cases/:caseId/review`| Save ophthalmologist clinical review and final diagnosis sign-off |
| `GET` | `/api/patients` | Search and list patients |
| `GET` | `/api/patients/:patientId` | Get patient profile and complete historical screening timeline |
| `GET` | `/api/audit` | Retrieve tamper-evident SHA-256 audit log events |
| `GET` | `/api/operations/summary` | Tele-ophthalmology district capacity metrics (100k+ patients) |

---

## 8. Security, DPDP Act Compliance & Audit Trail

- **DPDP Act 2023 Compliance:** Mandatory patient consent recording prior to fundus intake.
- **Cryptographic Audit Logs:** Every action (`PATIENT_REGISTERED`, `AI_ANALYSIS_EXECUTED`, `DOCTOR_SIGN_OFF`) generates an immutable SHA-256 hash linked to the previous block hash (`prevHash -> hash`), ensuring complete data integrity.
- **Role-Based Access Control (RBAC):** Distinct workflows and access levels for Screening Technicians, Ophthalmologists, Administrators, and Researchers.
- **Secure Medical Reports:** Diagnostic reports include doctor registration credentials, model versioning tags, and clinical disclaimers.

---

## 9. Tele-Ophthalmology & District Operations Simulation

DRISHTI includes a high-capacity district operations simulator modeling **100,000+ patient screenings per year**:
- **Ophthalmologist Workload Optimization:** Filters out $>70\%$ non-referable cases automatically, reducing specialist review queues by $3.4\times$.
- **Staffing Scalability:** Dynamic capacity projections for 1, 3, 5, or 10 reviewing ophthalmologists with real-time queue latency modeling.
- **Bandwidth Optimization:** Selective transmission of enhanced regions of interest and compressed overlays for low-connectivity rural PHCs.

---

## 10. License & Credits

Developed by **Team Agrim** for the **Smart India Hackathon (SIH 2026)**.  
Licensed under the **MIT License**.
