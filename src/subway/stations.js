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
 *
 * A station with a `takeover` is dressed as that body of work (wall ads, lightboxes, wrapped
 * columns, paste-ups, themed signs) and GET OFF opens its gallery instead of leaving the page.
 * Everything comes from stories.js by id, so no artwork is ever invented here:
 *   accent   the takeover's colour (gallery details)
 *   treatment how the platform panels are finished: 'campaign' (crisp, branded) or 'cinema'
 *            (graded down, letterboxed); see exterior/takeover.js
 *   hero     story id behind the billboard (the hero piece in the doorway and the gallery)
 *   ads      story ids for the wall ads, lightboxes and column wraps, strongest first
 *   groups   gallery sections: { label, ids } or { label, series } (Film series in stories.js)
 *   subtitle the section's own line from its page, when it has one
 */
export var stations = [
  {
    id: 'art-direction',
    name: 'Art Direction',
    note: 'Campaigns · Brands',
    href: '/art-direction/',
    billboard: { src: '/images/stories/internazionale/cover.jpg', alt: 'Internazionale album artwork' },
    takeover: {
      accent: '#e8412c',
      hero: 'internazionale',
      // The /art-direction/ running order.
      ads: ['art', 'vida-bandida-tracks', 'highend-night-car-meet', 'new-yorker-85', 'vidabandida-buenas-malas-decisiones',
        'vidabandida-chlorotype-series', 'ufology', 'mr-enz-x-charles-days', 'reflections', 'interlock', '3rd-gen-building-systems'],
      groups: [{ label: 'Projects', ids: ['internazionale', 'art', 'vida-bandida-tracks', 'highend-night-car-meet', 'new-yorker-85',
        '3rd-gen-building-systems', 'vidabandida-buenas-malas-decisiones', 'vidabandida-chlorotype-series', 'ufology',
        'mr-enz-x-charles-days', 'reflections', 'interlock'] }]
    }
  },
  {
    id: 'film',
    name: 'Film',
    note: 'Moving image',
    href: '/film/',
    billboard: { src: '/images/wall/vidabandida-drop-caballo-ganador.jpg', alt: 'VIDABANDIDA drop: Caballo Ganador' },
    takeover: {
      accent: '#f2c318',
      treatment: 'cinema',
      hero: 'vidabandida-drop-caballo-ganador',
      subtitle: 'Frames, campaigns and moving images.',
      ads: ['avirex', 'vidabandida-drop-rococo-kitsune-i', 'ekors-fr', 'vidabandida-x-ekors-mob', 'comuna-13-co', 'nekroz-fr',
        'vozchler-charles-ft-dj-sheiler', 'kef-pe', 'chinatown', 'morena-pe', 'raiz-specialty-coffee', 'caribes-del-pacifico'],
      groups: [
        { label: 'Lost Frames', series: 'lost-frames' },
        { label: 'Vidabandida', series: 'vidabandida' },
        { label: 'Days Off', series: 'days-off' }
      ]
    }
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

/**
 * Secret stops. They aren't on the line map or the circle: a click on their trigger in the car
 * (main.js) rides the train to the next station, dressed as the secret stop, until it pulls away.
 * Plain station template for now. `reward` shows the Easter Egg card while the doors are open.
 */
export var easterEgg = {
  id: 'easter-egg',
  name: 'Easter Egg',
  note: 'You found it',
  href: '/tattoo/',
  secret: true,
  reward: true,
  billboard: { src: '/images/wall/eye-tag.jpg', alt: 'The eye of Charles' }
};

/** Behind the word "Criterio" on the motto sign over the window. Its own universe comes later. */
export var aragua = {
  id: 'aragua',
  name: 'Aragua',
  note: 'De Aragua al mundo',
  href: '/about/',
  secret: true
};
