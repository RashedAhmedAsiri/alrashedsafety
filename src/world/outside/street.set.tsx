/**
 * The street and everything along it (set-street): main street, sidewalks, the raised zebra crossing
 * at the gate, the signal intersection, the bus stop, the pick-up lay-by, the parking lot and the
 * corner mosque. WORLD coordinates. Landmarks: docs/sets/street.md and ./street/layout.ts.
 *
 * Static geometry is merged into a few vertex-colored meshes per material class and x-chunk
 * (./street/build.ts, ./street/static.ts); all sign faces and decals share one painted atlas.
 * Lamps (signals, pedestrian heads, beacons) are dynamic groups switched by stage flags:
 *   carLight  'green' (default) | 'yellow' | 'red'      main-street car heads; cross-road heads opposite
 *   pedLight  'red' (default) | 'green' | 'greenFlash'  pedestrian heads at signal_crossing
 *   pedWait   true                                      the "wait" lamp on both push-button boxes
 *   beacons   false                                     stops the gate crossing beacons flashing
 *   streetPeople false                                  hides the background people of this set
 *   parkedCars false                                    hides the set-dressing cars in the parking lot
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { canvasTexture } from '../kit';
import { registerWet } from '../wet';
import { useApp } from '../../core/store';
import { useStage } from '../../core/stage';
import { CarModel } from '../../props/models';
import { StaticPerson } from '../../characters/Human';
import { Builder, CASTS, type Cls } from './street/build';
import { buildStreetStatic } from './street/static';
import { streetAtlas } from './street/atlas';
import { ATLAS_GROUPS, buildSignals, LAMP_COLOR, LAMP_GROUPS, type LampGroup } from './street/signals';
import { BENCHES_SOUTH, ORGANIZER_SPOT, PARKING, SW_H } from './street/layout';

/* --------------------------------------------------------------- materials */

/** Sidewalk paving: 0.5 m tiles (4 per texture repeat of 1 m), lightly varied. */
function pavingTexture() {
  return canvasTexture(
    'street-paving-v1',
    256,
    256,
    (ctx, w, h) => {
      const shades = ['#DCD0BA', '#D5C8B0', '#E0D5C0', '#D8CCB5'];
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++) {
          ctx.fillStyle = shades[i * 2 + j];
          ctx.fillRect((i * w) / 2, (j * h) / 2, w / 2, h / 2);
        }
      ctx.strokeStyle = '#B9AB92';
      ctx.lineWidth = 5;
      for (let i = 0; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo((i * w) / 2, 0);
        ctx.lineTo((i * w) / 2, h);
        ctx.moveTo(0, (i * h) / 2);
        ctx.lineTo(w, (i * h) / 2);
        ctx.stroke();
      }
    },
    { repeat: [1, 1] },
  );
}

let materials: Record<Cls, THREE.Material> | null = null;

