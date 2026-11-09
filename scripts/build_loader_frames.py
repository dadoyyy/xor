#!/usr/bin/env python3
"""
Builds the <CorgiLoader /> frame assets in public/mascot/ and apps/web/public/mascot/
with identical 512x512 canvas alignment so opacity toggling has zero layout shift:
- default:    happy-open, happy-blink
- reading:    reading-1 (glass left), reading-2 (glass middle), reading-3 (glass right)
- flashcards: flashcards-1 (1 card), flashcards-2 (2 cards flipping), flashcards-3 (3 cards)
- grading:    grading-1 (pencil up), grading-2 (pencil on paper), grading-3 (check mark appearing)
- waiting:    waiting-1 (ears up), waiting-2 (head tilt / ears slightly down)
"""

from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "public" / "mascot"
OUT_DIRS = [
    ROOT / "public" / "mascot",
    ROOT / "apps" / "web" / "public" / "mascot",
]
CANVAS = 512

INK = (43, 37, 69, 255)
GRAPE = (124, 58, 237, 255)
GRAPE_TINT = (239, 231, 255, 255)
SUN = (255, 204, 51, 255)
SUN_DEEP = (224, 168, 0, 255)
PAPER = (255, 255, 255, 255)
MINT = (22, 163, 74, 255)
CREAM_FUR = (251, 232, 198, 255)


def load_normalized(name: str, target_h: int = 420) -> Image.Image:
    im = Image.open(SRC_DIR / name).convert("RGBA")
    arr = np.array(im)
    ys, xs = np.where(arr[:, :, 3] > 15)
    cropped = im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    cw, ch = cropped.size
    scale = target_h / float(ch)
    nw = max(1, int(round(cw * scale)))
    nh = max(1, int(round(ch * scale)))
    resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    px = (CANVAS - nw) // 2
    py = CANVAS - 36 - nh
    canvas.alpha_composite(resized, (px, py))
    return canvas


def make_happy_frames() -> dict[str, Image.Image]:
    open_im = load_normalized("happy.png", target_h=420)
    blink_im = open_im.copy()
    arr = np.array(blink_im)

    # Detect the two dark eye regions inside the middle face band and replace with happy closed arcs
    # Face band y: 205..285, x: 145..365
    face_patch = arr[205:280, 150:362].copy()
    r, g, b, a = (
        face_patch[:, :, 0].astype(int),
        face_patch[:, :, 1].astype(int),
        face_patch[:, :, 2].astype(int),
        face_patch[:, :, 3].astype(int),
    )
    # Sample surrounding warm orange/cream fur around eyes
    draw = ImageDraw.Draw(blink_im)
    # Left eye center ~(204, 240), Right eye center ~(308, 240)
    for cx in (204, 308):
        cy = 240
        draw.ellipse((cx - 24, cy - 22, cx + 24, cy + 22), fill=(244, 162, 78, 255))
        draw.arc((cx - 20, cy - 10, cx + 20, cy + 16), start=200, end=340, fill=INK, width=6)

    return {
        "happy-open": open_im,
        "happy-blink": blink_im,
    }


def draw_magnifying_glass(base: Image.Image, gx: int, gy: int) -> Image.Image:
    im = base.copy()
    overlay = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    r = 38
    # Handle
    d.line((gx + int(r * 0.65), gy + int(r * 0.65), gx + r + 24, gy + r + 24), fill=INK, width=14)
    d.line((gx + int(r * 0.65), gy + int(r * 0.65), gx + r + 22, gy + r + 22), fill=SUN, width=8)
    # Lens
    d.ellipse((gx - r, gy - r, gx + r, gy + r), fill=(239, 231, 255, 195), outline=GRAPE, width=8)
    d.ellipse((gx - r - 3, gy - r - 3, gx + r + 3, gy + r + 3), outline=INK, width=4)
    # Lens shine
    d.arc((gx - r + 10, gy - r + 10, gx + r - 10, gy + r - 10), start=200, end=260, fill=PAPER, width=4)
    im.alpha_composite(overlay)
    return im


