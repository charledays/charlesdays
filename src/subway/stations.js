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
 * href) and the visit sign on the platform wall (name, href). billboard.focusY picks which part
 * of a tall image fills the board (0 = top, 0.5 = centre).
 *
 * A station with a `takeover` is dressed as that body of work (wall ads, lightboxes, wrapped
 * columns, paste-ups). Everything comes from stories.js by id, so no artwork is ever invented here:
 *   treatment how the platform panels are finished: 'campaign' (crisp, branded) or 'cinema'
 *            (graded down, letterboxed); see exterior/takeover.js
 *   wall     'panels' (default: varied ads with tile seams) or 'wallpaper' (continuous sheets,
 *            floor to ceiling, tiles showing through)
 *   ads      story ids for the wall ads, lightboxes and column wraps, strongest first
 *   images   photos by path, after the stories, for work that has no story of its own yet
 *            (the section pages' own photos)
 */
export var stations = [
  {
    id: 'art-direction',
    name: 'Art Direction',
    note: 'Campaigns · Brands',
    href: '/art-direction/',
    billboard: { src: '/images/stories/internazionale/cover.jpg', alt: 'Internazionale album artwork' },
    takeover: {
      // Floor-to-ceiling wallpaper, one continuous run, the tiles reading through it.
      wall: 'wallpaper',
      // The /art-direction/ running order.
      ads: ['art', 'vida-bandida-tracks', 'highend-night-car-meet', 'new-yorker-85', 'vidabandida-buenas-malas-decisiones',
        'vidabandida-chlorotype-series', 'ufology', 'mr-enz-x-charles-days', 'reflections', 'interlock', '3rd-gen-building-systems']
    }
  },
  {
    id: 'film',
    name: 'Film',
    note: 'Moving image',
    href: '/film/',
    billboard: { src: '/images/wall/vidabandida-drop-caballo-ganador.jpg', alt: 'VIDABANDIDA drop: Caballo Ganador' },
    takeover: {
      treatment: 'cinema',
      wall: 'wallpaper',
      ads: ['avirex', 'vidabandida-drop-rococo-kitsune-i', 'ekors-fr', 'vidabandida-x-ekors-mob', 'comuna-13-co', 'nekroz-fr',
        'vozchler-charles-ft-dj-sheiler', 'kef-pe', 'chinatown', 'morena-pe', 'raiz-specialty-coffee', 'caribes-del-pacifico']
    }
  },
  {
    id: 'tattoo',
    name: 'Tattoo',
    note: 'Lima studio',
    href: '/tattoo/',
    billboard: { src: '/images/tattoo/head-lettering-02.jpg', alt: 'Ornamental blackwork head tattoo' },
    takeover: {
      wall: 'wallpaper',
      // The /tattoo/ page's photos.
      images: ['/images/tattoo/head-lettering-02.jpg', '/images/tattoo/wolf.jpg', '/images/tattoo/lettering-arm.jpg',
        '/images/tattoo/chameleon.jpg', '/images/wall/tattoo-neck-sky.jpg', '/images/tattoo/chest-ornamental-black.jpg',
        '/images/tattoo/freddy.jpg', '/images/tattoo/lettering-floral.jpg', '/images/wall/tattoo-eagle.png',
        '/images/tattoo/raccoon.jpg', '/images/tattoo/head-lettering.jpg', '/images/tattoo/tiki.jpg']
    }
  },
  {
    id: 'manifiesto',
    name: 'Manifiesto',
    note: 'Exhibition',
    href: '/manifiesto/',
    billboard: { src: '/images/manifiesto/canvas-wide.jpg', alt: 'Manifiesto canvas' },
    takeover: {
      wall: 'wallpaper',
      // The exhibition: the work, the rooms, the making.
      images: ['/images/manifiesto/canvas-wide.jpg', '/images/manifiesto/gallery-wall.jpg', '/images/manifiesto/fox-artwork-detail.jpg',
        '/images/manifiesto/opening-room.jpg', '/images/manifiesto/bust-detail.jpg', '/images/manifiesto/cover.jpg',
        '/images/manifiesto/canvas-lettering-detail.jpg', '/images/manifiesto/floor-installation.jpg',
        '/images/manifiesto/workshop-table.jpg', '/images/manifiesto/process-cutting.jpg']
    }
  },
  {
    id: 'about',
    name: 'About',
    note: 'Charle$Days',
    href: '/about/',
    billboard: { src: '/images/manifiesto/closing-charles-mother.jpg', alt: 'Charles Days at the close of Manifiesto', focusY: 0.22 },
    takeover: {
      wall: 'wallpaper',
      // Charles himself, at work and at the show.
      images: ['/images/stories/interlock/detail-01.jpg', '/images/manifiesto/closing-charles-mother.jpg',
        '/images/stories/mr-enz-x-charles-days/detail-02.jpg', '/images/manifiesto/process-mirror.jpg',
        '/images/stories/interlock/detail-02.jpg', '/images/manifiesto/workshop-presentation.jpg',
        '/images/stories/mr-enz-x-charles-days/detail-01.jpg']
    }
  }
];

/** The line map's stops are the stations themselves, so the map and the ride always agree. */
export var mapStops = stations;

/**
 * Secret stops. They aren't on the line map or the circle: a click on their trigger in the car
 * (main.js) rides the train to the next station, dressed as the secret stop, until it pulls away.
 * A secret stop's takeover can also take:
 *   pattern  true: its one image repeated on every wallpaper sheet, no tag over it
 *   deal     an offer printed on the sheet beside the first repeat, dead centre in the doorway
 *   poem     lines of text: every wallpaper sheet is black stock with the poem in white
 */
export var easterEgg = {
  id: 'easter-egg',
  name: 'Easter Egg',
  note: '20% off your next tattoo',
  href: '/tattoo/',
  secret: true,
  billboard: { src: '/images/wall/eye-tag.jpg', alt: 'The eye of Charles' },
  takeover: {
    // The eye of Charles, floor to ceiling, sheet after sheet; the offer pasted up beside it.
    wall: 'wallpaper',
    images: ['/images/wall/eye-tag.jpg'],
    pattern: true,
    deal: {
      kicker: 'Secret stop',
      title: ['You caught', 'the eye.'],
      offer: '20% OFF',
      terms: ['your next tattoo', 'with Charle$Days'],
      proof: ['Screenshot this wall.', 'Show it at your session.']
    }
  }
};

/** Behind the word "Criterio" on the motto sign over the window: the poem, sheet after sheet. */
export var aragua = {
  id: 'aragua',
  name: 'Aragua',
  note: 'De Aragua al mundo',
  href: '/about/',
  secret: true,
  takeover: {
    wall: 'wallpaper',
    poem: [
      'En la maleta no cabía Aragua.',
      'Igual me la traje.',
      'En el acento que no se me quita,',
      'en los recuerdos que no se borran,',
      'en las calles que todavía sueño,',
      'y en la gente que dejé atrás.',
      'Porque uno puede irse de su tierra,',
      'pero hay tierras que nunca se van de uno.'
    ]
  }
};
