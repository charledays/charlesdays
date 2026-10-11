/**
 * Station content, resolved from stories.js (the site's one content model). A station's
 * `takeover` names stories by id; this turns those ids into the artwork the platform is dressed
 * with and the entries its gallery shows. Ids that don't resolve, or stories without a cover,
 * are skipped, never filled in.
 */
import { stories } from '/stories.js';

var byId = {};
stories.forEach(function (s) { byId[s.id] = s; });

function metaLine(s) {
  var role = Array.isArray(s.role) && s.role.length ? s.role.join(', ') : '';
  var year = s.year ? String(s.year) : '';
  return role && year ? role + ' · ' + year : role || year;
}

function entry(s) {
  if (!s || !s.cover || !s.cover.src) return null;
  var link = (s.externalLinks || []).filter(function (l) { return l && l.url; })[0] || null;
  // Every image of the work, cover first: the gallery steps through them in order.
  var images = [{ src: s.cover.src, alt: s.cover.alt || s.title || '', caption: '' }].concat(
    (s.supportingImages || []).filter(function (im) { return im && im.src; }).map(function (im) {
      return { src: im.src, alt: im.alt || s.title || '', caption: im.caption || '' };
    })
  );
  return {
    id: s.id,
    title: s.title || '',
    meta: metaLine(s),
    context: s.context || '',
    src: s.cover.src,
    alt: s.cover.alt || s.title || '',
    images: images,
    // Only real standalone stories link inward; discipline-level entries point back at their section.
    href: s.destinationType === 'project' ? s.destinationUrl : null,
    external: link ? { label: link.label || 'Watch', url: link.url } : null
  };
}

function resolve(ids) {
  return (ids || []).map(function (id) { return entry(byId[id]); }).filter(Boolean);
}

/**
 * { hero, ads, adTitles, groups, works, treatment } for a station, or null when the station has
 * no takeover yet. ads: image paths for the platform (adTitles alongside); groups: [{ label,
 * items }] (hero left out); works: the gallery's running order, hero first, each work once.
 */
export function stationContent(station) {
  var t = station.takeover;
  if (!t) return null;
  var hero = entry(byId[t.hero]);
  var groups = (t.groups || []).map(function (g) {
    var items = g.series
      ? stories.filter(function (s) { return s.series === g.series; }).map(entry).filter(Boolean)
      : resolve(g.ids);
    return { label: g.label, items: items.filter(function (it) { return !hero || it.id !== hero.id; }) };
  }).filter(function (g) { return g.items.length; });
  var adEntries = resolve(t.ads);
  var works = (hero ? [hero] : []);
  groups.forEach(function (g) {
    g.items.forEach(function (it) {
      if (!works.some(function (w) { return w.id === it.id; })) works.push(Object.assign({ group: g.label }, it));
    });
  });
  return {
    accent: t.accent,
    treatment: t.treatment || 'campaign',
    subtitle: t.subtitle || '',
    hero: hero,
    ads: adEntries.map(function (e) { return e.src; }),
    adTitles: adEntries.map(function (e) { return e.title; }),
    groups: groups,
    works: works
  };
}
