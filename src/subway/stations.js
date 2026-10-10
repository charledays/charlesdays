/**
 * Station data. Each entry feeds the station template (exterior/station.js) and the overlay.
 * Add a stop by adding an object; nothing else needs to change.
 *
 * getOff.href: null keeps the GET OFF button as a placeholder until the gallery exists.
 */
export var LINE = { bullet: 'C', color: '#f26a1b', name: 'Charle$Dahs Line' };

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
