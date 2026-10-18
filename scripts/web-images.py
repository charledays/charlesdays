#!/usr/bin/env python3
"""
Web copies of the site's images for the subway (src/subway/web.js points at them).

Every .jpg/.jpeg/.png under images/ (except images/web itself) is written to
images/web/<same path>.webp: at most MAX px on the long side, transparency kept,
EXIF orientation applied. Originals are never touched. Re-run after adding images;
copies that are already newer than their original are skipped.

    python3 scripts/web-images.py
"""
import os
import sys
from PIL import Image, ImageOps

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'images')
OUT = os.path.join(ROOT, 'web')
MAX = 1600
QUALITY = 80


def convert(src, dst):
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        alpha = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)
        im = im.convert('RGBA' if alpha else 'RGB')
        im.thumbnail((MAX, MAX), Image.LANCZOS)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        im.save(dst, 'WEBP', quality=QUALITY, method=6)


def main():
    before = after = count = 0
    for dirpath, dirnames, filenames in os.walk(ROOT):
        if os.path.abspath(dirpath).startswith(os.path.abspath(OUT)):
            continue
        for name in filenames:
            if os.path.splitext(name)[1].lower() not in ('.jpg', '.jpeg', '.png'):
                continue
            src = os.path.join(dirpath, name)
            rel = os.path.relpath(src, ROOT)
            dst = os.path.join(OUT, os.path.splitext(rel)[0] + '.webp')
            if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
                convert(src, dst)
            before += os.path.getsize(src)
            after += os.path.getsize(dst)
            count += 1
    print('%d images: %.1f MB -> %.1f MB' % (count, before / 1e6, after / 1e6))


if __name__ == '__main__':
    sys.exit(main())
