#!/usr/bin/env python3
"""
Slices assets-src/sheets/signup-standing.png into 5 transparent, baseline-aligned
square PNGs (1024x1024) + 50% WebP copies (512x512):
  - signup-main.png / .webp (largest center corgi)
  - signup-tl.png   / .webp (top-left)
  - signup-tr.png   / .webp (top-right)
  - signup-bl.png   / .webp (bottom-left)
  - signup-br.png   / .webp (bottom-right)
Also outputs assets-src/debug/signup-detected.png with bounding boxes & labels.
"""

from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SHEET_PATH = ROOT / "assets-src" / "sheets" / "signup-standing.png"
DEBUG_PATH = ROOT / "assets-src" / "debug" / "signup-detected.png"

OUT_DIRS = [
    ROOT / "public" / "mascot" / "signup",
    ROOT / "apps" / "web" / "public" / "mascot" / "signup",
]

CANVAS_SIZE = 1024
CROP_PAD = 16
BASELINE_Y = 968  # Feet rest on y=968 inside the 1024x1024 canvas (56px bottom margin)
MAIN_TARGET_HEIGHT = 880
SMALL_TARGET_HEIGHT = 760
OUTLINE_RGB = np.array([52.0, 33.0, 74.0], dtype=np.float32)


def remove_bg_and_ground_shadow(img: Image.Image) -> Image.Image:
    """
    Removes the flat light-lilac background, the soft lavender ground shadow
    ellipse beneath each corgi's paws, and enclosed background pockets surrounded
    by dark ink outlines, while preserving 100% of the corgi's warm cream belly,
    muzzle, mouth, and paws.
    """
    rgba = np.array(img.convert("RGBA"), dtype=np.float32)
    rgb = rgba[:, :, :3]
    h, w, _ = rgb.shape

    # Sample border pixels for median background color (~ [243, 231, 240])
    border_pixels = np.concatenate(
        [rgb[0, :], rgb[-1, :], rgb[:, 0], rgb[:, -1]], axis=0
    )
    bg_color = np.median(border_pixels, axis=0)

    diff = np.linalg.norm(rgb - bg_color[None, None, :], axis=2)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]

    # CRITICAL COLOR INVARIANT:
    # - Lilac background ([243, 231, 240]) and ground shadow ([222, 203, 224]) ALWAYS
    #   have Blue > Green (b - g >= 5) and Red > Green (r - g >= 5).
    # - The corgi's cream belly, muzzle, mouth, and paws ALWAYS have Green >= Blue
    #   (warm cream: b - g <= 0).
    # Therefore requiring (b - g >= 5) & (r - g >= 5) guarantees that NO warm cream
    # fur/belly/mouth/paw pixel is ever classified as background!
    is_lilac_or_shadow = (
        (r > 175)
        & (g > 150)
        & (b > 175)
        & ((b - g) >= 5)
        & ((r - g) >= 5)
        & (np.abs(r - b) <= 24)
        & (diff < 78.0)
    )

    # 1) Flood-fill from all 4 image borders through is_lilac_or_shadow
    seed = np.zeros((h, w), dtype=bool)
    seed[0, :] = is_lilac_or_shadow[0, :]
    seed[-1, :] = is_lilac_or_shadow[-1, :]
    seed[:, 0] = is_lilac_or_shadow[:, 0]
    seed[:, -1] = is_lilac_or_shadow[:, -1]

    struct8 = ndimage.generate_binary_structure(2, 2)
    bg_mask = ndimage.binary_propagation(
        seed, mask=is_lilac_or_shadow, structure=struct8
    )

    # 2) Check enclosed lilac pockets (e.g. between cap brim & ear, tassel & ear,
    #    or inside the bent-arm triangle). Any interior region of `is_lilac_or_shadow`
    #    has b - g >= 5 and r - g >= 5 (so it can NEVER match warm cream where b <= g),
    #    and is bordered by the dark ink outline.
    enclosed_candidates = is_lilac_or_shadow & (~bg_mask)
    lbl_holes, n_holes = ndimage.label(enclosed_candidates, structure=struct8)
    if n_holes > 0:
        for idx in range(1, n_holes + 1):
            hole = lbl_holes == idx
            if int(hole.sum()) < 2:
                continue
            dilated_hole = ndimage.binary_dilation(hole, iterations=2)
            ring = dilated_hole & ~hole & ~bg_mask
            if ring.any() and float(np.median(g[ring])) < 145.0:
                bg_mask |= hole

    # 3) Clean the 1-2px outer JPEG halo right against bg_mask (only where b > g + 3)
    dist_to_bg = ndimage.distance_transform_edt(~bg_mask)
    outer_halo = (
        (~bg_mask)
        & (dist_to_bg <= 2.0)
        & (g > 145)
        & ((b - g) >= 4)
        & ((r - g) >= 4)
        & (np.abs(r - b) <= 24)
    )
    bg_mask |= outer_halo

    # 4) Smooth anti-aliased edge on the 1.5px boundary of bg_mask
    dist_to_bg = ndimage.distance_transform_edt(~bg_mask)
    alpha = np.where(bg_mask, 0.0, 255.0)

    # Only ramp edge pixels that have the cool lilac tint (b > g), leaving warm
    # interior colors 100% opaque
    edge_zone = (~bg_mask) & (dist_to_bg <= 1.6) & ((b - g) >= 2)
    ramp = np.clip((diff - 28.0) / 85.0, 0.0, 1.0)
    alpha = np.where(edge_zone, 255.0 * ramp, alpha)

    # Decontaminate RGB on semi-transparent outline pixels so no pale lilac fringe remains
    semi = (alpha > 0) & (alpha < 245)
    rgb[semi] = np.minimum(rgb[semi], OUTLINE_RGB[None, :] * 1.2)

    # 5) Remove any tiny isolated exterior speckles (<= 140px)
    fg_mask = alpha > 25
    lbl, n_lbl = ndimage.label(fg_mask)
    if n_lbl > 0:
        counts = ndimage.sum(
            np.ones_like(fg_mask, dtype=np.int32), lbl, range(1, n_lbl + 1)
        )
        for i, c in enumerate(counts, start=1):
            if c <= 140:
                alpha[lbl == i] = 0.0

    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[:, :, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    out[:, :, 3] = np.clip(alpha, 0, 255).astype(np.uint8)
    return Image.fromarray(out, mode="RGBA")


def detect_and_sort_five_corgis(rgba_img: Image.Image):
    """
    Detects connected components on the non-background mask, merges small fragments
    into their nearest large component, and sorts the 5 corgis into:
      signup-main, signup-tl, signup-tr, signup-bl, signup-br
    """
    arr = np.array(rgba_img)
    alpha = arr[:, :, 3]
    fg = alpha > 25

    dilated = ndimage.binary_dilation(fg, iterations=2)
    labeled, num_features = ndimage.label(dilated)

    raw_comps = []
    for i in range(1, num_features + 1):
        ys, xs = np.where((labeled == i) & fg)
        if len(xs) < 20:
            continue
        x0, x1 = int(xs.min()), int(xs.max())
        y0, y1 = int(ys.min()), int(ys.max())
        area = len(xs)
        cx = float(xs.mean())
        cy = float(ys.mean())
        raw_comps.append(
            {
                "id": i,
                "bbox": (x0, y0, x1 + 1, y1 + 1),
                "area": area,
                "cx": cx,
                "cy": cy,
            }
        )

    raw_comps.sort(key=lambda c: c["area"], reverse=True)
    main_five = [dict(c, ids=[c["id"]]) for c in raw_comps[:5]]
    fragments = raw_comps[5:]

    for frag in fragments:
        best = min(
            main_five,
            key=lambda m: np.hypot(frag["cx"] - m["cx"], frag["cy"] - m["cy"]),
        )
        bx0, by0, bx1, by1 = best["bbox"]
        fx0, fy0, fx1, fy1 = frag["bbox"]
        best["bbox"] = (
            min(bx0, fx0),
            min(by0, fy0),
            max(bx1, fx1),
            max(by1, fy1),
        )
        best["area"] += frag["area"]
        best["ids"].append(frag["id"])

    main_five.sort(key=lambda c: c["area"], reverse=True)
    main_comp = main_five[0]
    main_comp["name"] = "signup-main"

    corners = main_five[1:]
    corners.sort(key=lambda c: c["cy"])
    top_two = sorted(corners[:2], key=lambda c: c["cx"])
    bot_two = sorted(corners[2:], key=lambda c: c["cx"])

    top_two[0]["name"] = "signup-tl"
    top_two[1]["name"] = "signup-tr"
    bot_two[0]["name"] = "signup-bl"
    bot_two[1]["name"] = "signup-br"

    ordered = [main_comp, top_two[0], top_two[1], bot_two[0], bot_two[1]]
    return ordered, labeled


def place_on_square_canvas(
    rgba_img: Image.Image,
    labeled: np.ndarray,
    comp: dict,
    target_height: int,
) -> Image.Image:
    """
    Extracts only the pixels belonging to `comp`, crops with ~16px padding,
    scales so the character height equals `target_height`, and places onto a
    1024x1024 RGBA canvas with feet aligned to BASELINE_Y and body centered at X=512.
    """
    arr = np.array(rgba_img).copy()
    mask = np.isin(labeled, comp["ids"])
    arr[~mask] = [0, 0, 0, 0]

    x0, y0, x1, y1 = comp["bbox"]

    comp_alpha = arr[y0:y1, x0:x1, 3]
    ys, xs = np.where(comp_alpha > 25)
    tx0, tx1 = x0 + int(xs.min()), x0 + int(xs.max()) + 1
    ty0, ty1 = y0 + int(ys.min()), y0 + int(ys.max()) + 1

    padded_crop = Image.new(
        "RGBA",
        ((tx1 - tx0) + 2 * CROP_PAD, (ty1 - ty0) + 2 * CROP_PAD),
        (0, 0, 0, 0),
    )
    tight_img = Image.fromarray(arr[ty0:ty1, tx0:tx1], mode="RGBA")
    padded_crop.paste(tight_img, (CROP_PAD, CROP_PAD))

    orig_char_h = ty1 - ty0
    scale = target_height / float(orig_char_h)

    new_w = int(round(padded_crop.width * scale))
    new_h = int(round(padded_crop.height * scale))
    scaled_crop = padded_crop.resize((new_w, new_h), Image.Resampling.LANCZOS)

    scaled_arr = np.array(scaled_crop)
    s_ys, s_xs = np.where(scaled_arr[:, :, 3] > 25)
    feet_y = int(s_ys.max())

    char_top = int(s_ys.min())
    body_band = s_ys >= (char_top + int(0.35 * (feet_y - char_top)))
    body_center_x = int(round(float(np.median(s_xs[body_band]))))

    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    paste_x = (CANVAS_SIZE // 2) - body_center_x
    paste_y = BASELINE_Y - feet_y

    canvas.paste(scaled_crop, (paste_x, paste_y), scaled_crop)
    return canvas


def save_debug_visualization(
    orig_img: Image.Image, comps: list[dict], out_path: Path
):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    dbg = orig_img.convert("RGB").copy()
    draw = ImageDraw.Draw(dbg)

    colors = {
        "signup-main": (124, 58, 237),
        "signup-tl": (22, 163, 74),
        "signup-tr": (37, 99, 235),
        "signup-bl": (229, 72, 77),
        "signup-br": (224, 168, 0),
    }

    for comp in comps:
        x0, y0, x1, y1 = comp["bbox"]
        name = comp["name"]
        col = colors.get(name, (124, 58, 237))
        draw.rectangle([x0, y0, x1, y1], outline=col, width=3)
        px0 = max(0, x0 - CROP_PAD)
        py0 = max(0, y0 - CROP_PAD)
        px1 = min(orig_img.width, x1 + CROP_PAD)
        py1 = min(orig_img.height, y1 + CROP_PAD)
        draw.rectangle([px0, py0, px1, py1], outline=col, width=1)
        draw.rectangle([x0, max(0, y0 - 22), x0 + 115, y0], fill=col)
        draw.text((x0 + 5, max(0, y0 - 18)), name, fill=(255, 255, 255))

    dbg.save(out_path, "PNG", optimize=True)


def main():
    if not SHEET_PATH.exists():
        raise FileNotFoundError(f"Missing sprite sheet: {SHEET_PATH}")

    orig = Image.open(SHEET_PATH)
    clean_rgba = remove_bg_and_ground_shadow(orig)
    comps, labeled = detect_and_sort_five_corgis(clean_rgba)

    save_debug_visualization(orig, comps, DEBUG_PATH)

    for d in OUT_DIRS:
        d.mkdir(parents=True, exist_ok=True)

    rows = []
    for comp in comps:
        name = comp["name"]
        target_h = (
            MAIN_TARGET_HEIGHT if name == "signup-main" else SMALL_TARGET_HEIGHT
        )
        canvas = place_on_square_canvas(clean_rgba, labeled, comp, target_h)

        webp_size = (CANVAS_SIZE // 2, CANVAS_SIZE // 2)
        webp_img = canvas.resize(webp_size, Image.Resampling.LANCZOS)

        for out_dir in OUT_DIRS:
            png_path = out_dir / f"{name}.png"
            webp_path = out_dir / f"{name}.webp"
            canvas.save(png_path, "PNG", optimize=True)
            webp_img.save(webp_path, "WEBP", quality=92, method=6)

        x0, y0, x1, y1 = comp["bbox"]
        rows.append(
            (
                f"public/mascot/signup/{name}.png",
                f"{x1 - x0}x{y1 - y0}",
                f"{canvas.width}x{canvas.height}",
                f"{webp_img.width}x{webp_img.height}",
                f"y={BASELINE_Y}",
            )
        )

    print(
        f"{'Output File':<36} | {'Raw Crop':<10} | {'PNG Canvas':<11} | {'WebP (50%)':<11} | {'Baseline'}"
    )
    print("-" * 88)
    for r in rows:
        print(f"{r[0]:<36} | {r[1]:<10} | {r[2]:<11} | {r[3]:<11} | {r[4]}")
    print(f"\nDebug bounding-box preview saved to: {DEBUG_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
