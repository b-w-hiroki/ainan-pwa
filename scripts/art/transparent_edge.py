"""Shared conservative RGB cleanup for translucent generated-art edges."""

import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt


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


def place_rgba(source, size, frame_size, offset, *, noise_cutoff=4):
    """Resize and place an RGBA cutout without applying its alpha twice."""
    pixels = np.array(source.convert("RGBA"))
    pixels[pixels[:, :, 3] <= noise_cutoff, 3] = 0
    resized = Image.fromarray(pixels, "RGBA").resize(size, Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", frame_size, (0, 0, 0, 0))
    frame.paste(resized, offset)  # No mask: an RGBA source already carries alpha.
    return Image.fromarray(clean(np.array(frame))[0], "RGBA")
