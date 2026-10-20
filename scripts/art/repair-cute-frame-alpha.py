"""Repair the four active cute-character idle/cast-windup runtime frames.

The original renderer pasted an RGBA image with itself as a mask, squaring
partial alpha. Preserve the authored pose, scale, offsets, sockets and source
PNG; remove only near-invisible source noise before a single RGBA paste.
Run from the repository root. Requires Pillow, numpy and scipy.
"""

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

from transparent_edge import place_rgba


FRAME = (640, 840)
SOURCE_ROOT = Path("docs/art-source")
RUNTIME_ROOT = Path("fishing-game/assets/candidates")


def build(body, pose):
    folder = RUNTIME_ROOT / f"w03-body-cute-{body.lower()}-01"
    metadata = json.loads((folder / "poses.json").read_text(encoding="utf-8"))
    assert metadata["source"] == f"W03-CUTE-{body}-idle-01.png"
    assert metadata["poses"]["idle"]["offset"][:2] == metadata["poses"]["castWindup"]["offset"][:2]
    if pose == "idle":
        source = SOURCE_ROOT / "w03-cute-body" / metadata["source"]
    else:
        source = SOURCE_ROOT / "w03-cute-poses" / f"W03-CUTE-{body}-cast-windup.png"
    with Image.open(source) as image:
        assert image.mode == "RGBA" and image.size == (1254, 1254), source
        scale = metadata["scale"]
        size = (round(1254 * scale), round(1254 * scale))
        # The source has 1..4 alpha background specks. Removing only those
        # before resize prevents haze without moving the visible silhouette.
        frame = place_rgba(image, size, FRAME, tuple(metadata["poses"]["idle"]["offset"][:2]))
    return folder / f"{pose}.png", np.array(frame)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify saved frames without rewriting them")
    args = parser.parse_args()
    for body in ("A", "B"):
        for pose in ("idle", "cast-windup"):
            output, expected = build(body, pose)
            if args.check:
                actual = np.array(Image.open(output).convert("RGBA"))
                assert np.array_equal(actual, expected), output
            else:
                Image.fromarray(expected, "RGBA").save(output, optimize=True)
            alpha = expected[:, :, 3]
            bbox = Image.fromarray((alpha > 20).astype("uint8") * 255).getbbox()
            assert bbox[3] in (828, 829), (output, bbox)
            print(f"{output}: opaque-body bbox={bbox}, alpha-sum={int(alpha.sum())}")


if __name__ == "__main__":
    main()