def make_reading_frames() -> dict[str, Image.Image]:
    base = load_normalized("upload-pdf.png", target_h=420)
    return {
        "reading-1": draw_magnifying_glass(base, 195, 345),
        "reading-2": draw_magnifying_glass(base, 256, 338),
        "reading-3": draw_magnifying_glass(base, 315, 345),
    }


def draw_flashcard_badge(base: Image.Image, count: int) -> Image.Image:
    im = base.copy()
    overlay = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    positions = [
        (335, 300, -8),
        (352, 282, 4),
        (368, 264, 14),
    ][:count]
    for idx, (cx, cy, _ang) in enumerate(positions):
        w, h = 68, 48
        fill = SUN if idx == count - 1 else PAPER
        d.rounded_rectangle(
            (cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2),
            radius=10,
            fill=fill,
            outline=INK,
            width=4,
        )
        d.line((cx - 18, cy - 6, cx + 18, cy - 6), fill=GRAPE, width=4)
        d.line((cx - 18, cy + 6, cx + 10, cy + 6), fill=INK, width=3)
    im.alpha_composite(overlay)
    return im


def make_flashcard_frames() -> dict[str, Image.Image]:
    base = load_normalized("flashcards.png", target_h=420)
    return {
        "flashcards-1": draw_flashcard_badge(base, 1),
        "flashcards-2": draw_flashcard_badge(base, 2),
        "flashcards-3": draw_flashcard_badge(base, 3),
    }


def make_grading_frames() -> dict[str, Image.Image]:
    base = load_normalized("quiz-time.png", target_h=420)
    frames: dict[str, Image.Image] = {}

    for step in (1, 2, 3):
        im = base.copy()
        overlay = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
        d = ImageDraw.Draw(overlay)
        # Pencil position: step 1 = raised, step 2 = touching paper, step 3 = checkmark badge
        py_offset = -18 if step == 1 else 0
        px, py = 350, 290 + py_offset
        d.line((px, py, px + 44, py - 44), fill=INK, width=14)
        d.line((px, py, px + 44, py - 44), fill=SUN, width=8)
        d.polygon([(px - 8, py + 8), (px + 4, py - 4), (px - 4, py - 4)], fill=INK)

        if step == 3:
            bx, by, br = 376, 200, 32
            d.ellipse((bx - br, by - br, bx + br, by + br), fill=MINT, outline=INK, width=4)
            d.line((bx - 14, by + 2, bx - 3, by + 13), fill=PAPER, width=6)
            d.line((bx - 3, by + 13, bx + 16, by - 10), fill=PAPER, width=6)

        im.alpha_composite(overlay)
        frames[f"grading-{step}"] = im

    return frames


def make_waiting_frames() -> dict[str, Image.Image]:
    f1 = load_normalized("welcome.png", target_h=420)
    # Frame 2: subtle 3.5-degree head-tilt around bottom-center pivot so baseline stays planted
    f2 = f1.rotate(-3.5, resample=Image.Resampling.BICUBIC, center=(CANVAS // 2, CANVAS - 60))
    return {
        "waiting-1": f1,
        "waiting-2": f2,
    }


def save_all() -> None:
    all_frames: dict[str, Image.Image] = {}
    all_frames.update(make_happy_frames())
    all_frames.update(make_reading_frames())
    all_frames.update(make_flashcard_frames())
    all_frames.update(make_grading_frames())
    all_frames.update(make_waiting_frames())

    for out_dir in OUT_DIRS:
        out_dir.mkdir(parents=True, exist_ok=True)
        for name, img in all_frames.items():
            png_path = out_dir / f"{name}.png"
            webp_path = out_dir / f"{name}.webp"
            img.save(png_path, format="PNG", optimize=True)
            img.save(webp_path, format="WEBP", quality=90, method=6)
    print(f"Generated {len(all_frames)} loader frames (.png + .webp) in {len(OUT_DIRS)} directories.")


if __name__ == "__main__":
    save_all()

