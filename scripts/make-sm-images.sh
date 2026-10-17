#!/usr/bin/env bash
# Builds standard-quality copies of the images shown in grids: every Wall
# image, every tattoo story image and everything in images/tattoo/ gets a
# WebP under /images/sm/ (same path, .webp), long side capped at 1600px.
# Grids load these; the pop-out viewers load the HD original.
# Re-run after adding or changing one of those images.
set -euo pipefail
cd "$(dirname "$0")/.."
node --input-type=module -e "
import { stories } from './stories.js';
for (const s of stories) {
  if (!s.wall || !s.wall.include) continue;
  const src = (s.wall.image && s.wall.image.src) || (s.cover && s.cover.src);
  if (src) console.log(src);
}
for (const s of stories) {
  if (!(s.discipline || []).includes('tattoo')) continue;
  for (const im of [s.cover, ...(s.supportingImages || [])]) if (im && im.src) console.log(im.src);
}" | { cat; find images/tattoo -type f | sed 's|^|/|'; } | sort -u | python3 -I -c '
import sys, os
from PIL import Image, ImageOps
MAX = 1600
for src in sys.stdin.read().split():
    inp = "." + src
    out = "./images/sm" + os.path.splitext(src[len("/images"):])[0] + ".webp"
    if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(inp):
        continue
    os.makedirs(os.path.dirname(out), exist_ok=True)
    im = ImageOps.exif_transpose(Image.open(inp))
    im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
    im.thumbnail((MAX, MAX), Image.LANCZOS)
    im.save(out, "WEBP", quality=80, method=6)
    print("%5d KB -> %4d KB  %s" % (os.path.getsize(inp) // 1024, os.path.getsize(out) // 1024, out))
'
