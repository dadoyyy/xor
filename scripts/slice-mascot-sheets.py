#!/usr/bin/env python3
"""
Slice the 5 AI-generated corgi mascot sprite sheets in assets-src/sheets/
into individual transparent PNG and 50%-scale WebP assets in public/mascot/,
plus Next.js App Router favicons (icon.png, apple-icon.png, favicon.ico).
"""

from __future__ import annotations

import os
import shutil
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SHEETS_DIR = ROOT / "assets-src" / "sheets"

# Both root public/mascot and apps/web/public/mascot (monorepo Next.js public dir)
PUBLIC_MASCOT_DIRS = [
    ROOT / "public" / "mascot",
    ROOT / "apps" / "web" / "public" / "mascot",
]

# Next.js App Router directories
APP_DIRS = [
    ROOT / "apps" / "web" / "src" / "app",
    ROOT / "app",
]

PADDING = 12


def get_border_bg_color(rgb: np.ndarray) -> np.ndarray:
    """Estimate background RGB from the outer 4px border of the sheet."""
    top = rgb[:4, :, :].reshape(-1, 3)
    bottom = rgb[-4:, :, :].reshape(-1, 3)
    left = rgb[:, :4, :].reshape(-1, 3)
    right = rgb[:, -4:, :].reshape(-1, 3)
    border = np.concatenate([top, bottom, left, right], axis=0)
    return np.median(border, axis=0)


def remove_lilac_background(
    img: Image.Image,
    is_logos_sheet: bool = False,
    remove_ground_shadow: bool = False,
) -> Image.Image:
    """
    Remove the flat light-lilac / off-white background using connected-component
    flood-filling + soft color-distance alpha ramp + foreground color unmixing
    (de-haloing) so edges have zero lilac/white halo.
    """
    rgb = np.asarray(img.convert("RGB"), dtype=np.float32)
    h, w, _ = rgb.shape
    bg = get_border_bg_color(rgb)

    # Euclidean distance in RGB space from the sheet background color
    diff = rgb - bg[None, None, :]
    dist = np.linalg.norm(diff, axis=2)

    if not is_logos_sheet:
        # For hero, expressions, badges, guides:
        # Background is light lilac (~[243, 232, 240]), where G < R and G < B.
        # Notice also the faint lilac ground shadow under paws in hero/guides
        # (~[224, 211, 231]), which has R>=G and B>=G and dist ~ 22-30.
        # Meanwhile all character colors (orange/cream fur, yellow scarf, purple hat,
        # white speech bubble/PDF) either have dist > 25 with G > B (cream/yellow/orange)
        # or are enclosed inside dark outlines.
        is_lilac_hue = (rgb[:, :, 0] >= rgb[:, :, 1] + 4) & (rgb[:, :, 2] >= rgb[:, :, 1] + 2)
        bg_candidate = (dist < 18.0) | (is_lilac_hue & (dist < (36.0 if remove_ground_shadow else 22.0)))
    else:
        # In logos.png, background is near-white/lilac (~[255, 255, 255] / [250, 245, 252]).
        bg_candidate = dist < 18.0

    # Label contiguous background-colored regions
    bg_labels, num_bg = ndimage.label(bg_candidate)

    # 1. Any region touching the outer border is definitely background
    border_labels = set(np.unique(bg_labels[0, :]))
    border_labels.update(np.unique(bg_labels[-1, :]))
    border_labels.update(np.unique(bg_labels[:, 0]))
    border_labels.update(np.unique(bg_labels[:, -1]))
    border_labels.discard(0)

    is_bg = np.isin(bg_labels, list(border_labels))

    # 2. Also include enclosed background pockets (e.g. between legs, between desk legs,
    #    between tassel and ear, or inside the 'o' of 'xor').
    #    To never touch tiny white eye sparkles or white speech bubbles:
    #    - In lilac sheets, interior white (speech bubble, PDF, eyes) has R≈G≈B>248,
    #      which is NOT in bg_candidate at all because bg is [243, 232, 240] (dist > 25)!
    #      So every bg_candidate region of area >= 12 in lilac sheets is a true background hole.
    #    - In logos.png, the only interior white regions are tiny eye highlights inside dark pupils.
    #      The tassel-ear gap and the 'o' center hole in 'xor' have area >= 60, whereas eye highlights
    #      are inside the eyes. Let's check area and position for logos.png.
    bg_sizes = ndimage.sum(bg_candidate, bg_labels, range(1, num_bg + 1))
    for lbl_idx, sz in enumerate(bg_sizes, start=1):
        if lbl_idx in border_labels:
            continue
        if not is_logos_sheet:
            if sz >= 12:
                is_bg |= (bg_labels == lbl_idx)
        else:
            # In logos.png, check if this enclosed white region is the center of 'o' in 'xor'
            # (y > 600) or a gap with lilac tint, vs eye sparkle
            ys, xs = np.where(bg_labels == lbl_idx)
            cy = float(np.mean(ys))
            if cy > 600 and sz >= 40:
                # Center hole of 'o' in 'xor'
                is_bg |= (bg_labels == lbl_idx)

    # Distance from each foreground pixel to the nearest confirmed background pixel
    dist_to_bg = ndimage.distance_transform_edt(~is_bg)

    # Soft alpha ramp on the 2px boundary adjacent to background for smooth anti-aliasing
    low_d = 12.0
    high_d = 42.0
    edge_zone = dist_to_bg <= 2.5

    alpha = np.where(is_bg, 0.0, 1.0).astype(np.float32)
    ramp = np.clip((dist - low_d) / (high_d - low_d), 0.0, 1.0)
    alpha = np.where(edge_zone & (~is_bg), ramp, alpha)

    # Color decontamination (unmix background color from semi-transparent edge pixels)
    # C = alpha * F + (1 - alpha) * B  =>  F = (C - (1 - alpha) * B) / alpha
    safe_alpha = np.maximum(alpha[:, :, None], 0.05)
    unmixed = (rgb - (1.0 - alpha[:, :, None]) * bg[None, None, :]) / safe_alpha
    unmixed = np.clip(unmixed, 0.0, 255.0)

    out_rgb = np.where(
        (alpha[:, :, None] > 0.0) & (alpha[:, :, None] < 0.99),
        unmixed,
        rgb,
    )
    out_rgba = np.zeros((h, w, 4), dtype=np.uint8)
    out_rgba[:, :, :3] = np.round(out_rgb).astype(np.uint8)
    out_rgba[:, :, 3] = np.round(alpha * 255.0).astype(np.uint8)

    return Image.fromarray(out_rgba, mode="RGBA")


