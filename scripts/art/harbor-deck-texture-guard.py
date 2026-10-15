#!/usr/bin/env python3
"""Review-only warning for stretched/flat pier donor textures.

Measures candidate pixels inside the estimated missing dock surface. A
passing metric does not prove perspective, seam quality, artistic approval
or readiness to animate the Harbor character.
"""
import argparse
import json
from pathlib import Path

import cv2
import numpy as np

# Known BGR pier fill in reconstruct-harbor-material-review.py's mask.
PIER_BGR = (38, 63, 250)


def deck_texture_metrics(bgr, selection):
    if bgr.ndim != 3 or bgr.shape[2] < 3 or selection.shape != bgr.shape[:2]:
        raise ValueError("Candidate/material mask size mismatch")
    if not np.isfinite(bgr).all():
        raise ValueError("Nonfinite candidate pixels")
    pier = selection.astype(bool)
    if int(pier.sum()) < 300:
        raise ValueError("Pier review region too small")
    pixels = bgr[:, :, :3].astype(np.float32)
    horizontal = np.abs(pixels[:, 1:] - pixels[:, :-1]).mean(axis=2)
    vertical = np.abs(pixels[1:, :] - pixels[:-1, :]).mean(axis=2)
    hm = pier[:, :-1] & pier[:, 1:]
    vm = pier[:-1, :] & pier[1:, :]
    if not hm.any() or not vm.any():
        raise ValueError("Pier region must have connected interior neighbors")
    h = float(horizontal[hm].mean())
    v = float(vertical[vm].mean())
    ratio = h / max(v, 0.001)
    energy = float(np.hypot(h, v))
    return {
        "pier_pixels": int(pier.sum()),
        "horizontal_gradient": round(h, 3),
        "vertical_gradient": round(v, 3),
        "horizontal_to_vertical": round(ratio, 3),
        "texture_energy": round(energy, 3),
        "warn_vertical_donor_stripes": bool(ratio > 1.65 and v < 5.5),
        "warn_flat_or_smeared_pier": bool(energy < 8),
        "art_review_required": True,
        "art_approved": False,
        "safe_for_production": False,
    }


def inspect(candidate, mask_path):
    art = cv2.imread(str(candidate), cv2.IMREAD_COLOR)
    material = cv2.imread(str(mask_path), cv2.IMREAD_UNCHANGED)
    if art is None or material is None or material.ndim != 3 or art.shape[:2] != material.shape[:2]:
        raise ValueError("Missing/mismatched Harbor candidate and material mask")
    mask = np.all(material[:, :, :3] == PIER_BGR, axis=2)
    return deck_texture_metrics(art, mask)


def self_test():
    rng = np.random.default_rng(140)
    h, w = 120, 160
    region = np.zeros((h, w), bool)
    region[18:103, 19:144] = True
    natural = rng.integers(50, 210, (h, w, 3), dtype=np.uint8)
    good = deck_texture_metrics(natural, region)
    assert not good["warn_vertical_donor_stripes"]
    assert not good["warn_flat_or_smeared_pier"]
    cols = np.clip(112 + 67 * np.sin(np.arange(w) * np.pi / 3), 0, 255).astype(np.uint8)
    stripes = np.repeat(np.repeat(cols[None, :, None], h, axis=0), 3, axis=2)
    bad = deck_texture_metrics(stripes, region)
    assert bad["warn_vertical_donor_stripes"], "Regression: stretched vertical stripe accepted"
    assert deck_texture_metrics(np.full((h, w, 3), 118, np.uint8), region)["warn_flat_or_smeared_pier"]
    try:
        deck_texture_metrics(natural, np.zeros((h, w), bool))
    except ValueError:
        pass
    else:
        raise AssertionError("Empty material mask accepted")
    return {
        "normal_textured_control": good,
        "stretched_donor_negative_control": bad,
        "flat_patch_negative_control_rejected": True,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--candidate", type=Path)
    parser.add_argument("--material-mask", type=Path)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    results = {"self_test": self_test()} if args.self_test else {}
    if args.candidate or args.material_mask:
        if not args.candidate or not args.material_mask:
            parser.error("--candidate and --material-mask are both required")
        metrics = inspect(args.candidate, args.material_mask)
        results["candidate"] = metrics
        if args.report:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(results, ensure_ascii=False))
        if metrics["warn_vertical_donor_stripes"] or metrics["warn_flat_or_smeared_pier"]:
            raise SystemExit("Harbor candidate has stretched columns or smoothed-flat deck: review rejected")
    else:
        print(json.dumps(results, ensure_ascii=False))


if __name__ == "__main__":
    main()
