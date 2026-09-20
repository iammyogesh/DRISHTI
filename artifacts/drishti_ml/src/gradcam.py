"""
src/gradcam.py
================
Grad-CAM explainability (DRISHTI.md Section 12: "Explainability Module").

Uses the well-tested `pytorch-grad-cam` library (Grad-CAM++, which usually
localizes small/multiple lesions a bit better than vanilla Grad-CAM -- a
good fit here since DR evidence is often several small scattered spots
rather than one big region).

Output is an RGB heatmap-overlay image ready to display directly in the
web app's "Grad-CAM" tab (DRISHTI.md Section 13).
"""

from __future__ import annotations
import numpy as np
import torch
from pytorch_grad_cam import GradCAMPlusPlus
from pytorch_grad_cam.utils.image import show_cam_on_image


def make_gradcam(model: torch.nn.Module, target_layer, device: str):
    """Returns a callable: gradcam(input_tensor_1xCxHxW, target_class:int|None) -> heatmap (H,W) in [0,1]."""
    cam = GradCAMPlusPlus(model=model, target_layers=[target_layer])

    def _run(input_tensor: torch.Tensor, target_class: int | None = None) -> np.ndarray:
        from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
        targets = [ClassifierOutputTarget(target_class)] if target_class is not None else None
        grayscale_cam = cam(input_tensor=input_tensor.to(device), targets=targets)
        return grayscale_cam[0]  # (H, W) in [0, 1]

    return _run


def overlay_heatmap(rgb_image_float01: np.ndarray, grayscale_cam: np.ndarray, alpha: float = 0.5) -> np.ndarray:
    """
    rgb_image_float01: HxWx3 float image in [0,1] (the *displayed*, i.e.
        already-enhanced, fundus image -- not the normalized model-input tensor).
    Returns an HxWx3 uint8 RGB image with the Grad-CAM heatmap overlaid.
    """
    return show_cam_on_image(rgb_image_float01, grayscale_cam, use_rgb=True, image_weight=1 - alpha)
