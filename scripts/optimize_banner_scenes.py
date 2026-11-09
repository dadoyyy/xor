import base64
import io
import json
from pathlib import Path
from PIL import Image

BRAIN_DIR = Path("C:/Users/Mark Anton Camoro/.gemini/antigravity/brain/418ee67f-d099-4d47-9181-c951c63120db")
SRC_DIR = Path("assets-src/banner")
OUT_DIRS = [
    Path("apps/web/public/mascot/banner"),
    Path("public/mascot/banner"),
]

for d in [SRC_DIR] + OUT_DIRS:
    d.mkdir(parents=True, exist_ok=True)

scenes = [
    ("scene-morning", BRAIN_DIR / "scene_morning_1794154072947.jpg"),
    ("scene-afternoon", BRAIN_DIR / "scene_afternoon_1794154103509.jpg"),
    ("scene-night", BRAIN_DIR / "scene_night_1794154127847.jpg"),
]

placeholders = {}

print(f"{'Scene':<18} | {'Dimensions':<12} | {'WebP Size':<10} | {'Status'}")
print("-" * 55)

for name, src_path in scenes:
    im = Image.open(src_path).convert("RGB")
    
    # Save original jpg to assets-src/banner
    orig_dest = SRC_DIR / f"{name}.jpg"
    im.save(orig_dest, "JPEG", quality=95)
    
    # Save optimized WebP to target directories
    for out_dir in OUT_DIRS:
        webp_dest = out_dir / f"{name}.webp"
        im.save(webp_dest, "WEBP", quality=82, method=6)
    
    webp_size_kb = round((OUT_DIRS[0] / f"{name}.webp").stat().st_size / 1024)
    print(f"{name:<18} | {im.width}x{im.height:<7} | {webp_size_kb} KB     | OK")
    
    # Generate tiny blur placeholder (32x18)
    tiny = im.resize((32, 18), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    tiny.save(buf, format="WEBP", quality=40)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    placeholders[name] = f"data:image/webp;base64,{b64}"

# Save placeholders.json
for out_dir in OUT_DIRS:
    json_path = out_dir / "placeholders.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(placeholders, f, indent=2)

print("\nSaved placeholders.json to target directories successfully!")

