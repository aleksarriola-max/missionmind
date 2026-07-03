// Surface operations data — companion rover "PROBE-2" operating near the
// ARES-7 orbital ground track, Jezero Rim approach corridor.

export const ROVER_STATE = {
  id: 'PROBE-2',
  label: 'Surface Rover',
  status: 'traverse',
  battery: 71,
  solarInputW: 38,
  heading: 64,
  speedMps: 0.08,
  position: { x: 420, y: 360 },
  commWindow: 'Next DSN pass in 1h 12m',
  distanceTraveledM: 1840,
  distanceRemainingM: 612,
};

// Grid is 0-800 x, 0-500 y. Waypoints describe the planned route; the rover
// is currently between WP3 and WP4.
export const ROUTE_WAYPOINTS = [
  { id: 'WP1', x: 80,  y: 420, label: 'Landing Site', hazardScore: 0.05, status: 'visited',
    reasoning: 'Origin point. Flat regolith, pre-surveyed during descent imaging.' },
  { id: 'WP2', x: 220, y: 380, label: 'Ridge Approach', hazardScore: 0.18, status: 'visited',
    reasoning: 'Minor slope (8°). Route chosen to avoid loose talus field 30m north.' },
  { id: 'WP3', x: 340, y: 350, label: 'Crater Rim Skirt', hazardScore: 0.32, status: 'visited',
    reasoning: 'Skirts a 12m crater rim. Wheel slip risk elevated on rim-adjacent regolith; route stays 5m clear of the rim edge.' },
  { id: 'WP4', x: 480, y: 330, label: 'Boulder Field Gap', hazardScore: 0.61, status: 'current',
    reasoning: 'Highest-hazard waypoint on this leg: route threads a 4m gap between two boulder clusters. Onboard hazard avoidance confirmed clearance > 1.2x rover width at last imaging pass.' },
  { id: 'WP5', x: 600, y: 300, label: 'Jezero Rim Overlook', hazardScore: 0.22, status: 'planned',
    reasoning: 'Science target. Moderate slope (11°) on final approach. CRISM mapping scheduled on arrival.' },
  { id: 'WP6', x: 700, y: 260, label: 'Sample Cache Site', hazardScore: 0.15, status: 'planned',
    reasoning: 'Flat outcrop identified via orbital imaging as stable sample-cache candidate.' },
];

// Hazard zones rendered as shaded regions on the terrain map — independent
// of the route itself, these represent areas the path planner avoids.
export const HAZARD_ZONES = [
  { id: 'HZ1', x: 260, y: 430, radius: 50, severity: 'high',   label: 'Loose Talus Field' },
  { id: 'HZ2', x: 360, y: 300, radius: 40, severity: 'medium', label: 'Crater Rim Instability' },
  { id: 'HZ3', x: 510, y: 380, radius: 55, severity: 'high',   label: 'Boulder Cluster A' },
  { id: 'HZ4', x: 470, y: 270, radius: 45, severity: 'high',   label: 'Boulder Cluster B' },
  { id: 'HZ5', x: 640, y: 200, radius: 35, severity: 'low',    label: 'Soft Regolith Pocket' },
];
