/**
 * Station data. Each entry feeds the station template (exterior/station.js) and the overlay.
 * Add a stop by adding an object; nothing else needs to change.
 *
 * getOff.href: null keeps the GET OFF button as a placeholder until the gallery exists.
 */
export var LINE = { bullet: 'C', color: '#f26a1b', name: 'Charle$Days Line' };

/**
 * Artwork on the ad cards in the cove. Card k shows adArt[k % length]; on a desktop frame
 * cards 6–12 are in view, so entries 6–10 and 0–1 are the hardest pieces, in that order.
 */
export var adArt = [
  '/images/wall/david-oliva-pe.png',
  '/images/manifiesto/fox-artwork-detail.jpg',
  '/images/stories/ufology/cover.jpg',
  '/images/stories/album-blue-broken-heads/cover.jpg',
  '/images/tattoo/lettering-arm.jpg',
  '/images/stories/mr-enz-x-charles-days/detail-04.jpg',
  '/images/tattoo/freddy.jpg',
  '/images/stories/vidabandida-buenas-malas-decisiones/detail-03.png',
  '/images/stories/reflections/cover.png',
  '/images/wall/tattoo-black-red.jpg',
  '/images/wall/avirex.png'
];

/** Stops on the line map between the doors and the seats; each one links to a page. */
export var mapStops = [
  { name: 'Art Direction', note: 'Campaigns · Brands', href: '/art-direction/' },
  { name: 'Film', note: 'Moving image', href: '/film/' },
  { name: 'Tattoo', note: 'Lima studio', href: '/tattoo/' },
  { name: 'Manifiesto', note: 'Exhibition', href: '/manifiesto/' },
  { name: 'About', note: 'Charle$Days', href: '/about/' }
];

export var stations = [
  {
    id: 'manifiesto',
    name: 'Manifiesto',
    subtitle: '1 Av – Gallery Level',
    billboard: {
      src: '/images/manifiesto/canvas-wide.jpg',
      alt: 'Placeholder artwork: Manifiesto canvas'
    },
    getOff: { label: 'GET OFF', href: null }
  }
];
