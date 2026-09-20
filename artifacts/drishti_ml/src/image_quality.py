"""
src/image_quality.py
=====================
Fundus image quality assessment & quality gate (DRISHTI.md Section 10).

This runs BEFORE the enhancement pipeline and BEFORE the DR classifier --
its whole point is to catch images that are too poor to grade reliably
(out of focus, badly lit, or not enough retina visible) and hand back
actionable recapture feedback, rather than silently feeding a bad image to
the classifier and getting a meaningless prediction.

All checks are classical, fast, deterministic image-processing heuristics
(no training data required) -- appropriate for a working 36-hour
prototype, and something you can defend with a clear explanation of
exactly what each number measures rather than a second black-box model.
"""

from __future__ import annotations
from dataclasses import dataclass, asdict

import cv2
import numpy as np

from src.preprocessing import find_retina_mask, crop_to_retina_circle


@dataclass
class QualityReport:
    sharpness_score: float          # Laplacian variance on the retina region (higher = sharper)
    illumination_score: float       # 0-1, 1 = well and evenly lit
    field_of_view_fraction: float    # fraction of frame occupied by usable retina
    brightness_mean: float           # 0-255
    contrast_std: float              # 0-255
    verdict: str                     # "GOOD" | "BORDERLINE" | "UNGRADABLE"
    reasons: list                    # human-readable reasons for BORDERLINE/UNGRADABLE
    recapture_feedback: str | None   # only set when verdict != "GOOD"


# --------------------------------------------------------------------------
# Thresholds -- tuned to be reasonable defaults for portable-camera fundus
# photos. Adjust based on what you observe on real data from your target
# camera during testing; document any change in your final report.
# --------------------------------------------------------------------------
SHARPNESS_GOOD = 30.0
SHARPNESS_BORDERLINE = 10.0

FOV_GOOD = 0.45          # retina should fill at least this fraction of the frame
                         # (a perfectly centered circular fundus photo maxes out
                         # around ~0.78 = pi/4, so this is a realistic bar, not 1.0)
FOV_BORDERLINE = 0.25

BRIGHTNESS_LOW = 40
BRIGHTNESS_HIGH = 220
CONTRAST_MIN_GOOD = 20.0
CONTRAST_MIN_BORDERLINE = 12.0


def _sharpness(gray_region: np.ndarray) -> float:
    """Variance of the Laplacian -- a standard, fast focus/blur metric."""
    return float(cv2.Laplacian(gray_region, cv2.CV_64F).var())


def _illumination_uniformity(gray_region: np.ndarray, mask: np.ndarray) -> float:
    """
    Splits the retina region into a 4x4 grid and measures how much the mean
    brightness varies block-to-block. Returns a 0-1 score (1 = very even
    lighting, 0 = strongly uneven / vignetted / glare-affected).
    """
    h, w = gray_region.shape
    grid = 4
    block_means = []
    for i in range(grid):
        for j in range(grid):
            y0, y1 = i * h // grid, (i + 1) * h // grid
            x0, x1 = j * w // grid, (j + 1) * w // grid
            block_mask = mask[y0:y1, x0:x1]
            if block_mask.sum() < 50:  # mostly background, skip
                continue
            block = gray_region[y0:y1, x0:x1]
            block_means.append(float(block[block_mask > 0].mean()))
    if len(block_means) < 2:
        return 0.0
    spread = float(np.std(block_means))
    # Normalize: spread of 0 -> score 1.0; spread of 60+ -> score ~0.0
    return float(max(0.0, 1.0 - spread / 60.0))


def assess_quality(img_bgr: np.ndarray) -> QualityReport:
    # IMPORTANT: field-of-view is measured against the ORIGINAL captured
    # frame (how much of what the camera saw is actually usable retina) --
    # NOT against a post-crop region, which would trivially always be
    # ~pi/4 (a circle filling its own bounding square) regardless of how
    # small or off-center the retina was in the original photo.
    full_mask = find_retina_mask(img_bgr)
    fov_fraction = float((full_mask > 0).mean())
    gray_full = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    if full_mask.sum() < 500:  # essentially no retina detected at all
        return QualityReport(
            sharpness_score=0.0, illumination_score=0.0, field_of_view_fraction=fov_fraction,
            brightness_mean=float(gray_full.mean()), contrast_std=float(gray_full.std()),
            verdict="UNGRADABLE",
            reasons=["No retinal structure detected in the frame."],
            recapture_feedback="Image ungradable: no retina detected. Please recapture with the "
                                "eye centered and the camera properly aligned.",
        )

    ys, xs = np.where(full_mask > 0)
    gray = gray_full  # keep the name used below
    region = gray[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    region_mask = full_mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

    sharpness = _sharpness(region)
    illumination = _illumination_uniformity(region, region_mask)
    brightness_mean = float(region[region_mask > 0].mean())
    contrast_std = float(region[region_mask > 0].std())

    reasons = []
    severity = 0  # 0=GOOD, 1=BORDERLINE, 2=UNGRADABLE

    if sharpness < SHARPNESS_BORDERLINE:
        severity = max(severity, 2)
        reasons.append("Image is significantly out of focus.")
    elif sharpness < SHARPNESS_GOOD:
        severity = max(severity, 1)
        reasons.append("Image focus is borderline.")

    if fov_fraction < FOV_BORDERLINE:
        severity = max(severity, 2)
        reasons.append("Insufficient retinal field of view captured.")
    elif fov_fraction < FOV_GOOD:
        severity = max(severity, 1)
        reasons.append("Retinal field of view is smaller than ideal.")

    if brightness_mean < BRIGHTNESS_LOW or brightness_mean > BRIGHTNESS_HIGH:
        severity = max(severity, 2)
        reasons.append("Image is too dark or overexposed.")

    if contrast_std < CONTRAST_MIN_BORDERLINE:
        severity = max(severity, 2)
        reasons.append("Very low contrast / possible haze or lens fog.")
    elif contrast_std < CONTRAST_MIN_GOOD:
        severity = max(severity, 1)
        reasons.append("Contrast is lower than ideal.")

    if illumination < 0.4:
        severity = max(severity, 1)
        reasons.append("Uneven illumination detected across the retina.")

    verdict = {0: "GOOD", 1: "BORDERLINE", 2: "UNGRADABLE"}[severity]

    recapture_feedback = None
    if verdict == "UNGRADABLE":
        recapture_feedback = ("Image ungradable due to " + "; ".join(reasons).lower() +
                               " Please recapture with the camera stabilized, the eye centered, "
                               "and adequate, even lighting.")
    elif verdict == "BORDERLINE":
        recapture_feedback = ("Image quality is borderline (" + "; ".join(reasons).lower() +
                               "). Proceeding with adaptive enhancement; consider recapturing "
                               "if the AI confidence on this image is low.")

    return QualityReport(
        sharpness_score=sharpness,
        illumination_score=illumination,
        field_of_view_fraction=fov_fraction,
        brightness_mean=brightness_mean,
        contrast_std=contrast_std,
        verdict=verdict,
        reasons=reasons,
        recapture_feedback=recapture_feedback,
    )


def quality_report_to_dict(report: QualityReport) -> dict:
    return asdict(report)