function streetMaterials(): Record<Cls, THREE.Material> {
  if (materials) return materials;
  const std = (o: THREE.MeshStandardMaterialParameters, wet: boolean) => {
    const m = new THREE.MeshStandardMaterial({ color: '#FFFFFF', vertexColors: true, roughness: 0.85, ...o });
    if (wet) registerWet(m);
    return m;
  };
  const atlas = streetAtlas();
  materials = {
    flat: std({ roughness: 0.9 }, true),
    tiles: std({ map: pavingTexture(), vertexColors: false, roughness: 0.85 }, true),
    paint: std({ roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }, true),
    wet: std({ roughness: 0.75 }, true),
    solid: std({ roughness: 0.7 }, false),
    atlas: new THREE.MeshStandardMaterial({
      map: atlas,
      alphaTest: 0.5,
      roughness: 0.6,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
    }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
  };
  return materials;
}

/* --------------------------------------------------------------- geometry */

interface Built {
  statics: { cls: Cls; geometry: THREE.BufferGeometry }[];
  lamps: { group: LampGroup; geometry: THREE.BufferGeometry }[];
}
let built: Built | null = null;

/** Builds every merged mesh once per page load (outdoor parts remount on every outdoor visit). */
function buildAll(): Built {
  if (built) return built;
  const b = new Builder();
  const dyn = new Map<LampGroup, Builder>();
  const dynOf = (g: LampGroup) => {
    let d = dyn.get(g);
    if (!d) dyn.set(g, (d = new Builder()));
    return d;
  };
  buildStreetStatic(b);
  buildSignals(b, dynOf);
  const statics = b.build();
  const lamps: Built['lamps'] = [];
  for (const [group, d] of dyn) for (const { geometry } of d.build()) lamps.push({ group, geometry });
  built = { statics, lamps };
  return built;
}

/* ------------------------------------------------------------------ parts */

function StreetStatic() {
  const { statics } = useMemo(buildAll, []);
  const mats = useMemo(streetMaterials, []);
  const quality = useApp((s) => s.settings.quality);
  const shadows = quality !== 'low';
  return (
    <group name="street-static">
      {statics.map(({ cls, geometry }, i) => (
        <mesh key={i} geometry={geometry} material={mats[cls]} castShadow={shadows && CASTS[cls]} receiveShadow={cls !== 'glow'} />
      ))}
    </group>
  );
}

const lit = new THREE.Color();

/** Signal heads, pedestrian heads, push-button lamps and the flashing crossing beacons. */
function StreetLamps() {
  const { lamps } = useMemo(buildAll, []);
  const mats = useMemo(() => {
    const atlas = streetAtlas();
    const out = {} as Record<LampGroup, THREE.MeshBasicMaterial>;
    for (const g of LAMP_GROUPS)
      out[g] = ATLAS_GROUPS.has(g)
        ? new THREE.MeshBasicMaterial({ map: atlas, toneMapped: false, alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })
        : new THREE.MeshBasicMaterial({ color: LAMP_COLOR[g], toneMapped: false });
    return out;
  }, []);

  useFrame(() => {
    const f = useStage.getState().flags;
    const t = performance.now() / 1000;
    const car = (f.carLight as string) ?? 'green';
    const ped = (f.pedLight as string) ?? 'red';
    const on: Record<LampGroup, boolean> = {
      mainR: car === 'red',
      mainY: car === 'yellow',
      mainG: car !== 'red' && car !== 'yellow',
      crossR: car !== 'red',
      crossY: false,
      crossG: car === 'red',
      pedRed: ped !== 'green' && ped !== 'greenFlash',
      pedGreen: ped === 'green' || (ped === 'greenFlash' && t % 0.8 < 0.45),
      wait: f.pedWait === true && (ped === 'red' || ped === undefined),
      beaconA: f.beacons !== false && t % 1 < 0.5,
      beaconB: f.beacons !== false && t % 1 >= 0.5,
    };
    for (const g of LAMP_GROUPS) {
      const m = mats[g];
      lit.set(LAMP_COLOR[g]);
      if (!on[g]) lit.multiplyScalar(ATLAS_GROUPS.has(g) ? 0.22 : 0.16);
      m.color.copy(lit);
    }
  });

  return (
    <group name="street-lamps">
      {lamps.map(({ group, geometry }, i) => (
        <mesh key={i} geometry={geometry} material={mats[group]} />
      ))}
    </group>
  );
}

const CAR_COLORS = ['#F4F4F0', '#B8C1CC', '#1E2A3B', '#C8B89A', '#F4F4F0', '#8E2E2E', '#2F5E8E', '#F4F4F0', '#5B6470'];

/** Set-dressing cars in the parking lot (bays listed in PARKING.occupied). */
function ParkedCars() {
  const show = useStage((s) => s.flags.parkedCars !== false);
  if (!show) return null;
  const bays = [...PARKING.west, ...PARKING.east].filter((r) => PARKING.occupied.includes(r.id));
  return (
    <group name="street-parked-cars">
      {bays.map((r, i) => (
        <group key={r.id} position={r.car} rotation={[0, r.rotY, 0]}>
          <CarModel color={CAR_COLORS[i % CAR_COLORS.length]} seed={i + 3} lights="off" />
        </group>
      ))}
    </group>
  );
}

/** A few background people away from every action area. */
function StreetPeople() {
  const show = useStage((s) => s.flags.streetPeople !== false);
  if (!show) return null;
  const benchX = BENCHES_SOUTH[5];
  return (
    <group name="street-people">
      {/* traffic organizer at his painted spot by the pick-up canopy, watching the lay-by */}
      <StaticPerson kind="organizer" seed={7} position={ORGANIZER_SPOT} rotY={0.4} clip="idle" />
      {/* a neighbour resting on a far south-side bench, east of every scenario */}
      <StaticPerson kind="teacher" seed={11} position={[benchX, SW_H, 6.85]} rotY={Math.PI} clip="sit" />
      {/* a worshipper walking along the mosque courtyard */}
      <StaticPerson kind="parent" seed={13} position={[-88, 0, -13]} rotY={Math.PI / 2} clip="walk" />
    </group>
  );
}

function StreetSet() {
  return (
    <group name="set-street">
      <StreetStatic />
      <StreetLamps />
      <ParkedCars />
      <StreetPeople />
    </group>
  );
}

export const outdoorParts = [StreetSet];

