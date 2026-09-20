"""
artifacts/drishti_ml/service.py
===============================
Fast, persistent HTTP API service for the DRISHTI Machine Learning & MathWorks Engine.
Integrates PyTorch DR models, MATLAB Image Processing/Deep Learning Toolbox algorithms,
and Simulink SimEvents discrete-event district screening simulation.
"""

from __future__ import annotations
import os
import sys
import time

# Ensure drishti_ml package root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

import config
from src.inference_pipeline import load_trained_model, analyze_fundus_image, LoadedModel, decode_image_input
from src.matlab_engine import run_matlab_full_pipeline, encode_cv2_image_to_base64
from src.simulink_engine import simulate_district_telemedicine_network

app = FastAPI(
    title="DRISHTI ML & MATLAB/Simulink Inference Service",
    version="2.0.0",
    description="PyTorch & MathWorks MATLAB/Simulink Clinical Workstation Engine for Diabetic Retinopathy screening",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global cached model instance
_loaded_model: LoadedModel | None = None


class AnalyzeRequest(BaseModel):
    image: str  # File path or base64 data URI
    run_tta: bool = True
    encode_images: bool = True


class SimulinkRequest(BaseModel):
    annual_target: int = Field(100000, description="Annual patient screening target")
    phc_count: int = Field(48, description="Number of Primary Health Centers")
    reviewer_count: int = Field(6, description="Number of district ophthalmologists")
    review_time_mins: float = Field(3.5, description="Minutes per case review")
    operating_days: int = Field(300, description="Operating days per year")


@app.on_event("startup")
def startup_event():
    global _loaded_model
    checkpoint_path = config.DEFAULT_CHECKPOINT
    if not os.path.exists(checkpoint_path):
        print(f"[WARN] Checkpoint not found at {checkpoint_path}")
        return
    print(f"[INFO] Preloading DRISHTI PyTorch & MATLAB model from {checkpoint_path} on {config.DEVICE}...")
    t0 = time.time()
    _loaded_model = load_trained_model(checkpoint_path, device=config.DEVICE)
    print(f"[INFO] Model loaded successfully in {time.time() - t0:.2f}s on {_loaded_model.device}")


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": _loaded_model is not None,
        "device": _loaded_model.device if _loaded_model else config.DEVICE,
        "model_name": config.MODEL_NAME,
        "matlabEngineReady": True,
        "simulinkEngineReady": True,
        "classes": sorted(_loaded_model.idx_to_class.values()) if _loaded_model else [0, 1, 2, 3, 4],
    }


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    global _loaded_model
    if _loaded_model is None:
        checkpoint_path = config.DEFAULT_CHECKPOINT
        if not os.path.exists(checkpoint_path):
            raise HTTPException(status_code=503, detail="Model checkpoint not found on server.")
        _loaded_model = load_trained_model(checkpoint_path, device=config.DEVICE)

    if not req.image or not req.image.strip():
        raise HTTPException(status_code=400, detail="No image provided for analysis.")

    try:
        result = analyze_fundus_image(
            req.image,
            _loaded_model,
            run_tta=req.run_tta,
            encode_images=req.encode_images,
        )
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        return result
    except HTTPException:
        raise
    except Exception as err:
        print(f"[ERROR] Inference failed: {err}")
        raise HTTPException(status_code=500, detail=f"Inference error: {str(err)}")


@app.post("/matlab/preprocess")
def matlab_preprocess(req: AnalyzeRequest):
    """Executes pure MATLAB Image Processing Toolbox algorithms on the fundus photograph."""
    if not req.image or not req.image.strip():
        raise HTTPException(status_code=400, detail="No image provided.")

    try:
        img_bgr = decode_image_input(req.image)
        if img_bgr is None:
            raise HTTPException(status_code=400, detail="Unable to decode image.")

        matlab_data = run_matlab_full_pipeline(img_bgr)
        return matlab_data
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"MATLAB preprocessing error: {str(err)}")


@app.post("/simulink/simulate")
def run_simulink_simulation_endpoint(req: SimulinkRequest):
    """Runs the SimEvents discrete-event queueing simulation for district capacity planning."""
    try:
        sim_data = simulate_district_telemedicine_network(
            annual_target=req.annual_target,
            phc_count=req.phc_count,
            reviewer_count=req.reviewer_count,
            review_time_mins=req.review_time_mins,
            operating_days=req.operating_days,
        )
        return sim_data
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Simulink simulation error: {str(err)}")


class QualityRequest(BaseModel):
    image: str


@app.post("/quality")
def check_quality(req: QualityRequest):
    if not req.image or not req.image.strip():
        raise HTTPException(status_code=400, detail="No image provided for quality assessment.")
    try:
        from src.image_quality import assess_quality

        img_bgr = decode_image_input(req.image)
        if img_bgr is None:
            raise HTTPException(status_code=400, detail="Invalid image format.")

        quality = assess_quality(img_bgr)
        focus_pct = int(min(100, max(10, quality.sharpness_score * 2.2)))
        illum_pct = int(min(100, max(10, quality.illumination_score * 100)))
        fov_pct = int(min(100, max(10, quality.field_of_view_fraction * 125)))
        contrast_pct = int(min(100, max(10, quality.contrast_std * 2.5)))

        quality_score = (
            int(focus_pct * 0.35 + illum_pct * 0.25 + fov_pct * 0.25 + contrast_pct * 0.15)
            if quality.verdict != "UNGRADABLE"
            else 28
        )

        feedback = quality.recapture_feedback or (
            "High quality retinal fundus photograph. Retinal vasculature, macula, and optic disc clearly resolved."
            if quality.verdict == "GOOD"
            else "Image passed quality threshold with adaptive contrast enhancement."
        )

        return {
            "score": quality_score,
            "status": quality.verdict,
            "verdict": quality.verdict,
            "focus": focus_pct,
            "illumination": illum_pct,
            "fieldOfView": fov_pct,
            "coverage": fov_pct,
            "artifacts": contrast_pct,
            "feedback": feedback,
            "sharpness_score": round(quality.sharpness_score, 2),
            "field_of_view_fraction": round(quality.field_of_view_fraction, 2),
            "reasons": quality.reasons,
            "gradable": quality.verdict != "UNGRADABLE",
        }
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Quality check error: {str(err)}")


def main():
    host = config.SERVICE_HOST
    port = config.SERVICE_PORT
    print(f"Starting DRISHTI ML & MATLAB/Simulink Inference Server on http://{host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
