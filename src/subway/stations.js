/**
 * Line data: the line itself, the ad artwork, and the stations. Add a stop by adding an object
 * to `stations`; the ride, the line map and GET OFF all follow.
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

/**
 * The circle line, in order; after the last stop the train comes back around to the first.
 * Each station feeds the station template (billboard, tablets, signs), the line map (name, note,
 * href) and GET OFF (href). billboard.focusY picks which part of a tall image fills the board
 * (0 = top, 0.5 = centre).
 */
export var stations = [
  {
    id: 'art-direction',
    name: 'Art Direction',
    note: 'Campaigns · Brands',
    href: '/art-direction/',
    billboard: { src: '/images/stories/internazionale/cover.jpg', alt: 'Internazionale album artwork' }
  },
  {
    id: 'film',
    name: 'Film',
    note: 'Moving image',
    href: '/film/',
    billboard: { src: '/images/wall/vidabandida-drop-caballo-ganador.jpg', alt: 'VIDABANDIDA drop: Caballo Ganador' }
  },
  {
    id: 'tattoo',
    name: 'Tattoo',
    note: 'Lima studio',
    href: '/tattoo/',
    billboard: { src: '/images/tattoo/head-lettering-02.jpg', alt: 'Ornamental blackwork head tattoo' }
  },
  {
    id: 'manifiesto',
    name: 'Manifiesto',
    note: 'Exhibition',
    href: '/manifiesto/',
    billboard: { src: '/images/manifiesto/canvas-wide.jpg', alt: 'Manifiesto canvas' }
  },
  {
    id: 'about',
    name: 'About',
    note: 'Charle$Days',
    href: '/about/',
    billboard: { src: '/images/manifiesto/closing-charles-mother.jpg', alt: 'Charles Days at the close of Manifiesto', focusY: 0.22 }
  }
];

/** The line map's stops are the stations themselves, so the map and the ride always agree. */
export var mapStops = stations;
