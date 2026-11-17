import type { LocationId, Vec3 } from './types';
import { groundHeight } from './ground';

/**
 * WORLD LAYOUT (metres, Y up, three.js axes). North is -Z, east is +X.
 *
 * Street: two-lane road along X, centre line z = 0, x from -130 to +130.
 *   Traffic drives on the RIGHT: the eastbound lane (+X) is z in [0, 3.5],
 *   the westbound lane (-X) is z in [-3.5, 0]. A pedestrian on either sidewalk
 *   who faces the road always meets cars coming from their LEFT first.
 * North sidewalk z in [-7.5, -3.5]; the school fence runs along z = -7.5 (x -56..56),
 *   except the pick-up lay-by (x -50..-16) where the fence steps back to z = -10.5.
 * South sidewalk z in [3.5, 7.5]. Houses and the park are south of it.
 * Signal intersection: a north-south road (7 m wide) crossing at x = -72. Mosque at its NW corner.
 * A small side road runs south from the main street at x = -14 (z 3.5..44) between the park
 *   (west of it) and the houses (east of it); the flood dip is a low section of it at z ~ 20.
 *
 * School compound (inside the fence): x -56..56, z -80..-7.5.
 *   Main gate opening at x -4..4 on the fence; the raised zebra crossing is right in front of it.
 *   Yard x -22..22, z -36..-9.   Football field x 26..52, z -44..-10.
 *   Building x -36..24, z -74..-38, two floors (ground y 0..4, first y 4..8), facade faces the yard.
 *   Parking (outside the fence, east): x 58..78, z -32..-8, entered from the street.
 *
 * Building interior: a corridor runs east-west at z -58..-52 on both floors.
 *   Rooms south of it face the yard, rooms north of it face the back.
 *   Inside rooms are rendered one at a time (only the active room), so window views are painted.
 *
 * Every location has an ORIGIN (world point at floor level, usually the room or area centre)
 * and default ROBOT and CAMERA spots given as offsets from the origin (local = world axes,
 * there is no rotation). Cutscenes position everything with ctx.at(dx, dz) relative to origin.
 */

export type LocationKind = 'inside' | 'grounds' | 'outside';

export interface CameraSpot {
  /** Offset from origin. */
  pos: Vec3;
  /** Offset from origin. */
  look: Vec3;
  fov?: number;
}

export interface LocationDef {
  id: LocationId;
  /** Arabic name for the map and scenario panel. */
  name: string;
  kind: LocationKind;
  /** 0 ground, 1 first floor, null for outdoor. */
  floor: 0 | 1 | null;
  origin: Vec3;
  /** Interior size (inside rooms) or area size (outdoor): [width along X, depth along Z]. */
  size: [number, number];
  /** Room height for inside rooms. */
  height?: number;
  /** Robot stand point, offset from origin [dx, dz]. */
  robot: [number, number];
  /** Robot facing, radians around Y. 0 faces +Z (south / toward the default camera). */
  robotFacing: number;
  camera: CameraSpot;
  /** Free-look orbit limits around the robot. */
  orbit?: { minDist: number; maxDist: number };
  /** Map pin position, in [0..1] of the map drawing for its floor / outdoor sheet. Filled by the map. */
  mapPin?: [number, number];
}

const L = (d: LocationDef) => d;

