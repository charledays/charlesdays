/**
 * Station content, resolved from stories.js (the site's one content model). A station's
 * `takeover` names stories by id; this turns those ids into the artwork the platform is dressed
 * with. Ids that don't resolve, or stories without a cover, are skipped, never filled in.
 */
import { stories } from '/stories.js';

var byId = {};
stories.forEach(function (s) { byId[s.id] = s; });

/** A story's cover and title, or null when it has no cover. */
function entry(s) {
  if (!s || !s.cover || !s.cover.src) return null;
  return { src: s.cover.src, title: s.title || '' };
}

/**
 * { ads, adTitles, treatment, wall, pattern, deal, poem } for a station, or null when the station has
 * no takeover yet. ads: image paths for the platform, strongest first (the stories named in `ads`, then any
 * photos named directly in `images`); adTitles alongside.
 */
export function stationContent(station) {
  var t = station.takeover;
  if (!t) return null;
  var adEntries = (t.ads || []).map(function (id) { return entry(byId[id]); }).filter(Boolean)
    .concat((t.images || []).map(function (src) { return { src: src, title: '' }; }));
  return {
    treatment: t.treatment || 'campaign',
    wall: t.wall || 'panels',
    pattern: !!t.pattern,
    deal: t.deal || null,
    poem: t.poem || null,
    ads: adEntries.map(function (e) { return e.src; }),
    adTitles: adEntries.map(function (e) { return e.title; })
  };
}
