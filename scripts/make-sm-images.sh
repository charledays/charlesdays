#!/usr/bin/env bash
# Builds standard-quality copies of the images shown in grids and galleries:
# every Wall image, every tattoo/film story image, every project image,
# everything in images/tattoo/ and images/manifiesto/, and the About photos.
# Each gets a WebP under /images/sm/ (same path, .webp), long side capped at
# 1600px. Grids load these; the pop-out viewers load the HD original.
#
# Also writes src/data/image-sizes.json ({ "/images/...": [w, h] }, the
# EXIF-rotated size of each original) so pages can reserve every photo's
# real shape before it loads.
#
# Re-run after adding or changing one of those images.
set -euo pipefail
# Paths are site paths (/images/...), served from public/.
cd "$(dirname "$0")/../public"
node --input-type=module -e "
import { stories } from './stories.js';
const out = (src) => src && console.log(src);
for (const s of stories) {
  if (s.wall && s.wall.include) out((s.wall.image && s.wall.image.src) || (s.cover && s.cover.src));
  const d = s.discipline || [];
  if (d.includes('tattoo') || d.includes('film') || d.includes('art-direction')) {
    for (const im of [s.cover, ...(s.supportingImages || [])]) out(im && im.src);
  }
}" | { cat; find images/tattoo images/manifiesto -type f | sed 's|^|/|'; echo /images/stories/interlock/detail-01.jpg; } \
  | sort -u | python3 -I -c '
import sys, os, json
from PIL import Image, ImageOps
MAX = 1600
sizes = {}
for src in sys.stdin.read().split():
    inp = "." + src
    if not os.path.exists(inp):
        print("missing", src, file=sys.stderr)
        continue
    im = ImageOps.exif_transpose(Image.open(inp))
    sizes[src] = list(im.size)
    out = "./images/sm" + os.path.splitext(src[len("/images"):])[0] + ".webp"
    if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(inp):
        continue
    os.makedirs(os.path.dirname(out), exist_ok=True)
    im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
    im.thumbnail((MAX, MAX), Image.LANCZOS)
    im.save(out, "WEBP", quality=80, method=6)
    print("%5d KB -> %4d KB  %s" % (os.path.getsize(inp) // 1024, os.path.getsize(out) // 1024, out))
os.makedirs("../src/data", exist_ok=True)
with open("../src/data/image-sizes.json", "w") as f:
    json.dump(dict(sorted(sizes.items())), f, indent=1)
print(len(sizes), "sizes -> src/data/image-sizes.json")
'
