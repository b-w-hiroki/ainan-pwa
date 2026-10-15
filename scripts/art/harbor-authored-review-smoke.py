#!/usr/bin/env python3
"""H02 authored-world negative controls, independent of game / production assets."""
import importlib.util
from pathlib import Path

import numpy as np

here = Path(__file__).resolve().parent
module = here / "reconstruct-harbor-authored-review.py"
spec = importlib.util.spec_from_file_location("h02_authored", module)
h02 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h02)

rng = np.random.default_rng(44)
source = np.empty((783, 391, 4), dtype=np.uint8)
source[:, :, :3] = rng.integers(60, 230, (783, 391, 3), dtype=np.uint8)
source[:, :, 3] = 255
source[345:545, 40:120, 3] = 0  # 16,000 subject pixels
# Forbidden mooring-pile / rope pigment: must never be cloned into quay.
source[485:554, 209:271, :3] = (0, 0, 250)
source[518:563, 133:322, :3] = (255, 0, 255)
world, opening, regions, edges, fit, provenance = h02.make_candidate(source)
assert int(opening.sum()) == 16000
assert all(int(material.sum()) > 350 for material in regions)
assert np.array_equal(world[~opening], source[~opening]), "Known art must stay bit exact"
assert np.all(world[opening, 3] == 255), "Unfilled pixel in cutout"
assert provenance["bollard_or_rope_pixels_donor_copied"] == 0
assert not np.any(np.all(world[regions[1], :3] == (0, 0, 250), axis=1))
assert not np.any(np.all(world[regions[2], :3] == (255, 0, 255), axis=1))
assert fit[2] < 12, "Manually observed anchors drifted"
try:
    h02.make_candidate(np.full((783, 391, 4), 255, np.uint8))
except ValueError as exc:
    assert "alpha/opening" in str(exc)
else:
    raise AssertionError("Missing subject cutout was accepted")

# A zero-alpha source region outside the known player window MUST never be
# 'repaired' by this tool or mistaken for reconstructed Harbor material.
assert source[0, 0, 3] == world[0, 0, 3] == 255
print("H02 authored quay QA: three planes, known pixel preservation, banned donor control OK")
