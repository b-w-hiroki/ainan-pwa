"""Remove detached, nearly transparent UI raster specks without reshaping art.

Run from the repository root. Git retains the original PNG bytes at BASE;
--check verifies each shipped image and the provenance manifest. Requires
Pillow, numpy and scipy. Only alpha 1..7 more than five source pixels from
alpha >= 32 may become transparent. RGB and every other alpha value stay put.
"""

import argparse
import hashlib
import io
import json
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt


BASE = "47f451b440c364cd4bd559366409b5c142db95a5"
ROOT = Path("fishing-game/assets")
REPORT = Path("docs/art-source/ui-edge-clean-v1/manifest.json")
EXPECTED_FILES = 23


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def clean(pixels):
    result = pixels.copy()
    alpha = pixels[:, :, 3]
    distance = distance_transform_edt(alpha < 32)
    removed = (alpha > 0) & (alpha <= 7) & (distance > 5)
    result[removed, 3] = 0
    return result, removed


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    sources = sorted(path for folder in (ROOT / "ui-art-v1", ROOT / "ui-art-v2")
                     for path in folder.glob("*.png") if not path.name.endswith("-source.png"))
    assert len(sources) == EXPECTED_FILES, len(sources)
    source_sheets = [ROOT / "ui-art-v1/button-kit-source.png",
                     ROOT / "ui-art-v1/nav-kit-source.png",
                     ROOT / "ui-art-v2/system-kit-source.png"]
    for path in source_sheets:
        assert path.read_bytes() == subprocess.check_output(
            ["git", "show", f"{BASE}:{path.as_posix()}"]), path
    entries = []
    for path in sources:
        original = subprocess.check_output(["git", "show", f"{BASE}:{path.as_posix()}"])
        with Image.open(io.BytesIO(original)) as image:
            assert image.mode == "RGBA", path
            before = np.array(image)
        after, removed = clean(before)
        assert np.array_equal(before[:, :, :3], after[:, :, :3]), path
        assert np.array_equal(before[:, :, 3][~removed], after[:, :, 3][~removed]), path
        assert int(before[:, :, 3][removed].max(initial=0)) <= 7, path
        assert np.array_equal(after, clean(after)[0]), f"Not idempotent: {path}"
        if args.check:
            with Image.open(path) as image:
                assert image.mode == "RGBA" and np.array_equal(np.array(image), after), path
        else:
            with Image.open(path) as image:
                current = np.array(image)
            assert np.array_equal(current, before) or np.array_equal(current, after), (
                f"Refusing to replace newer art: {path}")
            if not np.array_equal(current, after):
                buffer = io.BytesIO()
                Image.fromarray(after, "RGBA").save(buffer, format="PNG", optimize=True)
                temporary = path.with_suffix(".png.tmp")
                temporary.write_bytes(buffer.getvalue())
                temporary.replace(path)
        entries.append({
            "path": path.as_posix(),
            "size": [before.shape[1], before.shape[0]],
            "originalSha256": sha256(original),
            "outputSha256": sha256(path.read_bytes()),
            "removedPixels": int(removed.sum()),
            "maxCompositeChannelDeltaBound": int(before[:, :, 3][removed].max(initial=0)),
            "rgbUnchanged": True,
            "alpha8AndAboveUnchanged": True,
            "idempotent": True,
        })
    report = {
        "originalCommit": BASE,
        "restore": "git show <originalCommit>:<path>",
        "rule": "Only alpha 1..7 more than five source pixels from alpha >=32 becomes zero; every RGB value and all other alpha bytes are unchanged.",
        "sourceSheetsUntouched": True,
        "entries": entries,
    }
    if args.check:
        assert json.loads(REPORT.read_text(encoding="utf-8")) == report, REPORT
    else:
        REPORT.parent.mkdir(parents=True, exist_ok=True)
        REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"files": len(entries), "changedFiles": sum(e["removedPixels"] > 0 for e in entries),
                      "removedPixels": sum(e["removedPixels"] for e in entries), "check": args.check}))


if __name__ == "__main__":
    main()
