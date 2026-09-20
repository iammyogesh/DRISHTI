"""
src/preprocessing.py
=====================
Shared, deterministic fundus-image preprocessing used by BOTH:
  1. the training pipeline (so the model only ever sees preprocessed images), and
  2. the live inference "Enhancement" step described in DRISHTI.md Section 10.

Keeping this identical in both places matters a lot for real accuracy: a
model that never saw un-preprocessed images at train time will perform
worse at inference if the inference code preprocesses differently (or not
at all). Every function here works on a BGR uint8 image (OpenCV's default),
as loaded by cv2.imread.
"""

from __future__ import annotations
import cv2
import numpy as np


def find_retina_mask(img_bgr: np.ndarray, brightness_thresh: int = 10) -> np.ndarray:
    """
    Return a binary mask (uint8, 0/255) of the roughly-circular retinal
    field of view, separating it from the black background typical of
    fundus photographs.
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray, brightness_thresh, 255, cv2.THRESH_BINARY)

    # Clean up small holes/specks so the mask is one solid disc.
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

    # Keep only the largest connected component (the retina disc itself,
    # discarding any stray bright artifacts near the image border).
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if num_labels > 1:
        largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        mask = np.where(labels == largest, 255, 0).astype(np.uint8)
    return mask


def crop_to_retina_circle(img_bgr: np.ndarray) -> np.ndarray:
    """
    Crop the image tightly to the bounding box of the retinal circle,
    removing the black border. Falls back to the original image if a
    sensible retina region can't be found (e.g. a near-blank frame).
    """
    mask = find_retina_mask(img_bgr)
    ys, xs = np.where(mask > 0)
    if len(xs) < 100 or len(ys) < 100:
        return img_bgr  # nothing sensible detected -- don't distort the image

    x0, x1 = xs.min(), xs.max()
    y0, y1 = ys.min(), ys.max()
    # Guard against degenerate (near-zero-area) boxes.
    if (x1 - x0) < 20 or (y1 - y0) < 20:
        return img_bgr
    return img_bgr[y0:y1 + 1, x0:x1 + 1]


def ben_graham_normalize(img_bgr: np.ndarray, target_size: int, sigma_fraction: int = 10) -> np.ndarray:
    """
    Ben Graham's preprocessing (winning approach used across top APTOS/EyePACS
    solutions): crop to the retinal circle, resize, then subtract a heavily
    blurred version of the image and re-center around mid-gray. This removes
    the uneven, camera-dependent illumination that otherwise makes cross-
    dataset fundus images hard for a CNN to generalize across, and is the
    single biggest known accuracy lever for this dataset family.
    """
    img = crop_to_retina_circle(img_bgr)
    img = cv2.resize(img, (target_size, target_size), interpolation=cv2.INTER_AREA)

    sigma = max(1, target_size // sigma_fraction)
    blurred = cv2.GaussianBlur(img, (0, 0), sigma)
    normalized = cv2.addWeighted(img, 4, blurred, -4, 128)

    # Re-mask to a clean circle after the transform (the addWeighted step
    # can introduce a faint bright ring right at the former black border).
    mask = find_retina_mask(img, brightness_thresh=10)
    mask3 = cv2.merge([mask, mask, mask])
    normalized = np.where(mask3 > 0, normalized, 0).astype(np.uint8)
    return normalized


def apply_clahe(img_bgr: np.ndarray, clip_limit: float = 2.5, tile_grid_size: int = 8) -> np.ndarray:
    """
    Contrast Limited Adaptive Histogram Equalization on the L channel of
    LAB color space -- boosts local contrast (helps reveal lesions/vessels)
    without blowing out color balance the way equalizing RGB directly would.
    """
    lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(tile_grid_size, tile_grid_size))
    l2 = clahe.apply(l)
    lab2 = cv2.merge([l2, a, b])
    return cv2.cvtColor(lab2, cv2.COLOR_LAB2BGR)


def denoise(img_bgr: np.ndarray) -> np.ndarray:
    """Light edge-preserving denoise -- helps with noisy/low-quality portable-camera shots."""
    return cv2.fastNlMeansDenoisingColored(img_bgr, None, h=4, hColor=4, templateWindowSize=7, searchWindowSize=21)


def full_enhancement_pipeline(img_bgr: np.ndarray, target_size: int, sigma_fraction: int = 10,
                               denoise_flag: bool = False) -> np.ndarray:
    """
    The complete "Enhancement" step from DRISHTI.md Section 10:
    color/illumination normalization -> CLAHE -> (optional) denoising.
    Used both to build the training set and at live inference time.
    """
    img = ben_graham_normalize(img_bgr, target_size, sigma_fraction)
    img = apply_clahe(img)
    if denoise_flag:
        img = denoise(img)
    return img


def load_and_preprocess(path: str, target_size: int, sigma_fraction: int = 10) -> np.ndarray:
    """Convenience loader: reads a file from disk and returns a preprocessed BGR image."""
    img = cv2.imread(path, cv2.IMREAD_COLOR)
    if img is None:
        raise FileNotFoundError(f"Could not read image at: {path}")
    return full_enhancement_pipeline(img, target_size, sigma_fraction)
