import glob
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "tools", "build", "raw")

for folder in ("pages", "thumbs", "wide"):
    os.makedirs(os.path.join(ROOT, folder), exist_ok=True)

for path in sorted(glob.glob(os.path.join(RAW, "*.png"))):
    name = os.path.basename(path)[:-4]
    image = Image.open(path).convert("RGB")
    if name.endswith("-thumb"):
        image.save(os.path.join(ROOT, "thumbs", name[:3] + ".webp"), "WEBP", quality=70, method=6)
    elif name.endswith("-wide"):
        image.save(os.path.join(ROOT, "wide", name[:3] + ".webp"), "WEBP", quality=90, method=6)
    else:
        image.save(os.path.join(ROOT, "pages", name + ".webp"), "WEBP", quality=90, method=6)
print("ok")
