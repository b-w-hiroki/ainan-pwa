#!/usr/bin/env python3
"""Review-only Harbor occlusion experiment, using approved pixels and a candidate mask.

Requires opencv-python-headless and numpy. Never writes production textures,
does not claim a motion-ready character or an approved inpainted background.
"""
import argparse
import hashlib
import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "fishing-game/assets/approved-mock/cast-harbor-composite-base.png"
REGION = ROOT / "fishing-game/assets/generated/harbor-aji-master-v2/cast-harbor-player-region-extracted.png"


def run(output_dir: Path, *, dilation: int = 5, radius: float = 4.0):
    if not 0 <= dilation <= 20 or not 1 <= radius <= 15:
        raise ValueError("out-of-range experimental mask/inpainting parameters")
    original = cv2.imread(str(BASE), cv2.IMREAD_UNCHANGED)
    foreground = cv2.imread(str(REGION), cv2.IMREAD_UNCHANGED)
    if original is None or foreground is None:
        raise FileNotFoundError("Run node scripts/art/extract-harbor-approved-master.mjs first")
    if original.shape[:2] != foreground.shape[:2] or foreground.shape[2] != 4:
        raise ValueError("Approved source and player-region mask do not align")
    h, w = original.shape[:2]
    if original.shape[2] == 4:
        rgb = cv2.cvtColor(original, cv2.COLOR_BGRA2BGR)
    else:
        rgb = original[:, :, :3].copy()
    mask = np.where(foreground[:, :, 3] > 8, 255, 0).astype(np.uint8)
    if dilation:
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*dilation+1, 2*dilation+1))
        mask = cv2.dilate(mask, kernel)
    count = int(cv2.countNonZero(mask))
    if not 2500 < count < w*h*.25:
        raise ValueError(f"Unsafe occlusion coverage: {count}/{w*h}")
    # Telea interpolates known neighbors. It cannot recover genuine unseen
    # pier/sea detail, so the output MUST remain a review-only candidate.
    repaired = cv2.inpaint(rgb, mask, radius, cv2.INPAINT_TELEA)
    assert np.array_equal(repaired[mask == 0], rgb[mask == 0]), "Source pixels changed outside mask"
    output_dir.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_dir / "approved-source.png"), original)
    cv2.imwrite(str(output_dir / "candidate-inpainted-background.png"), repaired)
    overlay = rgb.copy()
    overlay[mask > 0] = (30, 50, 220)
    overlay = cv2.addWeighted(rgb, .47, overlay, .53, 0)
    cv2.imwrite(str(output_dir / "review-hole-mask.png"), overlay)
    board = np.concatenate([rgb, overlay, repaired], axis=1)
    cv2.imwrite(str(output_dir / "review-side-by-side.png"), board)
    border = cv2.morphologyEx(mask, cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8))
    abs_delta = np.abs(repaired.astype(np.int16) - rgb.astype(np.int16))
    report = {
        "category": "review_only_art_candidate",
        "source": str(BASE.relative_to(ROOT)),
        "source_sha256": hashlib.sha256(BASE.read_bytes()).hexdigest(),
        "image_size": [w, h],
        "candidate_mask_pixels": count,
        "candidate_mask_fraction": round(count/(w*h), 5),
        "mask_dilation_pixels": dilation,
        "inpaint_radius": radius,
        "outside_mask_pixel_parity": True,
        "border_abs_rgb_mean_vs_original": round(float(abs_delta[border > 0].mean()), 4),
        "subject_isolated": False,
        "background_true_content_recovered": False,
        "motion_ready": False,
        "production_promoted": False,
        "human_visual_review": "not_checked",
    }
    (output_dir / "experiment-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(json.dumps(report, ensure_ascii=False))
    return report


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--dilation", type=int, default=5)
    p.add_argument("--radius", type=float, default=4.0)
    a = p.parse_args()
    run(a.out, dilation=a.dilation, radius=a.radius)
