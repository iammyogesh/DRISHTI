"""
matlab/deep_learning/export_pytorch_to_onnx.py
==============================================
Exports the trained DRISHTI PyTorch Diabetic Retinopathy classification model to ONNX.
This ONNX model is directly imported into the MATLAB Deep Learning Toolbox using
MATLAB's native `importNetworkFromONNX` function for inference and Grad-CAM explainability.

Usage:
    python export_pytorch_to_onnx.py [--checkpoint path/to/model.pt] [--output drishti_model.onnx]
"""

import os
import sys
import argparse
import torch

# Add workspace path to sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
ML_ROOT = os.path.join(PROJECT_ROOT, "artifacts", "drishti_ml")
if ML_ROOT not in sys.path:
    sys.path.insert(0, ML_ROOT)

import config
from src.model import create_model


def export_to_onnx(
    checkpoint_path: str,
    output_onnx_path: str,
    image_size: int = 512,
    device: str = "cpu"
) -> str:
    print(f"[EXPORT] Loading PyTorch model from: {checkpoint_path}")
    num_classes = len(config.CLASS_NAMES)
    model = create_model(
        model_name=config.MODEL_NAME,
        num_classes=num_classes,
        pretrained=False
    )

    if os.path.exists(checkpoint_path):
        state = torch.load(checkpoint_path, map_location=device)
        state_dict = state["model_state_dict"] if "model_state_dict" in state else state
        # Strip unexpected prefixes if any
        clean_state = {k.replace("module.", ""): v for k, v in state_dict.items()}
        model.load_state_dict(clean_state, strict=False)
        print(f"[EXPORT] Weights loaded successfully.")
    else:
        print(f"[WARN] Checkpoint not found at {checkpoint_path}. Exporting initialized architecture.")

    model.eval()
    model.to(device)

    dummy_input = torch.randn(1, 3, image_size, image_size, device=device)

    os.makedirs(os.path.dirname(os.path.abspath(output_onnx_path)), exist_ok=True)
    print(f"[EXPORT] Exporting to ONNX format at: {output_onnx_path}...")

    torch.onnx.export(
        model,
        dummy_input,
        output_onnx_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["fundus_image"],
        output_names=["dr_logits"],
        dynamic_axes={
            "fundus_image": {0: "batch_size"},
            "dr_logits": {0: "batch_size"}
        }
    )

    print(f"[EXPORT] ONNX model successfully saved ({os.path.getsize(output_onnx_path) / (1024*1024):.2f} MB).")
    print("[EXPORT] Ready for MATLAB Deep Learning Toolbox import via importNetworkFromONNX().")
    return output_onnx_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export PyTorch DR model to ONNX for MATLAB")
    parser.add_argument(
        "--checkpoint",
        default=config.DEFAULT_CHECKPOINT,
        help="Path to PyTorch .pt/.pth checkpoint"
    )
    parser.add_argument(
        "--output",
        default=os.path.join(SCRIPT_DIR, "drishti_dr_model.onnx"),
        help="Output ONNX filename"
    )
    parser.add_argument(
        "--image_size",
        type=int,
        default=config.IMAGE_SIZE,
        help="Input image size (default 512)"
    )

    args = parser.parse_args()
    export_to_onnx(args.checkpoint, args.output, args.image_size)
