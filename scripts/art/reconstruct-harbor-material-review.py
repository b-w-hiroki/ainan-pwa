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
# Review-only hand-estimated samples of the visible dock edge, not source truth.
VISIBLE_QUAY_EDGE_ANCHORS = (
    (150, 470), (180, 486), (200, 507),
    (290, 540), (310, 550), (350, 568),
)


def fitted_quay_edge():
    samples = np.asarray(VISIBLE_QUAY_EDGE_ANCHORS, dtype=np.float64)
    slope, intercept = np.polyfit(samples[:, 0], samples[:, 1], 1)
    residual = np.abs(samples[:, 1] - (slope * samples[:, 0] + intercept))
    if not 0.38 < slope < 0.54 or float(residual.max()) > 12:
        raise ValueError("Inconsistent visible-edge review anchors")
    return float(intercept), float(slope), float(residual.max())


def edge_coordinates(edge_model):
    if edge_model == "legacy":
        return 423.0, 0.315
    if edge_model == "visible-anchors-review":
        intercept, slope, _ = fitted_quay_edge()
        return intercept, slope
    raise ValueError("Unknown review-only dock-edge model")



def load_approved():
    source = cv2.imread(str(MASTER), cv2.IMREAD_UNCHANGED)
    actor = cv2.imread(str(PLAYER), cv2.IMREAD_UNCHANGED)
    if source is None or source.shape != (783, 391, 4):
        raise ValueError("Approved Harbor art changed: revise sample geometry")
    if actor is None or actor.shape != (230, 180, 4):
        raise ValueError("Approved source-faithful player candidate changed")
    return source, actor


def structure_donor_risks(pier, edge_slope=0.315):
    """Flag known mooring structures copied into the missing actor region.

    These source ROIs are manually traced *review estimates*, not semantic
    segmentation. They prevent 'opaque donor' from implying 'correct pier'.
    """
    h, w = pier.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    quay_x = np.minimum(np.maximum(xx + 145, 195), 340)
    quay_y = np.minimum(yy + edge_slope * (quay_x - xx), 573)
    # Approximate the painted mooring bollard and curved rope in source space.
    bollard = pier & (quay_x >= 209) & (quay_x <= 271) & (quay_y >= 485) & (quay_y <= 554)
    rope = pier & (quay_x >= 133) & (quay_x <= 322) & (quay_y >= 518) & (quay_y <= 563)
    return bollard, rope


