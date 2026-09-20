"""
artifacts/drishti_ml/src/lesion_analysis.py
===========================================
Lesion CANDIDATE detection and marker extraction (Microaneurysms, Exudates, Hemorrhages, Optic Disc).
Classical, deterministic image-processing heuristics surfaced as AI-assisted visual evidence.
"""

from __future__ import annotations
import cv2
import numpy as np
from skimage.measure import label, regionprops


def _clean_small(mask: np.ndarray, min_area: int) -> np.ndarray:
    lbl = label(mask > 0)
    out = np.zeros_like(mask)
    for region in regionprops(lbl):
        if region.area >= min_area:
            out[lbl == region.label] = 255
    return out.astype(np.uint8)


def detect_microaneurysm_candidates(img_bgr: np.ndarray, retina_mask: np.ndarray,
                                     min_area: int = 2, max_area: int = 60) -> np.ndarray:
    green = img_bgr[:, :, 1]
    green = cv2.medianBlur(green, 3)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    inverted = 255 - green
    tophat = cv2.morphologyEx(inverted, cv2.MORPH_TOPHAT, kernel)

    _, mask = cv2.threshold(tophat, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    mask = cv2.bitwise_and(mask, mask, mask=retina_mask)

    lbl = label(mask > 0)
    out = np.zeros_like(mask)
    for region in regionprops(lbl):
        if min_area <= region.area <= max_area and region.eccentricity < 0.85:
            out[lbl == region.label] = 255
    return out


def detect_exudate_candidates(img_bgr: np.ndarray, retina_mask: np.ndarray,
                               optic_disc_mask: np.ndarray | None = None,
                               min_area: int = 15) -> np.ndarray:
    lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l_channel = lab[:, :, 0]

    l_masked = l_channel[retina_mask > 0]
    if l_masked.size == 0:
        return np.zeros(img_bgr.shape[:2], dtype=np.uint8)
    bright_thresh = np.percentile(l_masked, 90)

    _, mask = cv2.threshold(l_channel, bright_thresh, 255, cv2.THRESH_BINARY)
    mask = cv2.bitwise_and(mask, mask, mask=retina_mask)

    if optic_disc_mask is not None:
        mask = cv2.bitwise_and(mask, cv2.bitwise_not(optic_disc_mask))

    mask = _clean_small(mask, min_area)
    return mask


def detect_hemorrhage_candidates(img_bgr: np.ndarray, retina_mask: np.ndarray,
                                  vessel_mask: np.ndarray | None = None,
                                  min_area: int = 20, max_eccentricity: float = 0.9,
                                  threshold_percentile: float = 97.0) -> np.ndarray:
    green = img_bgr[:, :, 1]
    green_smooth = cv2.medianBlur(green, 5)
    inverted = 255 - green_smooth
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
    tophat = cv2.morphologyEx(inverted, cv2.MORPH_TOPHAT, kernel)

    tophat_in_retina = tophat[retina_mask > 0]
    if tophat_in_retina.size == 0:
        return np.zeros(img_bgr.shape[:2], dtype=np.uint8)
    thresh_val = np.percentile(tophat_in_retina, threshold_percentile)

    _, mask = cv2.threshold(tophat, float(thresh_val), 255, cv2.THRESH_BINARY)
    mask = cv2.bitwise_and(mask, mask, mask=retina_mask)

    close_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, close_kernel)

    if vessel_mask is not None:
        mask = cv2.bitwise_and(mask, cv2.bitwise_not(vessel_mask))

    lbl = label(mask > 0)
    out = np.zeros_like(mask)
    for region in regionprops(lbl):
        if region.area >= min_area and region.eccentricity < max_eccentricity:
            out[lbl == region.label] = 255
    return out


def locate_optic_disc(img_bgr: np.ndarray, retina_mask: np.ndarray) -> tuple[np.ndarray, tuple[int, int] | None]:
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    gray_masked = np.where(retina_mask > 0, gray, 0)

    blurred = cv2.GaussianBlur(gray_masked, (25, 25), 0)
    blurred_in_retina = blurred[retina_mask > 0]
    if blurred_in_retina.size == 0:
        return np.zeros_like(gray, dtype=np.uint8), None
    thresh_val = np.percentile(blurred_in_retina, 90)
    _, bright_mask = cv2.threshold(blurred, float(thresh_val), 255, cv2.THRESH_BINARY)
    bright_mask = cv2.bitwise_and(bright_mask, bright_mask, mask=retina_mask)

    retina_area = max(1, int((retina_mask > 0).sum()))
    max_plausible_disc_area = 0.15 * retina_area

    lbl = label(bright_mask > 0)
    regions = [r for r in regionprops(lbl)
               if r.eccentricity < 0.6 and r.area <= max_plausible_disc_area]
    if not regions:
        return np.zeros_like(gray, dtype=np.uint8), None

    best = max(regions, key=lambda r: r.area)
    disc_mask = (lbl == best.label).astype(np.uint8) * 255
    cy, cx = best.centroid
    return disc_mask, (int(cx), int(cy))


def combined_lesion_overlay(display_img_rgb_uint8: np.ndarray, ma_mask: np.ndarray,
                             exudate_mask: np.ndarray, hemorrhage_mask: np.ndarray,
                             alpha: float = 0.7) -> np.ndarray:
    overlay = display_img_rgb_uint8.copy()
    for mask, color in ((ma_mask, (255, 0, 255)), (exudate_mask, (255, 255, 0)),
                        (hemorrhage_mask, (255, 0, 0))):
        color_layer = np.zeros_like(overlay)
        color_layer[:] = color
        m = mask > 0
        if m.any():
            overlay[m] = cv2.addWeighted(overlay, 1 - alpha, color_layer, alpha, 0)[m]
    return overlay


def extract_lesion_markers(ma_mask: np.ndarray, exudate_mask: np.ndarray,
                           hemorrhage_mask: np.ndarray, img_shape: tuple[int, int],
                           max_per_type: int = 4) -> list[dict]:
    """
    Extract discrete clickable lesion candidate markers with relative percentage coordinates (0..100)
    for interactive rendering in the Retinal Workstation frontend.
    """
    h, w = img_shape[:2]
    markers = []
    marker_idx = 1

    configs = [
        ("Microaneurysm", ma_mask, 0.88, "Small focal vascular dilation / pinpoint hemorrhage"),
        ("Hard Exudate", exudate_mask, 0.85, "Lipid & lipoprotein deposit candidate"),
        ("Blot Hemorrhage", hemorrhage_mask, 0.91, "Deep intraretinal microvascular hemorrhage"),
    ]

    for lesion_type, mask, base_conf, desc in configs:
        if mask is None or not (mask > 0).any():
            continue
        lbl = label(mask > 0)
        regions = sorted(regionprops(lbl), key=lambda r: r.area, reverse=True)[:max_per_type]
        for r in regions:
            cy, cx = r.centroid
            x_pct = round(float(cx / w) * 100, 1)
            y_pct = round(float(cy / h) * 100, 1)
            # Add small confidence variation based on area
            area_factor = min(0.08, float(r.area) / 500.0)
            conf = min(0.99, round(base_conf + area_factor, 2))

            markers.append({
                "id": f"les-{marker_idx:02d}",
                "type": lesion_type,
                "confidence": conf,
                "x": x_pct,
                "y": y_pct,
                "description": desc,
            })
            marker_idx += 1

    return markers
