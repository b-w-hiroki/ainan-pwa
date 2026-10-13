#!/usr/bin/env python3
"""Review-only Harbor world reconstruction: preserve both sea and pier materials.

The approved master has a 16,388-pixel transparent player-shaped opening.
A water-only clone incorrectly turns the foot-level quay into water. This tool
uses source-faithful *material-separated* donors as a new candidate and builds
motion-extreme boards for human art review. It does NOT alter production art.
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
OFFSETS = (-18, 0, 18)


def load_approved():
    source = cv2.imread(str(MASTER), cv2.IMREAD_UNCHANGED)
    actor = cv2.imread(str(PLAYER), cv2.IMREAD_UNCHANGED)
    if source is None or source.shape != (783, 391, 4):
        raise ValueError("Approved Harbor art changed: revise sample geometry")
    if actor is None or actor.shape != (230, 180, 4):
        raise ValueError("Approved source-faithful player candidate changed")
    return source, actor


def make_world(source):
    height, width = source.shape[:2]
    y, x = np.mgrid[0:height, 0:width].astype(np.float32)
    opening = np.zeros((height, width), np.uint8)
    opening[345:560, :180] = (source[345:560, :180, 3] < 250).astype(np.uint8)
    opening_count = int(opening.sum())
    if not 15000 <= opening_count <= 18000:
        raise ValueError(f"Unexpected subject void: {opening_count} pixels")

    # Perspective review estimate from the visible upper dock edge:
    # y approximately 423 + 0.315*x in source coordinates.
    # It is deliberately explicit, revisionable and NOT source truth.
    pier = (opening > 0) & (y >= 423.0 + 0.315 * x)
    water = (opening > 0) & (~pier)
    if int(pier.sum()) < 4000 or int(water.sum()) < 4000:
        raise ValueError("Materials not separately represented in the opening")

    source_x = x.copy()
    source_y = y.copy()
    # Sea: preserve painted waves at the same Y (approximate perspective).
    source_x[water] = np.minimum(x[water] + 172, width - 1)
    # Quay: follow the dock's receding edge to painted quay samples.
    quay_x = np.minimum(np.maximum(x + 145, 195), 340)
    quay_y = np.minimum(y + 0.315 * (quay_x - x), 573)
    source_x[pier], source_y[pier] = quay_x[pier], quay_y[pier]

    donor_rgb = cv2.remap(source[:, :, :3], source_x, source_y,
                          cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101)
    donor_alpha = cv2.remap(source[:, :, 3], source_x, source_y,
                            cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101)
    if int(((donor_alpha < 235) & (opening > 0)).sum()):
        raise AssertionError("Material donors include missing/transparent pixels")

    # Telea is used only as a thin 6px transition band, NEVER as the material
    # filling for the full opening. The center comes from existing painted art.
    distance = cv2.distanceTransform(opening, cv2.DIST_L2, 5)
    mix = np.clip(distance / 6.0, 0, 1)[:, :, None]
    edge_only = cv2.inpaint(source[:, :, :3], opening * 255, 3, cv2.INPAINT_TELEA)
    painted = np.uint8(np.clip(donor_rgb * mix + edge_only * (1 - mix), 0, 255))
    world = source.copy()
    selected = opening > 0
    world[selected, :3] = painted[selected]
    world[selected, 3] = 255
    if not np.array_equal(world[~selected], source[~selected]):
        raise AssertionError("Modified approved pixels outside player opening")
    stats = {
        "source_dimensions": [width, height],
        "opened_pixels": opening_count,
        "water_filled_pixels": int(water.sum()),
        "pier_filled_pixels": int(pier.sum()),
        "donor_invalid_pixels": 0,
        "source_outside_opening_pixel_exact": True,
    }
    return world, opening, pier, water, stats


def composite(world, player, left, top=349):
    output = world.copy()
    height, width = output.shape[:2]
    ph, pw = player.shape[:2]
    x0, x1 = max(0, left), min(width, left + pw)
    y0, y1 = max(0, top), min(height, top + ph)
    if x1 <= x0 or y1 <= y0:
        return output
    fg = player[y0-top:y1-top, x0-left:x1-left]
    bg = output[y0:y1, x0:x1]
    a = fg[:, :, 3:4].astype(np.float32) / 255
    bg[:, :, :3] = np.uint8(np.clip(fg[:, :, :3] * a + bg[:, :, :3] * (1 - a), 0, 255))
    bg[:, :, 3] = np.uint8(np.clip(fg[:, :, 3] + bg[:, :, 3] * (1 - a[:, :, 0]), 0, 255))
    return output


def display_against_gray(picture):
    gray = np.full(picture.shape[:2] + (3,), 105, np.uint8)
    alpha = picture[:, :, 3:4].astype(np.float32) / 255
    return np.uint8(np.clip(picture[:, :, :3] * alpha + gray * (1 - alpha), 0, 255))


def run(output_dir):
    source, player = load_approved()
    world, opening, pier, water, stats = make_world(source)
    output_dir.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_dir / "world-material-candidate.png"), world)
    # Red: candidate quay, blue: candidate seawater. This image is a QA mask,
    # not a production game visual.
    mask_visual = np.zeros_like(world)
    mask_visual[pier] = (38, 63, 250, 255)
    mask_visual[water] = (230, 140, 31, 255)
    cv2.imwrite(str(output_dir / "material-mask.png"), mask_visual)
    boards = []
    for dx in OFFSETS:
        frame = composite(world, player, dx)
        cv2.imwrite(str(output_dir / f"player-offset-{dx:+d}.png"), frame)
        boards.append(display_against_gray(frame))
    cv2.imwrite(str(output_dir / "material-motion-board.jpg"),
                np.concatenate(boards, axis=1))
    assert np.count_nonzero(opening) == stats["water_filled_pixels"] + stats["pier_filled_pixels"]
    stats.update({
        "source_sha256": hashlib.sha256(MASTER.read_bytes()).hexdigest(),
        "candidate_type": "material-aware experimental donor reconstruction",
        "player_offsets_review_px": list(OFFSETS),
        "actor_rod_line_connection_verified": False,
        "true_hidden_dock_art_approved": False,
        "real_game_motion_integrated": False,
        "full_25d_world_approved": False,
        "human_art_review": "pending",
        "production_promoted": False,
        "reason": "dock perspective, repeating textures and rod/line junction require human visual review",
    })
    (output_dir / "material-review.json").write_text(
        json.dumps(stats, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(stats, ensure_ascii=False))
    return stats


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    run(args.out)