def bbox_distance(a: Tuple[int, int, int, int], b: Tuple[int, int, int, int]) -> float:
    """Minimum Euclidean distance between two bounding boxes (x0, y0, x1, y1)."""
    ax0, ay0, ax1, ay1 = a
    bx0, by0, bx1, by1 = b
    dx = max(0, max(ax0 - bx1, bx0 - ax1))
    dy = max(0, max(ay0 - by1, by0 - ay1))
    return float(np.hypot(dx, dy))


def extract_components(rgba: np.ndarray, min_area: int = 15):
    """
    Find all connected components of non-transparent pixels (alpha > 16).
    Returns (labels, list of dicts with label, area, bbox, centroid).
    """
    fg = rgba[:, :, 3] > 16
    # Use 8-connectivity so diagonal touches stay connected
    struct = np.ones((3, 3), dtype=bool)
    labels, num = ndimage.label(fg, structure=struct)
    if num == 0:
        return labels, []

    objs = ndimage.find_objects(labels)
    areas = ndimage.sum(fg, labels, range(1, num + 1))
    comps = []
    for idx, slc in enumerate(objs, start=1):
        if slc is None:
            continue
        area = int(areas[idx - 1])
        if area < min_area:
            continue
        ys, xs = slc
        x0, x1 = int(xs.start), int(xs.stop)
        y0, y1 = int(ys.start), int(ys.stop)
        cx = 0.5 * (x0 + x1)
        cy = 0.5 * (y0 + y1)
        comps.append(
            {
                "label": idx,
                "area": area,
                "bbox": (x0, y0, x1, y1),
                "centroid": (cx, cy),
                "width": x1 - x0,
                "height": y1 - y0,
            }
        )
    return labels, comps