export const LOCATIONS: Record<LocationId, LocationDef> = {
  // ---------- Ground floor ----------
  classroom: L({
    id: 'classroom', name: 'الفصل', kind: 'inside', floor: 0,
    origin: [14, 0, -45], size: [12, 10], height: 3.6,
    robot: [0, -2.6], robotFacing: 0,
    camera: { pos: [0, 1.7, 4.2], look: [0, 1.2, -2.6], fov: 50 },
    orbit: { minDist: 2.5, maxDist: 7 },
  }),
  lobby: L({
    id: 'lobby', name: 'البهو', kind: 'inside', floor: 0,
    origin: [-3, 0, -45], size: [12, 12], height: 4,
    robot: [0, -1], robotFacing: 0,
    camera: { pos: [0, 1.8, 5], look: [0, 1.4, -1.5], fov: 55 },
  }),
  canteen: L({
    id: 'canteen', name: 'المقصف', kind: 'inside', floor: 0,
    origin: [-19, 0, -45], size: [14, 12], height: 3.6,
    robot: [0, 3.2], robotFacing: -0.5,
    camera: { pos: [-3.2, 1.7, 5.6], look: [2.5, 1.1, 0.2], fov: 55 },
  }),
  clinic: L({
    id: 'clinic', name: 'العيادة', kind: 'inside', floor: 0,
    origin: [-31, 0, -45], size: [8, 8], height: 3.4,
    robot: [0.1, -1.2], robotFacing: -0.12,
    camera: { pos: [0.6, 1.5, 3.0], look: [-0.15, 1.1, -1.4], fov: 55 },
    orbit: { minDist: 2, maxDist: 5 },
  }),
  corridor_ground: L({
    id: 'corridor_ground', name: 'الممر', kind: 'inside', floor: 0,
    origin: [-6, 0, -55], size: [60, 5], height: 3.6,
    robot: [11.2, 0.35], robotFacing: -Math.PI / 2,
    camera: { pos: [6.2, 1.5, 1.2], look: [12.6, 1.15, -0.4], fov: 55 },
  }),
  sports_hall: L({
    id: 'sports_hall', name: 'الصالة الرياضية', kind: 'inside', floor: 0,
    origin: [-24, 0, -66], size: [22, 14], height: 8,
    robot: [0, 0], robotFacing: 0,
    camera: { pos: [0, 2.4, 6], look: [0, 1.2, 0], fov: 55 },
  }),
  principal: L({
    id: 'principal', name: 'مكتب المدير', kind: 'inside', floor: 0,
    origin: [-8, 0, -65], size: [8, 8], height: 3.4,
    robot: [0, 1], robotFacing: 0,
    camera: { pos: [1.2, 1.65, 3.85], look: [0, 1.2, 0.3], fov: 55 },
  }),
  prayer_room: L({
    id: 'prayer_room', name: 'المصلى', kind: 'inside', floor: 0,
    origin: [2, 0, -65], size: [10, 10], height: 3.6,
    robot: [0, 1.4], robotFacing: 0,
    camera: { pos: [0.3, 1.65, 4.7], look: [0, 1.25, 0.2], fov: 55 },
  }),
  stairs: L({
    id: 'stairs', name: 'الدرج', kind: 'inside', floor: 0,
    origin: [14, 0, -65], size: [8, 10], height: 8,
    robot: [-0.55, 2.3], robotFacing: 0,
    camera: { pos: [2.6, 2.3, 4.6], look: [-1.3, 1.1, -0.4], fov: 55 },
  }),
  // ---------- First floor (floor level y = 4) ----------
  corridor_first: L({
    id: 'corridor_first', name: 'ممر الدور الأول', kind: 'inside', floor: 1,
    origin: [-6, 4, -55], size: [60, 5], height: 3.6,
    robot: [11.2, 0.35], robotFacing: -Math.PI / 2,
    camera: { pos: [6.2, 1.5, 1.2], look: [12.6, 1.15, -0.4], fov: 55 },
  }),
  computer_lab: L({
    id: 'computer_lab', name: 'معمل الحاسب', kind: 'inside', floor: 1,
    origin: [-28, 4, -45], size: [14, 10], height: 3.4,
    robot: [0, 1.5], robotFacing: 0,
    camera: { pos: [0.5, 1.6, 4.4], look: [0, 1.1, 0.5], fov: 55 },
  }),
  biology_lab: L({
    id: 'biology_lab', name: 'معمل الأحياء', kind: 'inside', floor: 1,
    origin: [-12, 4, -45], size: [14, 10], height: 3.4,
    robot: [0, 1.5], robotFacing: 0,
    camera: { pos: [0.5, 1.6, 4.4], look: [0, 1.1, 0.5], fov: 55 },
  }),
  art_room: L({
    id: 'art_room', name: 'غرفة الفنون', kind: 'inside', floor: 1,
    origin: [4, 4, -45], size: [12, 10], height: 3.4,
    robot: [0, 1.2], robotFacing: 0,
    camera: { pos: [0.5, 1.6, 4.2], look: [0, 1.1, 0.5], fov: 55 },
  }),
  library: L({
    id: 'library', name: 'المكتبة', kind: 'inside', floor: 1,
    origin: [-2, 4, -66], size: [14, 12], height: 3.4,
    robot: [0, 2], robotFacing: 0,
    camera: { pos: [0.5, 1.6, 5], look: [0, 1.1, 1], fov: 55 },
  }),
  // ---------- School grounds (outdoor, inside the fence) ----------
  yard: L({
    id: 'yard', name: 'الساحة', kind: 'grounds', floor: null,
    origin: [0, 0, -22], size: [44, 27],
    robot: [0, 4], robotFacing: 0,
    camera: { pos: [0, 2.2, 11], look: [0, 1.2, 3], fov: 50 },
    orbit: { minDist: 3, maxDist: 14 },
  }),
  football_field: L({
    id: 'football_field', name: 'ملعب كرة القدم', kind: 'grounds', floor: null,
    origin: [39, 0, -27], size: [26, 34],
    robot: [-6, 6], robotFacing: 0.4,
    camera: { pos: [-8.5, 1.6, 10.5], look: [-5, 1.1, 4], fov: 50 },
  }),
  gate: L({
    id: 'gate', name: 'البوابة', kind: 'grounds', floor: null,
    origin: [0, 0, -10], size: [16, 6],
    robot: [-2.5, -1], robotFacing: 0,
    camera: { pos: [-1, 1.7, -7], look: [-2, 1.2, 0], fov: 50 },
  }),
  // ---------- Outside the school ----------
  street_front: L({
    id: 'street_front', name: 'الشارع', kind: 'outside', floor: null,
    origin: [14, 0, -5.5], size: [60, 15],
    robot: [0, 0], robotFacing: Math.PI,
    camera: { pos: [-4, 1.2, 6], look: [2, 1.1, -0.5], fov: 55 },
  }),
  crosswalk_main: L({
    id: 'crosswalk_main', name: 'ممر المشاة', kind: 'outside', floor: null,
    origin: [0, 0, -5.5], size: [12, 15],
    robot: [-1.2, 0.4], robotFacing: 0,
    camera: { pos: [3.5, 1.2, 4.5], look: [-1, 1.1, 0], fov: 55 },
    orbit: { minDist: 3, maxDist: 12 },
  }),
  signal_crossing: L({
    id: 'signal_crossing', name: 'إشارة المشاة', kind: 'outside', floor: null,
    origin: [-62, 0, -5.5], size: [24, 18],
    robot: [0, 0.6], robotFacing: 0,
    camera: { pos: [4, 1.2, 4.5], look: [0, 1.1, 0], fov: 55 },
  }),
  bus_stop: L({
    id: 'bus_stop', name: 'موقف الحافلة', kind: 'outside', floor: null,
    origin: [30, 0, -5.5], size: [16, 8],
    // on the sidewalk by the waiting line, the camera east of him on the sidewalk (never in the bus lane,
    // where the school bus parks at x 25..35, z -3.2..-0.6)
    robot: [-3, -0.4], robotFacing: Math.PI / 2,
    camera: { pos: [0.8, 1.4, 0.6], look: [-3, 1.0, -0.4], fov: 52 },
  }),
  pickup_lane: L({
    id: 'pickup_lane', name: 'منطقة الانتظار', kind: 'outside', floor: null,
    origin: [-32, 0, -8.5], size: [34, 6],
    robot: [0, -0.8], robotFacing: 0,
    camera: { pos: [3.5, 1.5, 3.0], look: [0, 1.0, -0.8], fov: 55 },
  }),
  parking: L({
    id: 'parking', name: 'المواقف', kind: 'outside', floor: null,
    origin: [68, 0, -20], size: [20, 24],
    robot: [-6, 8], robotFacing: 0,
    camera: { pos: [-2, 1.4, 14], look: [-4, 1.1, 6], fov: 55 },
  }),
  sidewalk_far: L({
    id: 'sidewalk_far', name: 'الرصيف المقابل', kind: 'outside', floor: null,
    origin: [0, 0, 5.5], size: [30, 4],
    robot: [0, 0.6], robotFacing: Math.PI,
    camera: { pos: [-3, 1.4, 3.6], look: [0, 1.1, 0], fov: 55 },
  }),
  houses: L({
    id: 'houses', name: 'الحي', kind: 'outside', floor: null,
    origin: [20, 0, 9], size: [70, 22],
    robot: [0, -0.7], robotFacing: Math.PI,
    camera: { pos: [2.2, 1.45, -4.2], look: [-0.3, 1.1, 0], fov: 55 },
  }),
  roadworks: L({
    id: 'roadworks', name: 'أعمال الطريق', kind: 'outside', floor: null,
    origin: [-26, 0, 5.5], size: [12, 4],
    robot: [2.0, 1.4], robotFacing: -2.5,
    camera: { pos: [4.6, 2.2, -4.4], look: [-1.2, 0.2, 0.2], fov: 55 },
  }),
  park: L({
    id: 'park', name: 'الحديقة', kind: 'outside', floor: null,
    origin: [-40, 0, 24], size: [46, 32],
    robot: [-0.5, -3.5], robotFacing: 1.3,
    camera: { pos: [4.2, 1.9, -5.0], look: [-1.5, 0.9, -2.8], fov: 55 },
  }),
  flood_dip: L({
    id: 'flood_dip', name: 'مجرى السيول', kind: 'outside', floor: null,
    origin: [-14, 0, 20], size: [10, 16],
    robot: [-5, -4], robotFacing: Math.PI / 2,
    camera: { pos: [0.5, 1.6, -9], look: [-4.5, 0.8, -3], fov: 55 },
  }),
  mosque: L({
    id: 'mosque', name: 'المسجد', kind: 'outside', floor: null,
    origin: [-84, 0, -18], size: [16, 16],
    robot: [8, 10], robotFacing: 0,
    camera: { pos: [12.5, 1.5, 13.5], look: [0, 2, 3.8], fov: 55 },
  }),
};

