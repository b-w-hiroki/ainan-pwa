#!/usr/bin/env python3
"""Review-only water sampling behind the approved Harbor character.

Use adjacent painted water at the *same Y/perspective*, rather than a new
flat texture or Telea filling an enormous hole. This is still not verified
artwork, pier reconstruction or motion-ready production content.
"""
import argparse
import hashlib
import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
MASTER = ROOT / "fishing-game/assets/approved-mock/cast-harbor-composite-base.png"
PLAYER = ROOT / "fishing-game/assets/generated/harbor-aji-master-v2/cast-player-silhouette-candidate.png"


def composite(world, actor, x, y):
    h, w = world.shape[:2]
    out = world.copy()
    ah, aw = actor.shape[:2]
    dx0, dy0 = max(0, x), max(0, y)
    dx1, dy1 = min(w, x + aw), min(h, y + ah)
    if dx0 >= dx1 or dy0 >= dy1:
        return out
    src = actor[dy0-y:dy1-y, dx0-x:dx1-x]
    dest = out[dy0:dy1, dx0:dx1]
    strength = src[:, :, 3:4].astype(np.float32) / 255
    dest[:, :, :3] = np.uint8(np.clip(src[:, :, :3] * strength + dest[:, :, :3] * (1 - strength), 0, 255))
    dest[:, :, 3] = np.uint8(np.clip(src[:, :, 3] + dest[:, :, 3] * (1 - strength[:, :, 0]), 0, 255))
    return out


def on_neutral(canvas):
    h, w = canvas.shape[:2]
    bg = np.full((h, w, 3), (112, 112, 112), np.uint8)
    bg[::24, :, :] = 149
    bg[:, ::24, :] = 149
    a = canvas[:, :, 3:4].astype(np.float32) / 255
    return np.uint8(np.clip(canvas[:, :, :3] * a + bg * (1 - a), 0, 255))


def run(output: Path, shift: int = 172, feather: int = 8):
    if not 100 <= shift <= 220 or not 0 <= feather <= 15:
        raise ValueError("Out-of-range pilot parameters")
    master = cv2.imread(str(MASTER), cv2.IMREAD_UNCHANGED)
    player = cv2.imread(str(PLAYER), cv2.IMREAD_UNCHANGED)
    if master is None or master.shape != (783, 391, 4):
        raise ValueError("Approved Harbor source changed: repeat visual review")
    if player is None or player.shape != (230, 180, 4):
        raise ValueError("Approved silhouette changed: repeat visual review")
    h, w = master.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    alpha = master[:, :, 3]
    # Only the player-shaped hole; preserve existing intentional transparent
    # sky, UI, footer and other masks, especially the wide header aperture.
    mask[345:560, :180] = np.where(alpha[345:560, :180] < 250, 255, 0).astype(np.uint8)
    count = int(cv2.countNonZero(mask))
    if not 13000 <= count <= 19500:
        raise ValueError(f"Unexpected approved player opening: {count} pixels")

    bgr = master[:, :, :3]
    baseline = cv2.inpaint(bgr, mask, 3, cv2.INPAINT_TELEA)
    xvalues = np.minimum(np.arange(w, dtype=np.int32) + shift, w - 1)
    copy = np.ascontiguousarray(bgr[:, xvalues, :])
    reference_alpha = alpha[:, xvalues]
    if (reference_alpha[mask > 0] < 220).any():
        raise ValueError("Copied from a source with missing painted water")

    distance = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    blend = np.minimum(distance / max(1, feather), 1).astype(np.float32)[:, :, None] if feather else np.ones((h, w, 1), np.float32)
    blend_bgr = np.uint8(np.clip(baseline * (1 - blend) + copy * blend, 0, 255))

    output.mkdir(parents=True, exist_ok=True)
    observed = []
    for name, candidate_rgb in (("neighbor-water", copy), ("feathered-water", blend_bgr)):
        result = master.copy()
        selected = mask > 0
        result[selected, :3] = candidate_rgb[selected, :]
        result[selected, 3] = 255
        if not np.array_equal(result[~selected, :], master[~selected, :]):
            raise AssertionError("Changed original pixels outside the explicit player opening")
        cv2.imwrite(str(output / (name + "-candidate.png")), result)

        snapshots = []
        for dx in (-18, 0, 18):
            preview = composite(result, player, dx, 349)
            snapshots.append(on_neutral(preview))
            cv2.imwrite(str(output / f"{name}-player-offset-{dx:+d}.png"), preview)
        board = np.concatenate(snapshots, axis=1)
        cv2.imwrite(str(output / (name + "-motion-board.jpg")), board)
        observed.append({"variant": name, "offsets_px": [-18, 0, 18],
                         "production_promoted": False, "background_art_approved": False,
                         "actual_player_motion_in_game": False})

    report = {
        "source_sha256": hashlib.sha256(MASTER.read_bytes()).hexdigest(),
        "source_size": [w, h], "player_hole_pixels": count,
        "water_reference_horizontal_offset": shift,
        "feather_pixels": feather,
        "source_outside_hole_preserved": True,
        "review_only": True,
        "reconstruction_of_true_hidden_pier": False,
        "player_motion_ready": False,
        "ui_alpha_preserved_outside_mask": True,
        "human_visual_review": "not_checked",
        "variants": observed
    }
    (output / "review-metrics.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))
    return report


if __name__ == "__main__":
    cli = argparse.ArgumentParser()
    cli.add_argument("--out", type=Path, required=True)
    cli.add_argument("--shift", type=int, default=172)
    cli.add_argument("--feather", type=int, default=8)
    args = cli.parse_args()
    run(args.out, shift=args.shift, feather=args.feather)