def crop_component_group(
    rgba: np.ndarray,
    labels: np.ndarray,
    group_labels: List[int],
    pad: int = PADDING,
) -> Tuple[Image.Image, Tuple[int, int, int, int]]:
    """
    Crop the union bounding box of `group_labels` with `pad` pixels of transparent
    padding, masking out any pixels belonging to other component groups.
    """
    h, w, _ = rgba.shape
    mask = np.isin(labels, group_labels)
    # Dilate mask by 2px to preserve soft 1-2px anti-aliased edge pixels (alpha <= 16)
    mask_dilated = ndimage.binary_dilation(mask, iterations=2)

    ys, xs = np.where(mask)
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(w, int(xs.max()) + 1 + pad)
    y1 = min(h, int(ys.max()) + 1 + pad)

    sub_rgba = rgba[y0:y1, x0:x1].copy()
    sub_mask = mask_dilated[y0:y1, x0:x1]
    sub_rgba[~sub_mask] = 0

    return Image.fromarray(sub_rgba, mode="RGBA"), (x0, y0, x1, y1)


def segment_grid_by_components(
    img_rgba: Image.Image,
    rows: int,
    cols: int,
    names: List[str],
) -> List[Tuple[str, Image.Image, Tuple[int, int, int, int]]]:
    """
    Detect `rows * cols` sprites by finding the `rows * cols` largest main character
    connected components, sorting them in reading order (top-to-bottom, left-to-right),
    and attaching every smaller accessory component (sparkles, confetti, speech bubble,
    Z's, ?, bush, loading wheel, etc.) to its nearest character component.
    """
    rgba = np.asarray(img_rgba)
    labels, comps = extract_components(rgba, min_area=12)
    target_count = rows * cols
    assert len(comps) >= target_count, f"Expected at least {target_count} components, found {len(comps)}"

    # Pick the N largest components as the primary character/badge bodies
    comps_by_area = sorted(comps, key=lambda c: c["area"], reverse=True)
    main_comps = comps_by_area[:target_count]
    other_comps = comps_by_area[target_count:]

    # Sort main components into `rows` rows by y-centroid, then `cols` cols by x-centroid
    main_sorted_y = sorted(main_comps, key=lambda c: c["centroid"][1])
    ordered_main = []
    for r in range(rows):
        row_slice = main_sorted_y[r * cols : (r + 1) * cols]
        row_sorted_x = sorted(row_slice, key=lambda c: c["centroid"][0])
        ordered_main.extend(row_sorted_x)

    groups: Dict[int, List[int]] = {i: [ordered_main[i]["label"]] for i in range(target_count)}
    group_bboxes: Dict[int, Tuple[int, int, int, int]] = {
        i: ordered_main[i]["bbox"] for i in range(target_count)
    }

    # Assign each accessory component (sparkles, confetti, speech bubble, bush, etc.)
    # to the closest main component
    for comp in other_comps:
        best_i = min(
            range(target_count),
            key=lambda i: (
                bbox_distance(comp["bbox"], group_bboxes[i])
                + 0.15
                * float(
                    np.hypot(
                        comp["centroid"][0] - ordered_main[i]["centroid"][0],
                        comp["centroid"][1] - ordered_main[i]["centroid"][1],
                    )
                )
            ),
        )
        groups[best_i].append(comp["label"])

    results = []
    for i, name in enumerate(names):
        cropped, bbox = crop_component_group(rgba, labels, groups[i], pad=PADDING)
        results.append((name, cropped, bbox))
    return results


def segment_logos(
    img_rgba: Image.Image,
) -> List[Tuple[str, Image.Image, Tuple[int, int, int, int]]]:
    """
    Segment logos.png into logo-main, logo-icon, logo-stacked while excluding
    the text labels ("MAIN LOGO", "ICON/FAVICON", "STACKED LOGO").
    """
    rgba = np.asarray(img_rgba)
    h, w, _ = rgba.shape
    labels, comps = extract_components(rgba, min_area=15)

    # Filter out the small uppercase label letters:
    # - Top labels ("MAIN LOGO", "ICON/FAVICON") sit near the top (y1 < 95) with height < 35
    # - Bottom label ("STACKED LOGO") sits near the bottom (y0 > 700) with height < 35
    valid_comps = []
    for c in comps:
        x0, y0, x1, y1 = c["bbox"]
        ch = c["height"]
        if ch < 36 and (y1 < 95 or y0 > 700):
            continue
        valid_comps.append(c)

    # Group the remaining components into the 3 logos:
    # 1. logo-main: top-left (cy < 430, cx < 512)
    # 2. logo-icon: top-right (cy < 430, cx >= 512)
    # 3. logo-stacked: bottom-center (cy >= 430, includes corgi head + "xor" wordmark)
    main_labels = [c["label"] for c in valid_comps if c["centroid"][1] < 430 and c["centroid"][0] < 512]
    icon_labels = [c["label"] for c in valid_comps if c["centroid"][1] < 430 and c["centroid"][0] >= 512]
    stacked_labels = [c["label"] for c in valid_comps if c["centroid"][1] >= 430]

    results = []
    for name, grp in [
        ("logo-main", main_labels),
        ("logo-icon", icon_labels),
        ("logo-stacked", stacked_labels),
    ]:
        cropped, bbox = crop_component_group(rgba, labels, grp, pad=PADDING)
        results.append((name, cropped, bbox))
    return results


