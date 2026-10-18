"""Conservative character edge decontamination. Requires Pillow, numpy, scipy.

Run from the repository root. Originals remain in Git at BASE and source art is
never overwritten. --check verifies outputs against those immutable originals.
Only saturated RGB in alpha 1..31 is replaced; alpha and geometry are untouched.
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

BASE = "887de90039d04b3695565204b46ebe15de1c9308"
DEST = Path("docs/art-source/w03-edge-clean-v1")


def clean(pixels):
    result = pixels.copy()
    rgb = pixels[:, :, :3].astype(np.int16)
    alpha = pixels[:, :, 3]
    mask = (alpha > 0) & (alpha < 32) & (rgb.max(2) > 220) & ((rgb.max(2) - rgb.min(2)) > 160)
    if mask.any():
        if not (alpha >= 32).any():
            raise ValueError("No reliable color to borrow")
        _, nearest = distance_transform_edt(alpha < 32, return_indices=True)
        result[mask, :3] = pixels[nearest[0][mask], nearest[1][mask], :3]
    return result, mask


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    paths = subprocess.check_output(["git", "ls-tree", "-r", "--name-only", BASE], text=True).splitlines()
    sources = [
        "docs/art-source/w03-cute-body/W03-CUTE-A-idle-01.png",
        "docs/art-source/w03-cute-body/W03-CUTE-B-idle-01.png",
        "docs/art-source/w03-cute-hair/W03-CUTE-B-ponytail-hair.png",
    ]
    runtime = [p for p in paths if p.endswith(".png") and any(
        p.startswith(f"fishing-game/assets/candidates/w03-body-cute-{body}-01/") for body in ("a", "b"))]
    assert len(runtime) == 39, len(runtime)
    for body in ("a", "b"):
        metadata = f"fishing-game/assets/candidates/w03-body-cute-{body}-01/poses.json"
        # Git's Windows checkout can use CRLF; no metadata content may change.
        assert Path(metadata).read_bytes().replace(b"\r\n", b"\n") == subprocess.check_output(["git", "show", f"{BASE}:{metadata}"]).replace(b"\r\n", b"\n"), metadata
    for source in sources:
        assert Path(source).read_bytes() == subprocess.check_output(["git", "show", f"{BASE}:{source}"]), source
    entries = []
    for source in sources + runtime:
        original = subprocess.check_output(["git", "show", f"{BASE}:{source}"])
        im = Image.open(io.BytesIO(original))
        assert im.mode == "RGBA", source
        before = np.array(im)
        after, mask = clean(before)
        assert np.array_equal(before[:, :, 3], after[:, :, 3]), source
        assert np.array_equal(before[~mask], after[~mask]), source
        assert np.array_equal(clean(after)[0], after), f"Not idempotent: {source}"
        # Bound the real alpha-composited color difference on any background.
        delta = np.abs(after[:, :, :3].astype(float) - before[:, :, :3]) * before[:, :, 3:4] / 255
        max_delta = float(delta.max())
        assert max_delta <= 31, source
        output = Path(source) if source in runtime else DEST / Path(source).name
        if args.check:
            assert np.array_equal(np.array(Image.open(output)), after), str(output)
        else:
            output.parent.mkdir(parents=True, exist_ok=True)
            if output.exists():
                current = np.array(Image.open(output))
                assert np.array_equal(current, before) or np.array_equal(current, after), f"Refusing to replace newer art: {output}"
            buffer = io.BytesIO()
            if np.array_equal(before, after):
                encoded = original
            else:
                Image.fromarray(after).save(buffer, format="PNG")
                encoded = buffer.getvalue()
            temporary = output.with_suffix(".png.tmp")
            temporary.write_bytes(encoded)
            temporary.replace(output)
        entries.append(dict(source=source, output=output.as_posix(), sourceSha256=hashlib.sha256(original).hexdigest(),
                            outputSha256=hashlib.sha256(output.read_bytes()).hexdigest(),
                            changedPixels=int(np.any(before != after, axis=2).sum()),
                            maxCompositeChannelDelta=round(max_delta, 6), alphaUnchanged=True,
                            unaffectedPixelsUnchanged=True, idempotent=True, size=list(im.size)))
    report = dict(originalCommit=BASE, originalRestore="git show <originalCommit>:<source>",
                  rule="Replace saturated RGB (max > 220, range > 160) only at alpha 1..31 with nearest alpha >= 32 RGB; retain every alpha byte.",
                  limitations="Does not alter silhouette aliasing, water texture, UI or renderer DPR. Source derivatives are review-only.",
                  entries=entries)
    manifest = DEST / "manifest.json"
    if args.check:
        assert json.loads(manifest.read_text()) == report
    else:
        manifest.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(dict(files=len(entries), changedPixels=sum(e['changedPixels'] for e in entries),
                          alphaUnchanged=True, check=args.check)))


if __name__ == "__main__":
    main()
