/**
 * The subway loads every image through its web copy: images/web/<same path>.webp, at most
 * 1600 px on the long side (scripts/web-images.py makes them from the originals, which the
 * rest of the site keeps using). The scene paints art at a few hundred px per metre, so the
 * full-size originals were tens of megabytes it never showed.
 *
 * Anything that isn't a .jpg/.jpeg/.png under /images/ passes through unchanged.
 */
var IMAGE = /^\/images\/(?!web\/)(.+)\.(?:jpe?g|png)$/i;

export function web(src) {
  var m = typeof src === 'string' && src.match(IMAGE);
  return m ? '/images/web/' + m[1] + '.webp' : src;
}
