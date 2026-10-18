/**
 * Subway scene constants. Units are meters; proportions follow an R160-class NYC car.
 *
 * Axes: +x runs along the train (direction of travel), +y up, +z from the door wall toward
 * the camera. The door wall's interior face sits at z = 0; the carriage floor at y = 0.
 */

export var CAR = {
  /** Door opening (50" leaves pair) and its center along the wall. */
  doorWidth: 1.27,
  doorHeight: 1.93,
  doorCenterX: -0.95,
  /** How far each leaf slides into its pocket when fully open. */
  doorTravel: 0.62,
  /** Window in each door leaf (local to the leaf's center). */
  doorWindow: { width: 0.36, height: 0.62, bottom: 1.06, radius: 0.07 },
  /** Side window right of the doors. */
  window: { x0: 0.62, x1: 2.32, y0: 0.98, y1: 1.74, radius: 0.08 },
  /** Wall extents we actually build (only what the camera can see). */
  wallX0: -5.2,
  wallX1: 5.4,
  wallTop: 1.94,
  ceilingY: 2.3,
  aisleDepth: 2.9,
  seat: { x0: 0.5, count: 10, width: 0.47, height: 0.44, depth: 0.46 }
};

/** Exterior. The track bed sits below the carriage floor; platforms are flush with it. */
export var WORLD = {
  railY: -1.12,
  tunnelColumnZ: -1.15,
  tunnelColumnStep: 1.55,
  tunnelWallZ: -4.6,
  tunnelLightStep: 12.4,
  /** Exterior layers repeat over this span (a multiple of every period above). */
  tunnelSpan: 62,
  railJoint: 18.3,
  station: {
    halfLength: 46,
    platformDepth: 6.2,
    wallZ: -6.6,
    ceilingY: 3.9,
    columnZ: -2.7,
    columnStep: 4.6,
    billboard: { width: 3.5, height: 2.2, bottom: 0.95 }
  }
};

/**
 * One leg = travel from the previous stop into a station, dwell, and close up.
 * Each value is the share of the leg at which that phase ends.
 */
export var LEG = {
  accel: 0.12,
  cruise: 0.4,
  brake: 0.58,
  settle: 0.61,
  open: 0.69,
  dwell: 0.86,
  close: 0.93,
  hold: 1
};

/** Meters per unit of progress at full speed: about 200 m of track from stop to stop. */
export var CRUISE_SPEED = 450;
/** Standing at a stop with the doors open, in legs (where opening the doors on load ends up). */
export var START = (LEG.open + LEG.dwell) / 2;
/** Where the ride actually starts: at the first stop with the doors still shut; the first scroll or swipe opens them (main.js openDoors). */
export var START_CLOSED = (LEG.brake + LEG.settle) / 2;

/**
 * Station to station from the line map, in seconds on the wall clock. The ride closes the doors
 * (departure chime), pulls out past the platform, runs the tunnel, brakes along the next
 * platform, then chimes and opens. `travel` covers pulling away to standing still; a ride that
 * skips stops gets `perExtraStop` more, up to `maxTravel`. `reduced` replaces the travel with a
 * dip to black under prefers-reduced-motion.
 */
export var TRAVEL = {
  close: 0.35,
  travel: 1.2,
  perExtraStop: 0.35,
  maxTravel: 2.8,
  chime: 0.1,
  open: 0.4,
  reduced: { close: 0.3, travel: 0.8, chime: 0.1, open: 0.3 }
};

/** Stepping out: the walk from the seat through the doors onto the platform (and back), seconds. */
export var DOOR_WALK = 1.6;

/** The Charle$Days tag (white on transparent), cropped to its lettering. Used on the doors and the line map. */
export var WORDMARK = { src: '/images/brand/charlesdays-wordmark.png', crop: [86, 258, 2138, 1181], size: [2262, 1696] };

export var PALETTE = {
  steel: 0xb9bcbf,
  steelDark: 0x7d8084,
  panel: 0xc9c2b4,
  seatOrange: 0xf06a1c,
  seatAmber: 0xf59a1e,
  seatFrame: 0xcbbf98,
  floor: 0x1b1c1f,
  rubber: 0x141414,
  fluorescent: 0xeef4ff,
  tunnelBulb: 0xffd9a0,
  stationLight: 0xe9f1ff
};
