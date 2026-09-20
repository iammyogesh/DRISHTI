# DRISHTI — ML Pipeline: Explanation & Usage Guide

This document explains every file in the codebase, the reasoning behind each
design decision, how to run it on your dataset, and how the numbers you'll
see tie back to specific sections of `DRISHTI.md`.

Every piece of this code has been **smoke-tested end-to-end** (dataset
loading → training → Grad-CAM → vessel/lesion detection → ONNX export) on a
synthetic fundus-like dataset before being handed to you, so the pipeline
is known to run without crashing. It has **not** been trained on your real
92k-image dataset (I don't have a copy of it) — the accuracy numbers you'll
get once you train it are real, measured numbers on your data, not a
number I've guessed or promised in advance.

---

## 1. Project layout

```
drishti_ml/
├── config.py                  <- EDIT THIS FIRST (dataset path, hyperparameters)
├── train.py                   <- run this to train: `python train.py`
├── requirements.txt
├── src/
│   ├── preprocessing.py       <- Ben Graham crop/normalize + CLAHE (shared train+inference)
│   ├── dataset.py             <- dataset loading, layout auto-detection, augmentation
│   ├── model.py                <- EfficientNetV2-S (or swappable) classifier
│   ├── losses.py                <- class-weighted, label-smoothed loss
│   ├── train.py                  <- the actual training loop
│   ├── evaluate.py               <- QWK, sensitivity/specificity, ROC-AUC, confusion matrix
│   ├── gradcam.py                 <- Grad-CAM++ explainability
│   ├── image_quality.py           <- quality gate (sharpness/FOV/illumination)
│   ├── vessel_segmentation.py     <- classical Frangi-filter vessel evidence
│   ├── lesion_analysis.py         <- MA/exudate/hemorrhage candidate detection + optic disc
│   └── inference_pipeline.py      <- ties everything together for the web backend
├── scripts/
│   ├── predict_single.py       <- test the whole pipeline on one image from the CLI
│   └── export_onnx.py          <- export to ONNX for the MATLAB nationals migration
├── checkpoints/                <- trained models get saved here
└── outputs/                    <- metrics, plots, and prediction outputs get saved here
```

**How this maps to DRISHTI.md's pipeline** (Section 2 / Section 9):
`Fundus Image → Quality Gate → Enhancement → AI DR Classification →
Lesion/Vessel Evidence → Grad-CAM → Confidence → ...` is *exactly* the
order `src/inference_pipeline.py:analyze_fundus_image()` executes.

---

## 2. Before you run anything: edit `config.py`

Open `config.py` and change:
```python
DATA_ROOT = r"./data/eyepacs_aptos_messidor"   # <- point this at your downloaded dataset
```
Everything else has a working default. See Section 4 below for what your
dataset folder needs to look like.

---

## 3. The model: why EfficientNetV2-S

`config.MODEL_NAME = "tf_efficientnetv2_s.in21k_ft_in1k"`

- It's loaded via **timm**, pretrained on ImageNet-21k then fine-tuned on
  ImageNet-1k — a strong, modern, still-lightweight (~21M parameter)
  backbone. Transfer learning matters a lot here: 92k images is a lot for
  a hackathon, but tiny next to the ~14M images the backbone has already
  seen, so pretrained weights give it a big head start on general visual
  features (edges, blobs, textures) before it ever sees a single fundus
  image.
- It's an **upgrade** over the `EfficientNet-B0`/`ResNet18` baseline
  DRISHTI.md Section 11.1 suggests for the 36-hour build, while still
  being fast enough to fine-tune in a reasonable time. If you're on a
  laptop CPU or want a first fast baseline to make sure the whole pipeline
  works, switch to `"efficientnet_b0"` in `config.py` — everything else
  (Grad-CAM layer resolution, ONNX export, etc.) automatically adapts.
- `src/model.py: DRClassifier` wraps whatever backbone you choose with a
  dropout + linear classification head, and exposes
  `get_gradcam_target_layer()` so Grad-CAM automatically finds the right
  layer for EfficientNet/EfficientNetV2/ConvNeXt families without you
  having to hunt for a layer name.

**To try a different/bigger model:** just change `MODEL_NAME` in
`config.py` to any classification model name from the
[timm model list](https://huggingface.co/timm) (Ctrl+F "efficientnetv2" or
"convnext" for good alternatives). No other code changes needed.

---

## 4. Dataset loading & the "0-4 vs 0-5" question (`src/dataset.py`)

### Layout auto-detection
Different Kaggle re-uploads of this dataset family ship with slightly
different folder layouts. Rather than assuming one, `src/dataset.py`
auto-detects:
- **Pre-split**: `train/`, `valid/` or `val/`, `test/` folders, each
  containing class subfolders (`0/`, `1/`, ...).
- **Flat**: class subfolders directly under `DATA_ROOT` with no
  pre-made split — the code makes its own stratified 70/15/15 train/val/
  test split (ratios in `config.py`) and **caches** it to
  `DATA_ROOT/_drishti_split.csv` so re-running training later reuses the
  exact same split (important for fair before/after comparisons when you
  tweak hyperparameters).

### About the "0, 1, 2, 3, 4 and 5" class question
The standard International Clinical DR Severity Scale is **5 classes**
(0=No DR, 1=Mild NPDR, 2=Moderate NPDR, 3=Severe NPDR, 4=Proliferative DR)
— this is what DRISHTI.md itself references. You mentioned your download
has folders `0` through `5` (six folders).

**The code does not hard-code 5 or 6** — `discover_classes()` in
`src/dataset.py` reads whatever integer-named folders actually exist and
builds the model's output layer to match. So training will work correctly
either way, automatically. **But please do this before you trust the
results:**

```bash
# open a few images from folder "5" and look at them
```

Two likely explanations if there really is a folder `5`:
1. It's a genuine 6th category some re-uploaders add (e.g. "no gradable
   image" / a junk-image bucket) — if so, you may want to **exclude it**
   from training entirely (simplest: just delete/move that folder out of
   `DATA_ROOT` before running `train.py`, or filter it in
   `discover_classes()`), since mixing an "ungradable" bucket into a
   severity-grade classifier will hurt both the model and your `QWK`
   metric (which assumes an ordinal 0..N scale).
2. It could be a mislabeled duplicate of another class from however the
   Kaggle uploader merged EyePACS + APTOS + Messidor (each source dataset
   has slightly different original labeling conventions).

`config.py` has a `CLASS_NAMES` dict with a placeholder
`5: "Unknown/Class5"` — update it once you know what it actually is.

### Class imbalance handling
DR datasets are always heavily skewed toward "No DR" (often 60-75% of all
images). Two options in `config.py` (use only one at a time):
- `USE_CLASS_WEIGHTS = True` (default): inverse-frequency weights fed
  into the loss function (`src/losses.py`) — the model is penalized more
  for getting rare classes wrong.
- `USE_WEIGHTED_SAMPLER = True`: instead, oversample rare classes so each
  epoch sees a more balanced batch composition.

### Augmentation (`build_transforms` in `src/dataset.py`)
Random flips (fundus images have no fixed left-right orientation once
laterality is standardized), rotation, brightness/contrast jitter, small
shift/scale, and coarse dropout (simulates lens artifacts/eyelash
occlusion). Note: **CLAHE and illumination normalization already
happened** in `src/preprocessing.py` before these augmentations run — see
next section.

---

## 5. Preprocessing: the single biggest accuracy lever (`src/preprocessing.py`)

`ben_graham_normalize()` implements **Ben Graham's preprocessing** — crop
to the retinal circle, then subtract a heavily-blurred version of the
image and re-center around mid-gray. This was used by top-scoring
solutions in the original EyePACS/APTOS Kaggle competitions and is the
single most well-documented accuracy trick specific to this exact family
of datasets: it removes the uneven, camera-and-lighting-dependent color
cast that otherwise makes images from different clinics/cameras look
inconsistent to a CNN.

**Critically, this same function runs at both training time (via
`src/dataset.py: RetinaDataset`) and inference time (via
`src/inference_pipeline.py`)** — if these ever drift out of sync (e.g. you
preprocess differently in a notebook than in the deployed app), accuracy
will silently degrade at inference. Change preprocessing in exactly one
place: `src/preprocessing.py`.

`apply_clahe()` follows this with Contrast-Limited Adaptive Histogram
Equalization on the L-channel (LAB color space) — boosts local contrast
(helps reveal vessels/lesions) without the color distortion you'd get
equalizing RGB channels directly. This matches the exact pipeline
DRISHTI.md Section 10 specifies: *"Color/illumination normalization →
CLAHE → denoising → optional contrast correction."*

`config.IMAGE_SIZE = 384`: your source images are 600×600; training at
384 (EfficientNetV2-S's native pretraining resolution) is a strong
accuracy/speed trade-off. Raise to 456 or 528 if you have a capable GPU
and time for slower training; lower to 224-256 for a much faster (if
somewhat less accurate) run on a weak GPU/CPU.

---

## 6. Training (`src/train.py`, run via `train.py`)

```bash
python train.py
```

What happens, in order:
1. Loads and auto-splits the dataset (see Section 4).
2. Builds the model, moves it to GPU if available (`config.DEVICE` is set
   automatically).
3. **AdamW** optimizer + a **cosine learning-rate schedule with linear
   warmup** (`build_scheduler`) — warmup avoids destabilizing the
   pretrained weights with large gradients in the first few steps; cosine
   decay is a standard, reliable schedule that needs no manual tuning.
4. **Mixed precision** (`torch.cuda.amp`) automatically enables on CUDA
   GPUs for roughly 1.5-2x faster training with no accuracy cost; it's a
   no-op on CPU.
5. After every epoch, evaluates on the validation set and checkpoints the
   model **only if validation QWK improved** (see Section 7 for why QWK,
   not accuracy, drives model selection).
6. **Early stopping**: if validation QWK hasn't improved for
   `config.EARLY_STOP_PATIENCE` (default 7) epochs, training stops — you
   don't need to guess the right number of epochs in advance.
7. At the end, reloads the **best** checkpoint (not the last epoch) and
   runs one final evaluation on the held-out **test** set, saving metrics
   JSON + a confusion-matrix plot to `outputs/`.

**Quick smoke test before committing to a full run** (recommended — takes
a few minutes and confirms your dataset path/format is correct):
```bash
python -c "from src.train import run_training; run_training(epochs=1, model_name='efficientnet_b0')"
```

---

## 7. Evaluation metrics (`src/evaluate.py`) — and why QWK matters

DR grading is an **ordinal** problem (0 < 1 < 2 < 3 < 4): predicting grade
1 when the truth is grade 0 is a much smaller mistake than predicting
grade 4 when the truth is grade 0. Plain accuracy treats every
misclassification identically, so we use:

- **Quadratic Weighted Kappa (QWK)** — the actual official metric used in
  the APTOS 2019 Blindness Detection Kaggle competition on this exact
  data family. This is what drives checkpoint selection and early
  stopping, not accuracy or loss.
- **Referable-DR sensitivity/specificity** — DRISHTI.md Section 17 sets
  explicit targets (**>90% sensitivity, >85% specificity**) for detecting
  "referable DR" (grade ≥ `config.REFERABLE_THRESHOLD`, default 2). This
  is computed by **summing the predicted probabilities of all referable
  classes** (not just re-thresholding the arg-max prediction), which
  gives a better-calibrated referable-probability score — useful for the
  "calibrated confidence score" DRISHTI.md Section 12 also asks for.
- **Per-class precision/recall/F1, ROC-AUC (macro + per-class),
  confusion matrix** — everything else in DRISHTI.md Section 17.

`print_report()` prints all of this after training, and every number is
also saved as JSON (`outputs/test_metrics.json`) plus a confusion-matrix
PNG — genuinely measured on your held-out test set, not a promised number.

---

## 8. Grad-CAM explainability (`src/gradcam.py`)

Uses **Grad-CAM++** (via the `pytorch-grad-cam` library) rather than
vanilla Grad-CAM — Grad-CAM++ generally localizes multiple small,
scattered regions of interest better than vanilla Grad-CAM, which matters
here since DR evidence (microaneurysms, small hemorrhages) is often
several small spots rather than one big blob.

`DRClassifier.get_gradcam_target_layer()` (in `src/model.py`)
auto-resolves the correct convolutional layer to hook for EfficientNet,
EfficientNetV2, and ConvNeXt backbones — if you swap to a very different
architecture (e.g. a Vision Transformer), you'll need to update this
method (or set `config.GRADCAM_TARGET_LAYER` and adjust `src/gradcam.py`
to use it directly).

---

## 9. Image quality gate (`src/image_quality.py`)

DRISHTI.md Section 10 requires an "automatic fundus image quality
assessment" step that runs **before** classification. This module checks,
using fast classical image-processing heuristics (no training data
needed):

- **Sharpness**: variance of the Laplacian on the retina region (standard
  focus/blur metric).
- **Field of view**: what fraction of the *original captured frame* is
  actual retina vs. black border — catches "camera too far/zoomed out"
  captures. (Note: this is deliberately measured against the original
  frame, not the cropped retina region, since measuring it post-crop
  would trivially always read ~78% regardless of how poorly framed the
  original photo was — this bug was caught and fixed during testing.)
- **Illumination uniformity**: splits the retina into a 4×4 grid and
  measures how evenly lit it is (catches vignetting/glare).
- **Brightness/contrast**: catches under/overexposed or hazy/foggy shots.

Returns a `GOOD` / `BORDERLINE` / `UNGRADABLE` verdict plus specific,
human-readable reasons and (for non-GOOD verdicts) recapture feedback text
— ready to show directly to the user, per DRISHTI.md's "quality gate ->
adaptive enhancement -> re-evaluate" flow (Section 10). In
`inference_pipeline.py`, an `UNGRADABLE` verdict **skips classification
entirely** rather than returning a meaningless prediction on an unusable
image.

**The thresholds are reasonable defaults, not calibrated on real data** —
once you have real sample images from your target camera/device, look at
`SHARPNESS_GOOD`, `FOV_GOOD`, etc. at the top of the file and adjust if
the verdicts don't match your own judgment of the images.

---

## 10. Vessel segmentation (`src/vessel_segmentation.py`)

DRISHTI.md marks vessel segmentation as a **SHOULD-have / Prototype**
feature (Section 6 priority table), not a fully validated MUST-have. This
dataset (EyePACS+APTOS+Messidor) has **DR-grade labels only** — no
pixel-level vessel masks to train a segmentation network on, and building
one from scratch is out of scope for a hackathon.

Instead, this uses a well-established **training-free classical CV
approach**: green-channel extraction (best vessel contrast in fundus
photography) → CLAHE → **Frangi vesselness filter**
(`skimage.filters.frangi`, a multi-scale Hessian-eigenvalue filter
specifically designed to highlight tube-like structures while suppressing
blobs) → threshold → morphological cleanup. This runs immediately on any
fundus image with no training required, matching the plan's own
"Prototype" ambition level for this feature.

`vessel_density()` gives a simple scalar (vessel pixels / retina area) —
useful for the case-report/analytics view (Section 17 mentions vessel
analytics).

---

## 11. Lesion candidate detection (`src/lesion_analysis.py`)

Same situation as vessels — no pixel-level lesion annotations in this
dataset. DRISHTI.md Section 11.3 is explicit about this exact scenario:
*"For the 36-hour prototype, lesion detection should be presented as
AI-assisted evidence/prototype analysis unless it has been rigorously
validated."* This module follows that instruction literally — every
function and the `inference_pipeline.py` output explicitly labels this
output as **candidate evidence**, not a diagnosis.

Three classical detectors, all training-free:
- **Microaneurysms**: morphological top-hat transform on the green
  channel, filtered to small (2-60px) round blobs.
- **Exudates**: bright yellow-white patches via LAB-space color
  thresholding (relative to that image's own retina brightness
  distribution — not a fixed absolute threshold, since brightness varies
  a lot across cameras), with the optic disc excluded (it's also bright).
- **Hemorrhages**: dark blob regions via top-hat on the green channel,
  filtered by shape (low eccentricity = blob-like, distinguishing them
  from tube-like vessels) and by excluding pixels already claimed by the
  vessel mask.
- **Optic disc localization**: largest bright, round, plausibly-sized
  region — used to exclude it from exudate detection (false positives)
  and for the "Optic Disc" toggle layer in DRISHTI.md's UI mockup
  (Section 13).

**Honest, important limitation** (documented in the module's docstring
too): every detector picks its threshold as a *percentile* of the signal
within that image's retina (e.g. "top 3-8% strongest response"), which
means it will **always** flag *something*, even on a perfectly healthy
retina — there's no universal absolute brightness/darkness cutoff that
means "definitely a lesion" across different cameras and lighting. During
testing, the hemorrhage detector in particular showed a non-trivial
false-positive rate on flat, textureless synthetic test images. **Real
fundus photos have far more genuine anatomical structure (vessels, optic
disc, macula) than my synthetic test images did**, so real-world behavior
should be meaningfully better — but you should look at output on a
handful of real images from your dataset and tune
`threshold_percentile`/`min_area` in each `detect_*` function if the
overlays look too noisy, and always caption this output as "candidate
evidence" in your demo, exactly as DRISHTI.md instructs.

**If you have time and want a real, trained, validated lesion detector**
instead of these heuristics: DRISHTI.md Section 34 itself mentions
**IDRiD (Indian Diabetic Retinopathy Image Dataset)** as a suggested
dataset — it has genuine pixel-level lesion annotations (microaneurysms,
hemorrhages, exudates) from an Indian hospital, and would let you train a
real segmentation model (e.g. a small U-Net) as a strong follow-up
enhancement beyond the hackathon MVP.

---

## 12. The full inference pipeline (`src/inference_pipeline.py`)

This is the **one function your FastAPI backend should call**:

```python
from src.inference_pipeline import load_trained_model, analyze_fundus_image

# Once, at server startup:
loaded = load_trained_model("checkpoints/best_model.pt")

# Per request:
result = analyze_fundus_image(uploaded_file_path, loaded)
```

`result` is a single JSON-serializable dict containing: the quality
report, the DR grade + confidence + full class-probability distribution +
referable-DR flag, vessel density, lesion candidate area fractions, the
optic disc location, and (if `encode_images=True`) base64-encoded PNGs of
the enhanced image, Grad-CAM overlay, vessel overlay, and combined lesion
overlay — ready to drop straight into an `<img src="data:image/png;
base64,...">` on the frontend, matching the "toggle layers: Original |
Vessels | Microaneurysms | Exudates | Hemorrhage | Grad-CAM | Optic Disc"
UI in DRISHTI.md Section 13.

Includes simple **test-time augmentation** (`run_tta=True`, default):
averages the prediction over the image and its horizontal flip — a cheap,
well-established trick that typically improves both accuracy and
calibration slightly at essentially no engineering cost.

If `quality.verdict == "UNGRADABLE"`, everything downstream (classification,
Grad-CAM, vessels, lesions) is **skipped** and the function returns early
— your frontend should show the recapture feedback instead of a
prediction.

---

## 13. Testing on a single image without the web backend

```bash
python scripts/predict_single.py --image path/to/some_fundus.jpg
```
Saves `enhanced.png`, `gradcam_overlay.png`, `vessel_overlay.png`,
`lesion_overlay.png`, `vessel_mask.png`, and `report.json` to
`outputs/predict_single/<image_name>/` — the fastest way to sanity-check
what the model/pipeline is actually doing on a real image before wiring
up the full web app.

---

## 14. Exporting to ONNX for the MATLAB nationals migration

```bash
python scripts/export_onnx.py --checkpoint checkpoints/best_model.pt --output drishti_model.onnx
```
This directly implements the migration path DRISHTI.md Section 3
describes: *"MATLAB's Deep Learning Toolbox can import a PyTorch/
TensorFlow model directly via ONNX (`importNetworkFromONNX`), so the
trained weights do not need to be retrained from scratch when porting."*

**Important**: the exported graph is the raw CNN only. The Ben
Graham+CLAHE preprocessing (`src/preprocessing.py`) and the ImageNet
normalization (`src/inference_pipeline.py: _to_tensor()`) happen in
Python code, not inside the exported graph — whoever sets up the MATLAB
side needs to replicate both steps exactly (same crop/normalize logic,
same resize size, same per-channel mean/std) using MATLAB's Image
Processing Toolbox, or predictions will be wrong even though the network
imported "successfully." The script's own output prints a reminder of
this every time you run it.

The export was verified to produce **numerically identical output** to
the original PyTorch model (max difference ~3×10⁻⁸) during testing.

---

## 15. Suggested next steps, roughly in priority order

1. Point `config.DATA_ROOT` at your real dataset and run the epoch-1 smoke
   test (Section 6) to confirm layout/class detection works on your
   actual files.
2. Inspect a few images in the mystery "class 5" folder (Section 4) and
   decide whether to keep, drop, or relabel it.
3. Run a full training pass with `efficientnet_b0` first (faster) to get
   an end-to-end accuracy baseline, then switch to
   `tf_efficientnetv2_s.in21k_ft_in1k` (or a bigger model, if time and GPU
   allow) for your best final number.
4. Look at `outputs/test_metrics.json` and the confusion matrix — check
   specifically where the referable-DR sensitivity/specificity land
   relative to the >90%/>85% targets in DRISHTI.md Section 17, since
   that's the number most likely to come up in Q&A.
5. Run `scripts/predict_single.py` on a handful of real images and eyeball
   the vessel/lesion overlays; tune thresholds in
   `src/vessel_segmentation.py` / `src/lesion_analysis.py` if needed.
6. Wire `src/inference_pipeline.py: analyze_fundus_image()` into your
   FastAPI backend.
7. (Nationals only) Run `scripts/export_onnx.py` once you're happy with a
   checkpoint.
