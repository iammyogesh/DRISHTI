"""
artifacts/drishti_ml/config.py
==============================
Configuration module for DRISHTI Machine Learning & Computer Vision Pipeline.
Provides model architectures, preprocessing parameters, class definitions, and paths.
"""

from __future__ import annotations
import os
import torch

# Base directory of the ML package
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Model checkpoint & output directories
CHECKPOINT_DIR = os.path.join(BASE_DIR, "checkpoints")
DEFAULT_CHECKPOINT = os.path.join(CHECKPOINT_DIR, "best_model.pt")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")

os.makedirs(CHECKPOINT_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# --------------------------------------------------------------------------
# CLASS LABELS & CLINICAL THRESHOLDS
# --------------------------------------------------------------------------
# International Clinical Diabetic Retinopathy Disease Severity Scale (ICDR)
CLASS_NAMES = {
    0: "No DR",
    1: "Mild NPDR",
    2: "Moderate NPDR",
    3: "Severe NPDR",
    4: "Proliferative DR",
}

# Grades >= 2 (Moderate NPDR, Severe NPDR, PDR) require clinical referral
REFERABLE_THRESHOLD = 2

# --------------------------------------------------------------------------
# IMAGE / PREPROCESSING HYPERPARAMETERS
# --------------------------------------------------------------------------
IMAGE_SIZE = 384
USE_BEN_GRAHAM_PREPROCESSING = True
BEN_GRAHAM_SIGMA_FRACTION = 10  # sigma = image_size / 10

# --------------------------------------------------------------------------
# MODEL ARCHITECTURE
# --------------------------------------------------------------------------
MODEL_NAME = "tf_efficientnetv2_s.in21k_ft_in1k"
DROPOUT = 0.3
GRADCAM_TARGET_LAYER = None  # Auto-detected in src/gradcam.py

# Hardware Acceleration
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Service Configuration
SERVICE_HOST = os.environ.get("DRISHTI_ML_HOST", "127.0.0.1")
SERVICE_PORT = int(os.environ.get("DRISHTI_ML_PORT", "5001"))
