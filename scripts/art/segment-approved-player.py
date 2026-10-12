#!/usr/bin/env python3
"""Review-only GrabCut silhouette from AINAN's approved Cast player illustration.

Does not approve the mask or promote animation: tightly scoped subjective
visual review and integration tests are needed. No production files changed.
"""
import argparse
import hashlib
import json
from pathlib import Path
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'fishing-game/assets/approved-mock/cast-player-visible.png'
# Points traced at the actual 180x230 source resolution. This explicit seed is
# a revisionable authoring decision, not a universal automatic person detector.
OUTLINE = np.array([
    (70,17),(87,9),(108,13),(121,25),(123,42),(121,53),
    (113,63),(112,78),(123,76),(136,84),(142,102),(137,115),
    (129,125),(128,138),(145,163),(148,181),(137,195),
    (107,199),(86,210),(61,205),(52,188),(39,180),(25,156),
    (15,148),(13,131),(20,115),(33,100),(45,80),
    (52,65),(54,43),(62,25)
], dtype=np.int32)


def run(output_dir: Path):
    image = cv2.imread(str(SOURCE), cv2.IMREAD_UNCHANGED)
    if image is None or image.shape != (230, 180, 4):
        raise ValueError('Approved reference has changed; review seed coordinates before proceeding')
    h, w = image.shape[:2]
    polygon = np.zeros((h, w), np.uint8)
    cv2.fillPoly(polygon, [OUTLINE], 255)
    broad = cv2.dilate(polygon, np.ones((13, 13), np.uint8))
    core = cv2.erode(polygon, np.ones((13, 13), np.uint8))
    labels = np.full((h, w), cv2.GC_BGD, np.uint8)
    labels[broad > 0] = cv2.GC_PR_BGD
    labels[polygon > 0] = cv2.GC_PR_FGD
    labels[core > 0] = cv2.GC_FGD
    labels[image[:, :, 3] < 5] = cv2.GC_BGD
    source_bgr = image[:, :, :3].copy()
    background_model = np.zeros((1, 65), np.float64)
    foreground_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(source_bgr, labels, None, background_model, foreground_model,
                8, cv2.GC_INIT_WITH_MASK)
    alpha = np.where((labels == cv2.GC_FGD) | (labels == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0.8)
    alpha = np.minimum(alpha, image[:, :, 3])
    # No colors are invented. Keep original RGB under the silhouette.
    result = image.copy()
    result[:, :, 3] = alpha
    pixels = int((alpha > 127).sum())
    if not 9000 <= pixels <= 17000:
        raise ValueError(f'Unexpected silhouette coverage: {pixels}; must re-review')
    output_dir.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_dir / 'source-player.png'), image)
    cv2.imwrite(str(output_dir / 'player-silhouette-candidate.png'), result)
    white = np.full((h, w, 3), 235, np.uint8)
    checker = white.copy()
    checker[::16] = (185, 185, 185)
    a = alpha.astype(np.float32)[:, :, None] / 255
    preview = (source_bgr * a + checker * (1-a)).astype(np.uint8)
    cv2.imwrite(str(output_dir / 'silhouette-on-light.png'), preview)
    board = np.concatenate([image[:, :, :3], preview], axis=1)
    cv2.imwrite(str(output_dir / 'player-mask-comparison.png'), board)
    report = {
        'source': str(SOURCE.relative_to(ROOT)),
        'source_sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'dimensions': [w, h],
        'foreground_pixels_gt127': pixels,
        'alpha_partial_pixels': int(((alpha > 0) & (alpha < 255)).sum()),
        'original_rgb_preserved': bool(np.array_equal(result[:, :, :3], image[:, :, :3])),
        'subject_only_artwork_candidate': True,
        'rod_independent_animation': 'not_tested',
        'occlusion_background_completed': False,
        'game_integrated': False,
        'motion_ready': False,
        'production_promoted': False,
        'visual_review': 'not_checked'
    }
    (output_dir / 'mask-report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False)+'\n')
    print(json.dumps(report, ensure_ascii=False))
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    run(args.out)
