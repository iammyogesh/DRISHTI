"""
artifacts/drishti_ml/predict.py
===============================
Command-line inference runner for single fundus image evaluation.
"""

from __future__ import annotations
import argparse
import base64
import json
import os
import sys

# Ensure drishti_ml root on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config
from src.inference_pipeline import load_trained_model, analyze_fundus_image


def main():
    parser = argparse.ArgumentParser(description="DRISHTI Retinal AI Diagnosis Tool")
    parser.add_argument("--image", required=True, help="Path to the fundus image file")
    parser.add_argument("--checkpoint", default=config.DEFAULT_CHECKPOINT, help="Model checkpoint path (.pt)")
    parser.add_argument("--device", default=None, help="Device to use ('cpu' or 'cuda')")
    parser.add_argument("--no-tta", action="store_true", help="Disable test-time augmentation")
    parser.add_argument("--output-dir", default=None, help="Directory to save output overlays and JSON report")
    args = parser.parse_args()

    if not os.path.exists(args.checkpoint):
        print(f"[ERROR] Checkpoint not found at: {args.checkpoint}", file=sys.stderr)
        sys.exit(1)
    if not os.path.exists(args.image):
        print(f"[ERROR] Image not found at: {args.image}", file=sys.stderr)
        sys.exit(1)

    print(f"[INFO] Loading model checkpoint: {args.checkpoint}...")
    loaded = load_trained_model(args.checkpoint, device=args.device)

    print(f"[INFO] Analyzing fundus photograph: {args.image}...")
    result = analyze_fundus_image(args.image, loaded, run_tta=not args.no_tta, encode_images=True)

    if "error" in result:
        print(f"[ERROR] {result['error']}", file=sys.stderr)
        sys.exit(1)

    if args.output_dir:
        os.makedirs(args.output_dir, exist_ok=True)
        images = result.pop("images", {})
        for name, b64 in images.items():
            out_file = os.path.join(args.output_dir, f"{name}.png")
            with open(out_file, "wb") as f:
                f.write(base64.b64decode(b64))

        report_file = os.path.join(args.output_dir, "analysis_report.json")
        with open(report_file, "w") as f:
            json.dump(result, f, indent=2)
        print(f"[INFO] Output overlays & report saved to: {args.output_dir}")

    # Display console summary
    print("\n" + "=" * 55)
    print("           DRISHTI RETINAL AI ASSESSMENT")
    print("=" * 55)
    print(f" Quality Status:    {result['quality']['status']} (Score: {result['quality']['score']}/100)")
    print(f" Focus / Sharpness: {result['quality']['focus']}%")
    print(f" Retinal FOV:       {result['quality']['fieldOfView']}%")

    if not result.get("gradable", True):
        print(f"\n [WARNING] Image is UNGRADABLE.")
        print(f" Recapture Feedback: {result['quality']['feedback']}")
    else:
        pred = result.get("prediction", {})
        print(f"\n Predicted Grade:   Grade {pred.get('grade')} - {pred.get('grade_name')}")
        print(f" Confidence:        {pred.get('confidence', 0)*100:.1f}%")
        print(f" Referable DR:      {'YES (Referral Recommended)' if pred.get('is_referable') else 'NO'}")
        print(f" Vessel Density:    {result.get('vessels', {}).get('vesselDensity', 'N/A')}")
        print(f" Lesion Candidates: {len(result.get('lesions', []))} identified")
        print(f" Processing Time:   {result.get('processingTime', 0)}s")
    print("=" * 55 + "\n")


if __name__ == "__main__":
    main()
