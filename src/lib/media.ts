/* Shared content + image helpers for build-time (Astro frontmatter) code.

   stories.js stays in public/ because Home, Tattoo and the project pages
   also import it in the browser (/stories.js); it is plain ESM, so the
   build imports the very same file — one content model, not two. */
// @ts-ignore — plain JS module, no types
import { stories as allStories } from '../../public/stories.js';
import sizes from '../data/image-sizes.json';

export type Img = { src: string; alt: string };
export type Story = {
  id: string;
  title?: string | null;
  year?: number | string | null;
  discipline?: string[];
  series?: string | null;
  project?: string | null;
  role?: string[];
  destinationUrl?: string;
  cover?: Img;
  supportingImages?: (Img & { caption?: string })[];
  externalLinks?: { label?: string; url: string; platform?: string }[];
  context?: string | null;
  wall?: { include?: boolean; order?: number; image?: Img };
};

export const stories = allStories as Story[];
export const byId = Object.fromEntries(stories.map((s) => [s.id, s])) as Record<string, Story>;

/** /images/x/y.jpg -> /images/sm/x/y.webp (built by scripts/make-sm-images.sh). */
export function smSrc(src: string): string {
  if (!src.startsWith('/images/')) return src;
  return '/images/sm/' + src.slice('/images/'.length).replace(/\.[^./]+$/, '') + '.webp';
}

/** Real (EXIF-rotated) pixel size of an original, for reserving layout space. */
export function sizeOf(src: string): [number, number] {
  const s = (sizes as Record<string, [number, number]>)[src];
  return s ?? [4, 5];
}
