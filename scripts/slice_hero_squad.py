#!/usr/bin/env python3
"""
Process assets-src/sheets/hero-squad.jpg into a clean transparent PNG + WebP
with both the flat lilac background and the bottom lavender ground shadow removed.
"""

from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC_PATH = ROOT / "assets-src" / "sheets" / "hero-squad.jpg"
OUT_DIRS = [
    ROOT / "public" / "mascot",
    ROOT / "apps" / "web" / "public" / "mascot",
]


def process_hero_squad() -> None:
    im = Image.open(SRC_PATH).convert("RGBA")
    arr = np.array(im, dtype=np.float32)
    h, w, _ = arr.shape
    rgb = arr[:, :, :3]

    # Sample flat lilac background from image borders
    border = np.concatenate(
        [rgb[0, :, :], rgb[-1, :, :], rgb[:, 0, :], rgb[:, -1, :]], axis=0
    )
    bg_color = np.median(border, axis=0)
    diff = np.linalg.norm(rgb - bg_color[None, None, :], axis=2)

    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]

    # Exact flat lilac match (safe anywhere, protects pink bow & purple backpack)
    is_flat_lilac = (
        (diff < 22.0)
        & ((b - g) >= 5.0)
        & ((r - g) >= 5.0)
        & (np.abs(r - b) <= 12.0)
    )

    # Soft lavender ground shadow match (only applied near the bottom feet region y > 0.75 * h)
    yy = np.arange(h)[:, None]
    is_bottom_zone = yy >= int(h * 0.75)
    is_ground_shadow = (
        is_bottom_zone
        & (r > 175.0)
        & (g > 150.0)
        & (b > 175.0)
        & ((b - g) >= 5.0)
        & ((r - g) >= 5.0)
        & (np.abs(r - b) <= 24.0)
        & (diff < 78.0)
    )

    bg_candidate = is_flat_lilac | is_ground_shadow

    # 1. Exterior flood-fill from image borders
    labeled, _ = ndimage.label(bg_candidate)
    border_labels = np.unique(
        np.concatenate(
            [labeled[0, :], labeled[-1, :], labeled[:, 0], labeled[:, -1]]
        )
    )
    border_labels = border_labels[border_labels > 0]
    is_bg = np.isin(labeled, border_labels)

    # 2. Enclosed flat-lilac pockets (e.g. gaps between legs, arms, ears)
    internal_holes = (is_flat_lilac | is_ground_shadow) & (~is_bg)
    hole_labels, _ = ndimage.label(internal_holes)
    if hole_labels.max() > 0:
        sizes = ndimage.sum(
            np.ones_like(hole_labels),
            hole_labels,
            index=np.arange(1, hole_labels.max() + 1),
        )
        valid_holes = np.where(sizes >= 16)[0] + 1
        is_bg = is_bg | np.isin(hole_labels, valid_holes)

    # 3. Clean 2px halo & soft alpha ramp around background boundary
    bg_dilated_1 = ndimage.binary_dilation(is_bg, iterations=1)
    bg_dilated_2 = ndimage.binary_dilation(is_bg, iterations=2)
    edge_band = bg_dilated_2 & (~is_bg)

    is_edge_halo = (
        edge_band
        & ((b - g) >= 4.0)
        & ((r - g) >= 4.0)
        & (np.abs(r - b) <= 26.0)
        & (diff < 82.0)
    )
    is_bg = is_bg | is_edge_halo

    bg_dilated = ndimage.binary_dilation(is_bg, iterations=2)
    boundary = bg_dilated & (~is_bg)

    alpha = np.where(is_bg, 0.0, 255.0)
    ramp = np.clip((diff - 16.0) / (58.0 - 16.0), 0.0, 1.0) * 255.0
    alpha = np.where(boundary, np.minimum(alpha, ramp), alpha)

    # Decontaminate edge pixels from lilac tint
    a_norm = alpha[:, :, None] / 255.0
    mask_semi = (alpha > 0) & (alpha < 250)
    rgb_clean = rgb.copy()
    for c in range(3):
        ch = rgb[:, :, c]
        decontam = (ch - (1.0 - a_norm[:, :, 0]) * bg_color[c]) / np.maximum(
            a_norm[:, :, 0], 0.15
        )
        rgb_clean[:, :, c] = np.where(
            mask_semi, np.clip(decontam, 0, 255), ch
        )

    out = np.zeros_like(arr, dtype=np.uint8)
    out[:, :, :3] = np.clip(rgb_clean, 0, 255).astype(np.uint8)
    out[:, :, 3] = np.clip(alpha, 0, 255).astype(np.uint8)

    # Keep only largest foreground components (removes any tiny stray specs)
    fg = out[:, :, 3] > 20
    fg_lbl, n_fg = ndimage.label(fg)
    if n_fg > 0:
        fg_sizes = ndimage.sum(fg, fg_lbl, index=np.arange(1, n_fg + 1))
        keep_fg = np.where(fg_sizes >= 200)[0] + 1
        valid_fg = np.isin(fg_lbl, keep_fg)
        valid_fg_dilated = ndimage.binary_dilation(valid_fg, iterations=2)
        out[:, :, 3] = np.where(valid_fg_dilated, out[:, :, 3], 0)

    # Crop tightly around non-transparent pixels with 16px padding
    ys, xs = np.where(out[:, :, 3] > 10)
    pad = 16
    y0 = max(0, int(ys.min()) - pad)
    y1 = min(h, int(ys.max()) + 1 + pad)
    x0 = max(0, int(xs.min()) - pad)
    x1 = min(w, int(xs.max()) + 1 + pad)

    cropped = Image.fromarray(out[y0:y1, x0:x1], mode="RGBA")
    cw, ch = cropped.size

    for out_dir in OUT_DIRS:
        out_dir.mkdir(parents=True, exist_ok=True)
        png_path = out_dir / "hero-squad.png"
        webp_path = out_dir / "hero-squad.webp"
        cropped.save(png_path, format="PNG", optimize=True)
        cropped.save(webp_path, format="WEBP", quality=92, method=6)
        print(f"Saved {png_path} ({cw}x{ch}) and {webp_path}")


if __name__ == "__main__":
    process_hero_squad()

