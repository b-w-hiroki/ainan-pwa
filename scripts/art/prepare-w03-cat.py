"""Make the W03 companion review PNG from its untouched generated source.

Only near-invisible alpha specks and saturated low-alpha edge RGB are changed.
The silhouette, pose, scale, and all visible interior pixels stay in place.
"""

import argparse
from pathlib import Path

import numpy as np
from PIL import Image

from transparent_edge import clean


ROOT = Path("docs/art-source/w03-cute-companion")
SOURCE = ROOT / "W03-CUTE-cat-source.png"
OUTPUT = ROOT / "W03-CUTE-cat.png"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    with Image.open(SOURCE) as image:
        assert image.mode == "RGBA" and image.size == (1254, 1254)
        original = np.array(image)
    prepared = original.copy()
    noise = prepared[:, :, 3] <= 4
    prepared[noise, 3] = 0
    prepared, fringe = clean(prepared)

    assert np.array_equal(prepared[~(noise | fringe)], original[~(noise | fringe)])
    assert np.array_equal(prepared[~noise, 3], original[~noise, 3])
    alpha = prepared[:, :, 3]
    bbox = Image.fromarray((alpha > 20).astype("uint8") * 255).getbbox()
    assert bbox is not None and 200 < bbox[0] < 400 and 900 < bbox[3] < 1100, bbox
    assert np.all(alpha[0] == 0) and np.all(alpha[-1] == 0)
    assert np.all(alpha[:, 0] == 0) and np.all(alpha[:, -1] == 0)
    if args.check:
        with Image.open(OUTPUT) as image:
            assert image.mode == "RGBA" and image.size == (1254, 1254)
            assert np.array_equal(np.array(image), prepared)
    else:
        Image.fromarray(prepared, "RGBA").save(OUTPUT, optimize=True)
    print(f"{OUTPUT}: bbox={bbox}, removed-specks={int(((original[:, :, 3] > 0) & noise).sum())}, fringe-rgb={int(fringe.sum())}, check={args.check}")


if __name__ == "__main__":
    main()