export const LOCATION_IDS = Object.keys(LOCATIONS) as LocationId[];

export const isIndoor = (id: LocationId) => LOCATIONS[id].kind === 'inside';

/**
 * World position of an offset from a location's origin. Indoors y = floor + dy. Outdoors
 * y = groundHeight(x, z) + dy, so points on sidewalks, the crossing hump or the flood dip sit on
 * the surface (see src/core/ground.ts).
 */
export function locAt(id: LocationId, dx: number, dz: number, dy = 0): Vec3 {
  const d = LOCATIONS[id];
  const o = d.origin;
  const x = o[0] + dx;
  const z = o[2] + dz;
  return [x, (d.kind === 'inside' ? o[1] : groundHeight(x, z)) + dy, z];
}

export function robotSpot(id: LocationId): { pos: Vec3; rotY: number } {
  const d = LOCATIONS[id];
  return { pos: locAt(id, d.robot[0], d.robot[1]), rotY: d.robotFacing };
}

/** Default camera of a location. Camera/look heights are above the ground (or floor) under them. */
export function cameraSpot(id: LocationId): { pos: Vec3; look: Vec3; fov: number } {
  const d = LOCATIONS[id];
  return { pos: locAt(id, d.camera.pos[0], d.camera.pos[2], d.camera.pos[1]), look: locAt(id, d.camera.look[0], d.camera.look[2], d.camera.look[1]), fov: d.camera.fov ?? 55 };
}
