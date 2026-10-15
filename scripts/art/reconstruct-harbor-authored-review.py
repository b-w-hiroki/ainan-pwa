#!/usr/bin/env python3
"""H02 QA-only Harbor repair. Author material topology rather than copy quay props.

The approved 391x783 RGBA source has a transparent player-shaped opening.
Known pixels outside that opening MUST remain bit-identical. Generated
surfaces are a review proposal, not recovered ground truth or production art.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
BASE_SCRIPT = Path(__file__).with_name("reconstruct-harbor-material-review.py")
spec = importlib.util.spec_from_file_location("harbor_material_review", BASE_SCRIPT)
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)


def opening_from_source(source):
    opening = np.zeros(source.shape[:2], dtype=bool)
    opening[345:560, :180] = source[345:560, :180, 3] < 250
    if not 15000 <= int(opening.sum()) <= 18000:
        raise ValueError("Approved source alpha/opening contract changed")
    return opening


def material_regions(source, opening):
    yy, xx = np.indices(source.shape[:2], dtype=np.float32)
    intercept, slope, residual = base.fitted_quay_edge()
    back = intercept + slope * xx
    front = 495.0 + 0.22 * xx
    if np.any(front[opening] - back[opening] < 14):
        raise ValueError("Quay top/front perspective model degenerate")
    water = opening & (yy < back)
    deck = opening & (yy >= back) & (yy < front)
    face = opening & (yy >= front)
    if not np.array_equal(water | deck | face, opening):
        raise AssertionError("Three material regions must partition the opening")
    if min(int(water.sum()), int(deck.sum()), int(face.sum())) < 350:
        raise AssertionError("One of the authored materials is missing")
    return (water, deck, face), (back, front), (intercept, slope, residual)


def layered_grain(width, height, seed, low_amplitude=13.0):
    rng = np.random.default_rng(seed)
    fine = rng.normal(0, 5.5, (height, width)).astype(np.float32)
    coarse = rng.normal(0, 1, (height, width)).astype(np.float32)
    coarse = cv2.GaussianBlur(coarse, (0, 0), 5.2) * 32
    broad = rng.normal(0, 1, (height, width)).astype(np.float32)
    broad = cv2.GaussianBlur(broad, (0, 0), 18) * 55
    return np.clip(fine + coarse * low_amplitude / 9 + broad, -38, 38)


def paint_authored_materials(source, regions, edges):
    """Explicitly shade quay planes: no donor copying bollards/rope into the pier."""
    height, width = source.shape[:2]
    yy, xx = np.indices((height, width), dtype=np.float32)
    water, deck, face = regions
    rear, front = edges
    rgb = np.empty((height, width, 3), np.float32)

    # Sea donor is strictly ABOVE visible bollard/rope and OUTSIDE the subject
    # opening. Do not sample x<180 (the missing subject area) or the deck.
    sample_x = np.clip(xx + 186 + 9 * np.sin(yy * 0.051), 184, width - 10).astype(np.float32)
    sample_y = np.clip(yy - 2 * np.cos(xx * 0.12), 150, 462).astype(np.float32)
    donor = cv2.remap(source, sample_x, sample_y, cv2.INTER_LINEAR,
                      borderMode=cv2.BORDER_REFLECT_101)
    unsafe = water & ((donor[:, :, 3] < 245) | (sample_y >= 478))
    if unsafe.any():
        raise AssertionError("Water donor touched alpha/unknown or mooring structures")
    rgb[:] = donor[:, :, :3].astype(np.float32)

    # Hand-authored flat *plane geometry* + multi-scale texture, not copied
    # quay posts/ropes and not just a plain colour patch. Explicit back edge,
    # deck boards, and separate vertical front fascia follow perspective.
    grain = layered_grain(width, height, 140)
    tilt = np.clip((yy - rear) / np.maximum(1, front - rear), 0, 1)
    # OpenCV BGR: warm stone quay surface, gradually shadowed toward the fascia.
    deck_b = 151 - 17 * tilt + grain
    deck_g = 177 - 23 * tilt + grain * .90
    deck_r = 195 - 24 * tilt + grain * .80
    # Board seams run parallel to the perspective quay edge. A slightly
    # irregular pitch prevents a flat repeated stripe pattern.
    groove_phase = (yy - rear + 7 * np.sin(xx * 0.033)) / 33
    groove_distance = np.abs(groove_phase - np.round(groove_phase))
    groove = np.exp(-np.square(groove_distance / 0.047)) * 33
    joints = ((xx + yy * .25 + 3 * np.sin(yy * .07)) % 91 < 1.8).astype(np.float32) * 13
    deck_rgb = np.stack((deck_b, deck_g, deck_r), axis=-1)
    deck_rgb -= (groove + joints)[..., None]
    rim_light = np.clip(2.8 - np.abs(yy - rear), 0, 2.8) * 10
    deck_rgb += rim_light[..., None]
    rgb[deck] = deck_rgb[deck]

    # Distinct vertical quay front, with masonry joints. It is not sampled
    # from the original rope/bollard ROI (x=133..322, y=485..563).
    fascia_grain = layered_grain(width, height, 141, low_amplitude=16)
    darkening = np.clip((yy - front) / 62, 0, 1)
    masonry = ((xx + 0.12 * yy) % 71 < 2.4).astype(np.float32) * 17
    face_rgb = np.stack((
        118 - 27 * darkening + fascia_grain,
        142 - 33 * darkening + .92 * fascia_grain,
        156 - 38 * darkening + .86 * fascia_grain,
    ), axis=-1) - masonry[..., None]
    lip = np.clip(3.2 - np.abs(yy - front), 0, 3.2)
    face_rgb -= (lip * 5)[..., None]
    rgb[face] = face_rgb[face]
    return np.uint8(np.clip(rgb, 0, 255)), {
        "water_donor_min_x": float(sample_x[water].min()),
        "water_donor_max_y": float(sample_y[water].max()),
        "pier_texture_source": "authored three-plane geometry + seeded multiscale pigments",
        "bollard_or_rope_pixels_donor_copied": 0,
    }


def make_candidate(source):
    opening = opening_from_source(source)
    regions, edges, fit = material_regions(source, opening)
    proposal, technique = paint_authored_materials(source, regions, edges)
    water, deck, face = regions
    # Local 3px colour transition ONLY at the cutout perimeter. Never use
    # inpainting to generate the body of a large missing pier/water area.
    edge_fallback = cv2.inpaint(source[:, :, :3], (opening * 255).astype(np.uint8),
                                3, cv2.INPAINT_TELEA)
    distance = cv2.distanceTransform(opening.astype(np.uint8), cv2.DIST_L2, 3)
    blend = np.clip(distance / 3.0, 0, 1)[..., None]
    painted = np.uint8(np.clip(proposal * blend + edge_fallback * (1 - blend), 0, 255))
    world = source.copy()
    world[opening, :3] = painted[opening]
    world[opening, 3] = 255
    if not np.array_equal(world[~opening], source[~opening]):
        raise AssertionError("Approved source pixels outside the opening changed")
    if np.any(world[opening, 3] != 255):
        raise AssertionError("Player opening is still transparent")
    return world, opening, regions, edges, fit, technique


def render(out):
    source, actor = base.load_approved()
    world, opening, (water, deck, face), (back, front), fit, technique = make_candidate(source)
    out.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out / "h02-authored-world-candidate.png"), world)
    material = np.zeros_like(source)
    material[water] = (230, 140, 31, 255)
    material[deck] = (38, 63, 250, 255)  # same colour as existing deck quality guard
    material[face] = (145, 44, 223, 255)
    cv2.imwrite(str(out / "h02-authored-material-mask.png"), material)
    yy, xx = np.indices(opening.shape)
    overlay = world.copy()
    near_rear = opening & (np.abs(yy - back) < 2)
    near_front = opening & (np.abs(yy - front) < 2)
    rim = opening & ~(cv2.erode(opening.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0)
    overlay[near_rear, :3] = (10, 230, 255)
    overlay[near_front, :3] = (255, 20, 240)
    overlay[rim, :3] = (0, 0, 255)
    cv2.imwrite(str(out / "h02-authored-edge-diagnostic.png"), overlay)
    frames = []
    for offset in (-18, 0, 18):
        frame = base.composite(world, actor, offset)
        cv2.imwrite(str(out / f"h02-authored-player-{offset:+d}.png"), frame)
        frames.append(base.display_against_gray(frame))
    cv2.imwrite(str(out / "h02-authored-motion-board.jpg"), np.concatenate(frames, axis=1))
    # The actor itself still contains sea/rope pixels: H03 is NOT resolved.
    stats = {
        "source_sha256": hashlib.sha256(base.MASTER.read_bytes()).hexdigest(),
        "source_dimensions": [391, 783],
        "opened_pixels": int(opening.sum()),
        "water_pixels": int(water.sum()),
        "deck_pixels": int(deck.sum()),
        "front_face_pixels": int(face.sum()),
        "outside_opening_pixel_exact": True,
        "cutout_filled_opaque": True,
        "anchor_fit": {"intercept": round(fit[0], 3), "slope": round(fit[1], 5),
                       "max_residual_px": round(fit[2], 3), "hand_estimated": True},
        "materials": technique,
        "player_offsets_review_px": [-18, 0, 18],
        "existing_actor_cutout_is_clean": False,
        "full_wide_ocean_world_ready": False,
        "source_perspective_proven": False,
        "art_approved": False,
        "game_motion_implemented": False,
        "production_promoted": False,
        "review_required": ["quay geometry", "wave/pier seam", "palette/brush style",
                            "actor alpha and rod", "long ocean world/cast camera"],
    }
    (out / "h02-authored-review.json").write_text(json.dumps(stats, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(stats, ensure_ascii=False))
    return stats


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    render(args.out)
