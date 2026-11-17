/**
 * Landmarks of the ground-floor rooms in each room's LOCAL frame (origin = the location origin in
 * src/core/locations.ts, floor y = 0). Cutscenes convert with ctx.at(x, z, y). Positions are
 * [x, z] on the floor unless a third (height) value is documented. Facing values are rotY
 * (0 = facing +Z / south, PI = facing north, PI/2 = facing east, -PI/2 = facing west).
 * Documented in docs/sets/ground.md.
 */

export const CLINIC = {
  /** Door centre along the north wall (x); the door is 1.0 m wide, the corridor is beyond z < -4. */
  doorX: 2.5,
  /** Just inside the door, and just outside it (corridor stub). */
  doorIn: [2.5, -3.3] as [number, number],
  doorOut: [2.5, -5.0] as [number, number],
  /** Sink vanity centre [x, z] (basin top 0.9 m). */
  sink: [-1.1, -3.72] as [number, number],
  /** Where someone stands to use the sink (face north, rotY = PI). */
  sinkStand: [-1.05, -3.05] as [number, number],
  /** First aid kit on the north wall [x, height]. */
  kit: [0.4, 1.5] as [number, number],
  /** Examination bed centre [x, y(mattress top), z]; head end toward north (z = -1.4). */
  bedCentre: [-3.5, 0.73, -0.55] as [number, number, number],
  /** Sitting on the bed edge facing east (rotY = PI/2), seat height 0.73. */
  bedSit: [-3.05, -0.3] as [number, number],
  /** Lying on the bed: body centre, head toward -Z. */
  bedLie: [-3.5, -0.5] as [number, number],
  /** Counselor's desk centre (the desk faces west). */
  deskCentre: [2.75, 0, -0.6] as [number, number, number],
  /** Counselor's chair (faces west, rotY = -PI/2), seat 0.46. */
  counselorSeat: [3.5, -0.6] as [number, number],
  /** Student chair in front of the desk (faces east, rotY = PI/2), seat 0.4. */
  studentSeat: [1.85, -0.6] as [number, number],
  /** Floor scale under the height chart (west wall). */
  scale: [-3.55, 2.3] as [number, number],
  /** Small fridge [x, z]. */
  fridge: [1.35, -3.7] as [number, number],
};

export const CANTEEN = {
  /** Double doors in the north wall, centre x (1.9 m wide). Corridor beyond z < -6. */
  doorX: -3,
  /** Hand-wash basins along the north wall (x), basin top 0.9 m, face north (rotY = PI). */
  basins: [0.2, 1.1, 2.0] as number[],
  /** Serving counter (east): local centre x, z, and length (runs along z); students stand west of it. */
  counterX: 5.6,
  counterZ: 0,
  counterLen: 5,
  /** Queue start [x, z] in front of the counter (line runs north along z, facing east rotY = PI/2). */
  queue: [4.5, 1.8] as [number, number],
  /** Round tables [x, z] (4 stools each at radius 0.8). */
  tables: [[-5, -2.2], [-1.5, -2.2], [2, -2.2], [-5.3, 1.3], [1.6, 1.3], [3, 4.2]] as [number, number][],
  /** Recycling bins along the west wall (z). */
  bins: [-4.7, -4.0, -3.3] as number[],
  /** Water cooler on the west wall (z). */
  cooler: -1.8,
  /** Ceiling fans [x, z]. */
  fans: [[-4, -1], [0, -1], [4, -1], [-4, 3.5], [1, 3.5]] as [number, number][],
};

export const PRAYER = {
  /** Door in the south wall (x); the corridor is beyond z > 5. */
  doorX: 3.2,
  doorIn: [3.2, 4.0] as [number, number],
  /** Shoe racks just inside the door (west of it), centres [x, z]. */
  shoeRacks: [[0.9, 4.55], [-0.5, 4.55]] as [number, number][],
  /** Qibla niche centre on the north wall: x, z of the wall face. People face north (rotY = PI). */
  qibla: [0, -5] as [number, number],
  /** Carpet extents [x0, x1, z0, z1]; prayer rows run east-west, 5 rows facing north. */
  carpet: [-4.2, 4.2, -4.0, 3.2] as [number, number, number, number],
  /** Row centres z for people standing/kneeling on the carpet. */
  rows: [-3.2, -2.0, -0.8, 0.4, 1.6] as number[],
  /** Quran shelves along the west wall (z centres). */
  shelves: [-3.2, 0, 3.2] as number[],
};

export const SPORTS = {
  /** Door in the south wall (x); corridor beyond z > 7. */
  doorX: -8.5,
  doorIn: [-8.5, 5.8] as [number, number],
  /** Centre circle of the court. */
  centre: [0, 0] as [number, number],
  /** Hoops: rim centre [x, y, z] (east and west end walls). Rims 3.05 m. */
  hoops: [[-10.4, 3.05, 0], [10.4, 3.05, 0]] as [number, number, number][],
  /** Wall bars on the north wall: x range, 2.6 m tall. */
  wallBars: [-9.5, -3.5] as [number, number],
  /** Ropes hang at [x, z] (north-east), reaching 0.4 m above the floor. */
  ropes: [[4.2, -6.1], [5.0, -6.1]] as [number, number][],
  /** Low balance beam centre [x, z], 3.4 m long along x, top 0.3 m. */
  beam: [-1.2, -5.0] as [number, number],
  /** Blue foam mats: landing mat centre [x, z] (jump onto it), stack at the corner. */
  landingMat: [6.3, -3.6] as [number, number],
  matStack: [9.2, -6.0] as [number, number],
  /** Ball cart (wire basket on wheels) [x, z]. */
  ballCart: [-6.5, 5.6] as [number, number],
  /** Front row of the 3-tier bleachers along the south wall: seat centres [x, z], 2.6 m each, seat 0.45; sitters face north. Rows 2 and 3 at z 6.0 (0.9) and 6.6 (1.35). */
  benches: [[2.4, 5.4], [5.2, 5.4], [8.0, 5.4]] as [number, number][],
  /** Water cooler on the east wall [x, z]. */
  cooler: [10.75, 4.8] as [number, number],
};

export const PRINCIPAL = {
  /** Door in the south wall (x). */
  doorX: 2.6,
  doorIn: [2.6, 3.3] as [number, number],
  /** Desk centre (faces south toward visitors); the principal's chair is behind it (north). */
  desk: [0, -2.5] as [number, number],
  principalSeat: [0, -3.4] as [number, number],
  /** Visitor chairs (face north, rotY = PI). */
  visitorChairs: [[-0.9, -0.9], [0.9, -0.9]] as [number, number][],
  bookshelf: [-3.55, -1.5] as [number, number],
  flagStand: [3.1, -3.1] as [number, number],
  /** Low tea table with dallah and cups. */
  teaTable: [2.9, 0.6] as [number, number],
};
