"""Build QA-only W03 cap/bag cutouts from the existing source PNGs.

Only nearly invisible alpha specks and saturated low-alpha RGB are corrected.
The source art, visible contour, interior pixels and placement stay unchanged.
"""

import argparse
from pathlib import Path

import numpy as np
from PIL import Image

from transparent_edge import clean


SOURCE = Path("docs/art-source/w03-cute-equipment")
OUTPUT = Path("fishing-game/assets/candidates/w03-accessories-v1")
EXPECTED_BOUNDS = {
    "cap": (229, 257, 1160, 857),
    "bag": (366, 265, 959, 957),
}


def build(name, check):
    source = SOURCE / f"W03-CUTE-{name}.png"
    target = OUTPUT / f"{name}.png"
    with Image.open(source) as image:
        assert image.mode == "RGBA" and image.size == (1254, 1254), source
        original = np.array(image)
    prepared = original.copy()
    noise = prepared[:, :, 3] <= 4
    prepared[noise, 3] = 0
    prepared, fringe = clean(prepared)
    assert np.array_equal(prepared[~(noise | fringe)], original[~(noise | fringe)])
    assert np.array_equal(prepared[~noise, 3], original[~noise, 3])
    alpha = prepared[:, :, 3]
    bbox = Image.fromarray((alpha > 20).astype("uint8") * 255).getbbox()
    assert bbox == EXPECTED_BOUNDS[name], (name, bbox)
    assert np.all(alpha[0] == 0) and np.all(alpha[-1] == 0)
    if check:
        with Image.open(target) as image:
            assert image.mode == "RGBA" and image.size == (1254, 1254)
            assert np.array_equal(np.array(image), prepared), target
    else:
        OUTPUT.mkdir(parents=True, exist_ok=True)
        Image.fromarray(prepared, "RGBA").save(target, optimize=True)
    print(f"{target}: bbox={bbox}, removed-specks={int(((original[:, :, 3] > 0) & noise).sum())}, fringe-rgb={int(fringe.sum())}, check={check}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for name in EXPECTED_BOUNDS:
        build(name, args.check)


if __name__ == "__main__":
    main()
