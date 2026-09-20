"""
src/vessel_segmentation.py
============================
Blood vessel segmentation (DRISHTI.md Section 11.2 / Section 13 "Vessels" layer).

This dataset (EyePACS/APTOS/Messidor combined) ships DR-grade labels only --
it has NO pixel-level vessel masks to train a segmentation network on, and
building/labeling one from scratch is out of scope for a hackathon
timeline. Rather than skip the feature, we use a well-established,
training-free classical computer-vision approach that works directly on
any fundus image:

  1. Extract the green channel (vessels have the best contrast here --
     standard practice in retinal imaging, used by essentially every
     classical vessel-segmentation paper, e.g. Zana & Klein, Frangi et al).
  2. CLAHE to boost local contrast.
  3. Frangi "vesselness" filter (skimage.filters.frangi) -- a multi-scale
     Hessian-eigenvalue-based filter specifically designed to highlight
     tube-like structures (vessels) while suppressing blobs and edges.
  4. Threshold + light morphological cleanup -> binary vessel mask.

This is presented in the UI as vessel *evidence*, consistent with the
"AI-assisted evidence" framing in DRISHTI.md Section 11.3 -- it is a
deterministic image-processing result, not a learned/validated detector,
and should be labeled as such in the interface.
"""

from __future__ import annotations
import cv2
import numpy as np
from skimage.filters import frangi
from skimage import exposure


def segment_vessels(img_bgr: np.ndarray, retina_mask: np.ndarray | None = None,
                     scale_range: tuple = (1, 6), scale_step: int = 1,
                     threshold_percentile: float = 80.0) -> np.ndarray:
    """
    Returns a binary uint8 mask (0/255) of detected vessel-like structures,
    the same H x W as img_bgr.
    """
    green = img_bgr[:, :, 1]
    green_eq = exposure.equalize_adapthist(green, clip_limit=0.01)

    vesselness = frangi(green_eq, sigmas=np.arange(scale_range[0], scale_range[1] + 1, scale_step) * 0.5,
                         black_ridges=True)

    vesselness_norm = (vesselness - vesselness.min())
    if vesselness_norm.max() > 0:
        vesselness_norm = vesselness_norm / vesselness_norm.max()

    thresh_val = np.percentile(vesselness_norm, threshold_percentile)
    mask = (vesselness_norm >= thresh_val).astype(np.uint8) * 255

    # Close small gaps along vessel lines BEFORE opening, so thin
    # continuous vessels don't get fragmented into dots by the erosion
    # step that follows.
    close_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, close_kernel)

    # Use a 1x1 (no-op erosion) open, or skip opening entirely -- a full
    # 3x3 open was eroding thin single-pixel-wide vessels away completely.
    # Just remove genuinely tiny isolated speckle noise instead, via
    # connected-component area filtering rather than morphological erosion.
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    cleaned = np.zeros_like(mask)
    for i in range(1, num_labels):
        if stats[i, cv2.CC_STAT_AREA] >= 4:  # drop only true single-pixel noise
            cleaned[labels == i] = 255
    mask = cleaned

    if retina_mask is not None:
        mask = cv2.bitwise_and(mask, mask, mask=retina_mask)

    return mask


def vessel_density(mask: np.ndarray, retina_mask: np.ndarray) -> float:
    """Fraction of the retinal field of view classified as vessel -- a simple
    scalar summary useful for the case report / research analytics view."""
    retina_area = max(1, int((retina_mask > 0).sum()))
    vessel_area = int((mask > 0).sum())
    return float(vessel_area) / float(retina_area)


def overlay_vessels(display_img_rgb_uint8: np.ndarray, vessel_mask: np.ndarray,
                     color=(255, 80, 0), alpha: float = 0.6) -> np.ndarray:
    """Overlay the vessel mask in a distinct color on top of the (RGB) display image."""
    overlay = display_img_rgb_uint8.copy()
    color_layer = np.zeros_like(overlay)
    color_layer[:] = color
    mask_bool = vessel_mask > 0
    overlay[mask_bool] = cv2.addWeighted(
        overlay, 1 - alpha, color_layer, alpha, 0
    )[mask_bool]
    return overlay