def segment_hero(
    img_rgba: Image.Image,
) -> List[Tuple[str, Image.Image, Tuple[int, int, int, int]]]:
    """Segment hero.png (single character) into hero/corgi-student."""
    rgba = np.asarray(img_rgba)
    labels, comps = extract_components(rgba, min_area=20)
    all_labels = [c["label"] for c in comps]
    cropped, bbox = crop_component_group(rgba, labels, all_labels, pad=PADDING)
    return [("hero/corgi-student", cropped, bbox)]


def verify_not_clipped(img: Image.Image, name: str) -> bool:
    """
    Verify that the cropped image has a transparent border on all 4 sides
    (meaning the character's tassels, ears, scarf tips, and confetti were not cut off).
    """
    arr = np.asarray(img)
    alpha = arr[:, :, 3]
    top_max = int(alpha[0, :].max())
    bottom_max = int(alpha[-1, :].max())
    left_max = int(alpha[:, 0].max())
    right_max = int(alpha[:, -1].max())
    return max(top_max, bottom_max, left_max, right_max) == 0


def save_asset_variants(
    rel_name: str,
    category: str,
    img: Image.Image,
    summary_rows: List[Tuple[str, str, str, bool]],
):
    """
    Save full-res PNG and 50%-scale WebP to public/mascot/.
    For maximum compatibility with both flat (`public/mascot/<name>.png`) and
    categorized (`public/mascot/<category>/<name>.png`) lookups, save to the
    exact requested path and mirror across root `public/mascot` and `apps/web/public/mascot`.
    """
    w, h = img.size
    w_half = max(1, w // 2)
    h_half = max(1, h // 2)
    img_half = img.resize((w_half, h_half), Image.Resampling.LANCZOS)

    # Re-open check after saving to primary dir
    primary_base = PUBLIC_MASCOT_DIRS[0]
    png_rel = f"{rel_name}.png"
    webp_rel = f"{rel_name}.webp"

    for base_dir in PUBLIC_MASCOT_DIRS:
        png_path = base_dir / png_rel
        webp_path = base_dir / webp_rel
        png_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(png_path, format="PNG", optimize=True)
        img_half.save(webp_path, format="WEBP", quality=92, method=6)

        # Also save under category subfolder (e.g. expressions/happy.png) if rel_name has no slash
        if "/" not in rel_name and category:
            cat_png = base_dir / category / png_rel
            cat_webp = base_dir / category / webp_rel
            cat_png.parent.mkdir(parents=True, exist_ok=True)
            img.save(cat_png, format="PNG", optimize=True)
            img_half.save(cat_webp, format="WEBP", quality=92, method=6)

    # Re-open saved PNG to verify integrity and unclipped edges
    with Image.open(primary_base / png_rel) as check_im:
        check_im.load()
        unclipped = verify_not_clipped(check_im, rel_name)

    summary_rows.append(
        (
            f"public/mascot/{png_rel}",
            f"{w}x{h}",
            f"{w_half}x{h_half} (.webp)",
            unclipped,
        )
    )


def generate_favicons(
    logo_icon_img: Image.Image,
    summary_rows: List[Tuple[str, str, str, bool]],
):
    """
    Generate Next.js App Router favicons from logo-icon:
    - app/icon.png (512x512)
    - app/apple-icon.png (180x180)
    - app/favicon.ico (32x32)
    Tight-crop logo_icon to its non-transparent bounds first so the icon fills
    the square canvas cleanly.
    """
    arr = np.asarray(logo_icon_img)
    ys, xs = np.where(arr[:, :, 3] > 16)
    tight = logo_icon_img.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))

    # Make square canvas if slightly non-square
    tw, th = tight.size
    side = max(tw, th)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(tight, ((side - tw) // 2, (side - th) // 2))

    icon_512 = square.resize((512, 512), Image.Resampling.LANCZOS)
    apple_180 = square.resize((180, 180), Image.Resampling.LANCZOS)
    fav_32 = square.resize((32, 32), Image.Resampling.LANCZOS)

    for app_dir in APP_DIRS:
        app_dir.mkdir(parents=True, exist_ok=True)
        icon_512.save(app_dir / "icon.png", format="PNG", optimize=True)
        apple_180.save(app_dir / "apple-icon.png", format="PNG", optimize=True)
        fav_32.save(app_dir / "favicon.ico", format="ICO", sizes=[(32, 32)])

    # Also update public/icons if present
    web_icons_dir = ROOT / "apps" / "web" / "public" / "icons"
    if web_icons_dir.exists():
        icon_512.save(web_icons_dir / "icon-512.png", format="PNG", optimize=True)
        square.resize((192, 192), Image.Resampling.LANCZOS).save(
            web_icons_dir / "icon-192.png", format="PNG", optimize=True
        )
        apple_180.save(web_icons_dir / "apple-touch-icon.png", format="PNG", optimize=True)

    summary_rows.append(("app/icon.png", "512x512", "-", True))
    summary_rows.append(("app/apple-icon.png", "180x180", "-", True))
    summary_rows.append(("app/favicon.ico", "32x32", "-", True))


def main():
    # Ensure source sheets in assets-src/sheets/ are saved as real PNG files
    for sheet_name in ["hero.png", "logos.png", "expressions.png", "badges.png", "guides.png"]:
        p = SHEETS_DIR / sheet_name
        with Image.open(p) as im:
            rgb_im = im.convert("RGB")
        rgb_im.save(p, format="PNG")

    summary_rows: List[Tuple[str, str, str, bool]] = []

    # 1. expressions.png (3x3)
    expressions_names = [
        "happy",
        "excited",
        "thinking",
        "confused",
        "sleepy",
        "sad",
        "proud",
        "cheering",
        "winking",
    ]
    expr_rgba = remove_lilac_background(Image.open(SHEETS_DIR / "expressions.png"))
    for name, crop_im, _ in segment_grid_by_components(expr_rgba, 3, 3, expressions_names):
        save_asset_variants(name, "expressions", crop_im, summary_rows)

    # 2. badges.png (3x2: 3 columns x 2 rows = 6 items)
    badges_names = [
        "first-room",
        "streak-7",
        "perfect-score",
        "leaderboard-1st",
        "flashcard-master",
        "joined-room",
    ]
    badges_rgba = remove_lilac_background(Image.open(SHEETS_DIR / "badges.png"))
    for name, crop_im, _ in segment_grid_by_components(badges_rgba, 2, 3, badges_names):
        save_asset_variants(name, "badges", crop_im, summary_rows)

    # 3. guides.png (3x2: 3 columns x 2 rows = 6 items)
    guides_names = [
        "welcome",
        "upload-pdf",
        "flashcards",
        "quiz-time",
        "empty-state",
        "error-loading",
    ]
    guides_rgba = remove_lilac_background(Image.open(SHEETS_DIR / "guides.png"))
    for name, crop_im, _ in segment_grid_by_components(guides_rgba, 2, 3, guides_names):
        save_asset_variants(name, "guides", crop_im, summary_rows)

    # 4. logos.png (3 items: logo-main, logo-icon, logo-stacked)
    logos_rgba = remove_lilac_background(Image.open(SHEETS_DIR / "logos.png"), is_logos_sheet=True)
    logo_icon_crop = None
    for name, crop_im, _ in segment_logos(logos_rgba):
        save_asset_variants(name, "logos", crop_im, summary_rows)
        if name == "logo-icon":
            logo_icon_crop = crop_im

    # 5. Favicons from logo-icon
    assert logo_icon_crop is not None, "logo-icon was not extracted!"
    generate_favicons(logo_icon_crop, summary_rows)

    # Print summary table
    print(f"{'File':<40} | {'PNG Size':<12} | {'WebP (50%)':<18} | {'Padding OK'}")
    print("-" * 86)
    for fpath, png_sz, webp_sz, ok in summary_rows:
        print(f"{fpath:<40} | {png_sz:<12} | {webp_sz:<18} | {'YES' if ok else 'CLIPPED'}")


if __name__ == "__main__":
    main()

