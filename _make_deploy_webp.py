import json
import os
import re
import shutil
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "_deploy")
DST = os.path.join(ROOT, "_deploy_webp")

if os.path.exists(DST):
    shutil.rmtree(DST)
os.makedirs(os.path.join(DST, "posters"), exist_ok=True)

with open(os.path.join(SRC, "films-data.js"), "r", encoding="utf-8") as f:
    data_raw = f.read()

refs = set(re.findall(r'"p":"(posters/[^"]+)"', data_raw))
print("refs:", len(refs))

copied, converted, errors = 0, 0, []
for rel in sorted(refs):
    if not rel.startswith("posters/"):
        continue
    src_path = os.path.join(SRC, rel)
    if not os.path.exists(src_path):
        errors.append(rel)
        continue
    ext = rel.rsplit(".", 1)[-1].lower()
    if ext == "jpg" or ext == "jpeg":
        out_rel = rel[: rel.rfind(".")] + ".webp"
        out_path = os.path.join(DST, "posters", os.path.basename(out_rel))
        with Image.open(src_path) as im:
            im = im.convert("RGB")
            w, h = im.size
            if max(w, h) > 640:
                scale = 640 / max(w, h)
                im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
            im.save(out_path, "WEBP", quality=78, method=5)
        converted += 1
    else:
        out_rel = rel
        shutil.copyfile(src_path, os.path.join(DST, rel))
        copied += 1

# rebuild films-data.js with rewritten poster paths
path_map = {}
for rel in sorted(refs):
    if rel.startswith("posters/") and rel.rsplit(".", 1)[-1].lower() in ("jpg", "jpeg"):
        path_map[rel] = rel[: rel.rfind(".")] + ".webp"

new_raw = data_raw
for old, new in path_map.items():
    new_raw = new_raw.replace('"p":"' + old + '"', '"p":"' + new + '"')

with open(os.path.join(DST, "films-data.js"), "w", encoding="utf-8") as f:
    f.write(new_raw)

shutil.copyfile(os.path.join(SRC, "index.html"), os.path.join(DST, "index.html"))

total = 0
count = 0
for dirpath, _, filenames in os.walk(DST):
    for fn in filenames:
        total += os.path.getsize(os.path.join(dirpath, fn))
        count += 1

print("copied:", copied, "converted:", converted, "missing:", errors[:3])
print("files:", count, "size MB:", round(total / 1024 / 1024, 1))