def make_world(source, seam_offset=0, edge_model='legacy'):
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
    if seam_offset not in (-6, 0, 6):
        raise ValueError('Unsupported review-only boundary offset')
    edge_intercept, edge_slope = edge_coordinates(edge_model)
    pier = (opening > 0) & (y >= edge_intercept + seam_offset + edge_slope * x)
    water = (opening > 0) & (~pier)
    if int(pier.sum()) < 4000 or int(water.sum()) < 4000:
        raise ValueError("Materials not separately represented in the opening")

    source_x = x.copy()
    source_y = y.copy()
    # Sea: preserve painted waves at the same Y (approximate perspective).
    source_x[water] = np.minimum(x[water] + 172, width - 1)
    # Quay: follow the dock's receding edge to painted quay samples.
    quay_x = np.minimum(np.maximum(x + 145, 195), 340)
    quay_y = np.minimum(y + edge_slope * (quay_x - x), 573)
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
    # Diagnose seam discontinuities *without claiming the reconstruction is
    # optically correct*. Measure only inside the missing region, not the
    # approved image where real perspective edges are intentional.
    # Flag (a) the guessed sea/quay material boundary and (b) the perimeter.
    boundary_y = edge_intercept + seam_offset + edge_slope * x
    near_material_seam = (opening > 0) & (np.abs(y - boundary_y) <= 3)
    interior = (opening > 0)
    seam_jump = cv2.absdiff(world[:, 1:, :3], world[:, :-1, :3])
    seam_luma = np.mean(seam_jump.astype(np.float32), axis=2)
    seam_pixels = near_material_seam[:, 1:] & near_material_seam[:, :-1]
    seam_mean = float(seam_luma[seam_pixels].mean()) if seam_pixels.any() else 0.0
    inward = cv2.erode(opening, np.ones((3, 3), np.uint8), iterations=1) > 0
    rim = interior & (~inward)
    boundary_preview = world.copy()
    boundary_preview[near_material_seam, :3] = (0, 0, 255)
    boundary_preview[rim, :3] = (0, 255, 255)
    # Diagnostic paint is exported separately, never changes the world candidate.
    diagnostic = {
        "seam_band_pixels": int(near_material_seam.sum()),
        "seam_horizontal_abs_rgb_mean": round(seam_mean, 3),
        "opening_rim_pixels": int(rim.sum()),
        "measurement_only": True,
        "human_approval_inferred": False,
    }
    reused_bollard, reused_rope = structure_donor_risks(pier, edge_slope)
    stats = {
        "source_dimensions": [width, height],
        "guessed_quay_edge_offset_px": seam_offset,
        "quay_edge_model": edge_model,
        "quay_edge_intercept": round(edge_intercept, 4),
        "quay_edge_slope": round(edge_slope, 6),
        "opened_pixels": opening_count,
        "water_filled_pixels": int(water.sum()),
        "pier_filled_pixels": int(pier.sum()),
        "donor_invalid_pixels": 0,
        "source_outside_opening_pixel_exact": True,
        "material_seam_diagnostic": diagnostic,
        "donor_structure_reuse": {
            "bollard_source_roi": [209, 485, 271, 554],
            "rope_source_roi": [133, 518, 322, 563],
            "bollard_target_pixels": int(reused_bollard.sum()),
            "rope_target_pixels": int(reused_rope.sum()),
            "pier_target_pixels": int(pier.sum()),
            "hand_estimated_roi": True,
            "measurement_only": True,
            "safe_for_production": False,
        },
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
    # Reconstruct the review mask from the same approved coordinate contract.
    yy, xx = np.mgrid[0:world.shape[0], 0:world.shape[1]]
    seam = (opening > 0) & (np.abs(yy - (423.0 + 0.315 * xx)) <= 3)
    inner = cv2.erode(opening, np.ones((3, 3), np.uint8), iterations=1) > 0
    seam_view = world.copy()
    seam_view[seam, :3] = (0, 0, 255)
    seam_view[(opening > 0) & (~inner), :3] = (0, 255, 255)
    cv2.imwrite(str(output_dir / "seam-boundary-review.png"), seam_view)
    # Red: candidate quay, blue: candidate seawater. This image is a QA mask,
    # not a production game visual.
    mask_visual = np.zeros_like(world)
    mask_visual[pier] = (38, 63, 250, 255)
    mask_visual[water] = (230, 140, 31, 255)
    cv2.imwrite(str(output_dir / "material-mask.png"), mask_visual)
    # Review under the missing character at source resolution. Red is copied
    # bollard; yellow is copied rope; purple is both. No gameplay art changes.
    reused_bollard, reused_rope = structure_donor_risks(pier)
    donor_review = world.copy()
    donor_review[reused_bollard, :3] = (0, 0, 255)
    donor_review[reused_rope, :3] = (0, 255, 255)
    donor_review[reused_bollard & reused_rope, :3] = (255, 0, 255)
    cv2.imwrite(str(output_dir / "donor-structure-risk-map.png"), donor_review)
    boards = []
    for dx in OFFSETS:
        frame = composite(world, player, dx)
        cv2.imwrite(str(output_dir / f"player-offset-{dx:+d}.png"), frame)
        boards.append(display_against_gray(frame))
    cv2.imwrite(str(output_dir / "material-motion-board.jpg"),
                np.concatenate(boards, axis=1))
    # The hidden dock edge is guessed, not measured. Compare three conservative
    # placements while holding the approved source, sampling geometry, player
    # silhouette and all known RGBA pixels constant.
    variants = []
    comparison_frames = []
    for offset in (-6, 0, 6):
        alternate, gap, alt_pier, alt_water, report = make_world(source, seam_offset=offset)
        assert np.array_equal(gap, opening), "Boundary variant altered the subject mask"
        assert np.array_equal(alternate[opening == 0], source[opening == 0]), (
            "Boundary variant changed visible approved pixels"
        )
        assert report["donor_invalid_pixels"] == 0
        middle = composite(alternate, player, 0)
        filename = f"quay-edge-{offset:+d}-player-center.png"
        cv2.imwrite(str(output_dir / filename), middle)
        comparison_frames.append(display_against_gray(middle))
        variants.append({
            "quay_edge_offset_px": offset,
            "center_preview_file": filename,
            "material_seam_diagnostic": report["material_seam_diagnostic"],
            "donor_structure_reuse": report["donor_structure_reuse"],
            "water_filled_pixels": report["water_filled_pixels"],
            "pier_filled_pixels": report["pier_filled_pixels"],
            "outside_opening_pixel_exact": True,
            "approved": False,
        })
    cv2.imwrite(str(output_dir / "quay-edge-variants-board.jpg"),
                np.concatenate(comparison_frames, axis=1))
    # H02: review a second world with geometry extrapolated from six known
    # visible positions. Neither preview changes source pixels outside the hole.
    anchored, same_opening, alt_pier, alt_water, anchor_stats = make_world(
        source, edge_model="visible-anchors-review"
    )
    assert np.array_equal(same_opening, opening)
    assert np.array_equal(anchored[opening == 0], source[opening == 0])
    cv2.imwrite(str(output_dir / "visible-edge-world-review.png"), anchored)
    visual_motion = [
        display_against_gray(composite(anchored, player, dx)) for dx in OFFSETS
    ]
    cv2.imwrite(str(output_dir / "visible-edge-motion-board.jpg"),
                np.concatenate(visual_motion, axis=1))
    overlay = world.copy()
    intercept, slope, residual = fitted_quay_edge()
    for base, rise, color in (
        (423.0, 0.315, (0, 0, 255, 255)),
        (intercept, slope, (0, 230, 255, 255)),
    ):
        for xx in range(0, source.shape[1] - 5, 9):
            xa, xb = xx, min(xx + 5, source.shape[1] - 1)
            cv2.line(overlay, (xa, round(base + rise * xa)),
                     (xb, round(base + rise * xb)), color, 2, cv2.LINE_AA)
    for ax, ay in VISIBLE_QUAY_EDGE_ANCHORS:
        if opening[ay, ax] or source[ay, ax, 3] < 245:
            raise AssertionError("Review edge anchors must be known source")
        cv2.circle(overlay, (ax, ay), 4, (70, 255, 60, 255), -1)
    cv2.imwrite(str(output_dir / "quay-visible-edge-overlay.png"), overlay)
    stats["visible_edge_review"] = {
        "anchors": [list(pair) for pair in VISIBLE_QUAY_EDGE_ANCHORS],
        "hand_estimated": True,
        "intercept": round(intercept, 4),
        "slope": round(slope, 6),
        "maximum_anchor_residual_px": round(residual, 3),
        "legacy_pier_pixels": stats["pier_filled_pixels"],
        "anchored_pier_pixels": anchor_stats["pier_filled_pixels"],
        "anchored_structure_reuse": anchor_stats["donor_structure_reuse"],
        "outside_opening_pixel_exact": True,
        "art_approved": False,
        "production_promoted": False,
    }
    stats["quay_edge_variants"] = variants
    stats["variant_art_review_complete"] = False
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
