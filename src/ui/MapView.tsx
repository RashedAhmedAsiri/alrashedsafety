// OWNER: ui worker. The illustrated map: a flat, colorful top-down drawing of the outside area, the ground
// floor and the first floor, drawn in world metres straight from src/core/locations.ts (origins and sizes),
// with a round pin on every location. Tap a pin → travelTo(id). The current location's pin bounces.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  CarFront,
  ChevronsUp,
  Construction,
  DoorOpen,
  Dumbbell,
  Fence,
  Flag,
  Footprints,
  Goal,
  HeartPulse,
  House,
  Library,
  Microscope,
  Monitor,
  MoonStar,
  Palette,
  Signpost,
  SquareParking,
  TreePalm,
  Trees,
  Utensils,
  Waves,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useApp } from '../core/store';
import { COLORS } from '../core/theme';
import type { LocationId } from '../core/types';
import { LOCATIONS } from '../core/locations';
import { travelTo } from '../engine/conversation';
import { playSfx } from '../audio/sfx';
import { ToyButton } from './ToyButton';
import { MAP_SHEETS, UI_TEXT } from './labels';
import { usePresence } from './usePresence';
import { useUiLocal, type MapSheet } from './uiStore';
import { tint } from './color';

// ------------------------------------------------------------------ pins
interface PinDef {
  icon: LucideIcon;
  color: string;
  /** World point override [x, z] when the origin would collide with a neighbour. */
  at?: [number, number];
  /** Label side. */
  lab?: 'b' | 't' | 'l' | 'r';
}

const PINS: Record<LocationId, PinDef> = {
  classroom: { icon: BookOpen, color: '#2D8CFF' },
  lobby: { icon: DoorOpen, color: '#14B8A6' },
  canteen: { icon: Utensils, color: '#FF8A3D' },
  clinic: { icon: HeartPulse, color: '#F0476B' },
  corridor_ground: { icon: ArrowLeftRight, color: '#8A94A6', at: [-21, -55] },
  sports_hall: { icon: Dumbbell, color: '#E8A200' },
  principal: { icon: Briefcase, color: '#8B5CF6' },
  prayer_room: { icon: MoonStar, color: '#22B573' },
  stairs: { icon: ChevronsUp, color: '#E2559B' },
  corridor_first: { icon: ArrowLeftRight, color: '#8A94A6', at: [-21, -55] },
  computer_lab: { icon: Monitor, color: '#2D8CFF' },
  biology_lab: { icon: Microscope, color: '#22B573' },
  art_room: { icon: Palette, color: '#E2559B' },
  library: { icon: Library, color: '#FF8A3D' },
  yard: { icon: Flag, color: '#14B8A6', at: [-6, -24] },
  football_field: { icon: Goal, color: '#22B573', at: [39, -27] },
  gate: { icon: Fence, color: '#8B5CF6', at: [-7, -12.5], lab: 'r' },
  street_front: { icon: Car, color: '#2D8CFF', at: [24, 0], lab: 'b' },
  crosswalk_main: { icon: Footprints, color: '#FF8A3D', at: [0, -1], lab: 'b' },
  signal_crossing: { icon: Signpost, color: '#F0476B', at: [-62, -1], lab: 'b' },
  bus_stop: { icon: Bus, color: '#E8A200', at: [31, -8], lab: 't' },
  pickup_lane: { icon: CarFront, color: '#14B8A6', at: [-32, -7.5], lab: 't' },
  parking: { icon: SquareParking, color: '#2D8CFF', at: [68, -20] },
  sidewalk_far: { icon: TreePalm, color: '#22B573', at: [10, 9.5] },
  houses: { icon: House, color: '#FF8A3D', at: [30, 17] },
  roadworks: { icon: Construction, color: '#E8A200', at: [-27, 6], lab: 'b' },
  park: { icon: Trees, color: '#22B573', at: [-44, 24] },
  flood_dip: { icon: Waves, color: '#2D8CFF', at: [-14, 22] },
  mosque: { icon: MoonStar, color: '#14B8A6', at: [-84, -18] },
};

// ------------------------------------------------------------------ drawing helpers (world metres)
const box = (x0: number, z0: number, x1: number, z1: number) => ({ x: Math.min(x0, x1), y: Math.min(z0, z1), width: Math.abs(x1 - x0), height: Math.abs(z1 - z0) });
const area = (id: LocationId, pad = 0) => {
  const d = LOCATIONS[id];
  const [w, h] = d.size;
  return box(d.origin[0] - w / 2 + pad, d.origin[2] - h / 2 + pad, d.origin[0] + w / 2 - pad, d.origin[2] + h / 2 - pad);
};

const C = {
  sand: '#F3E6CB',
  sand2: '#EAD9B6',
  paving: '#E4DCCD',
  pavingEdge: '#CFC4B0',
  asphalt: '#566275',
  asphaltDark: '#4A5568',
  grass: '#A7D873',
  grassDark: '#8CC45A',
  turf: '#5DBB63',
  tree: '#4FA84F',
  water: '#7CC4FA',
  wall: '#D6C3A0',
  roof: '#FBF3E3',
  white: '#FFFFFF',
};

function Palm({ x, z, r = 2.2 }: { x: number; z: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={z + 0.5} r={r} fill="#000" opacity={0.08} />
      <circle cx={x} cy={z} r={r} fill={C.tree} />
      <circle cx={x - r * 0.3} cy={z - r * 0.3} r={r * 0.45} fill="#6CC06A" />
    </g>
  );
}

function Zebra({ x0, x1, z0, z1 }: { x0: number; x1: number; z0: number; z1: number }) {
  const out: ReactNode[] = [];
  for (let z = z0 + 0.4; z < z1 - 0.4; z += 1.2) out.push(<rect key={z} x={x0} y={z} width={x1 - x0} height={0.7} rx={0.2} fill={C.white} />);
  return <g>{out}</g>;
}

// ------------------------------------------------------------------ outside sheet
function OutsideArt() {
  const villas = [-6, 5, 16, 27, 38, 49];
  const villaColors = ['#F4E1BE', '#FFFFFF', '#EBD3A8', '#F7EBD5', '#E9CFA0', '#FFF4E0'];
  return (
    <g>
      <rect x={-200} y={-160} width={400} height={300} fill={C.sand} />
      {/* school compound (fence steps back behind the lay-by) */}
      <path d="M-56 -80 H56 V-7.5 H-16 V-10.5 H-50 V-7.5 H-56 Z" fill={C.paving} stroke="#B9C2CF" strokeWidth={0.7} />
      {/* building */}
      <rect {...box(-36, -74, 24, -38)} rx={1.5} fill={C.roof} stroke={C.wall} strokeWidth={0.8} />
      <rect {...box(-34, -72, 22, -40)} rx={1} fill="none" stroke="#EADBC2" strokeWidth={0.6} strokeDasharray="1.5 1.2" />
      <rect {...box(-6, -39, 0, -37)} rx={0.6} fill={COLORS.teal} />
      {/* yard with class lines + canopy */}
      <rect {...box(-22, -36, 22, -9)} rx={1.5} fill="#F8EEDB" />
      <rect {...box(-22, -36, 0, -27)} rx={1.5} fill="#BFE6E1" />
      {[-16, -10, -4, 2, 8, 14].map((x) => (
        <rect key={x} x={x} y={-24} width={0.35} height={10} fill="#FFFFFF" />
      ))}
      <Palm x={-19} z={-12} r={1.8} />
      <Palm x={19} z={-12} r={1.8} />
      <Palm x={19} z={-33} r={1.8} />
      {/* football field */}
      <rect {...box(26, -44, 52, -10)} rx={1.2} fill={C.turf} />
      <rect {...box(27.5, -42.5, 50.5, -11.5)} fill="none" stroke="#E9FCE9" strokeWidth={0.45} />
      <line x1={27.5} y1={-27} x2={50.5} y2={-27} stroke="#E9FCE9" strokeWidth={0.45} />
      <circle cx={39} cy={-27} r={3.4} fill="none" stroke="#E9FCE9" strokeWidth={0.45} />
      <rect {...box(35.5, -44, 42.5, -42.5)} fill="#FFFFFF" />
      <rect {...box(35.5, -11.5, 42.5, -10)} fill="#FFFFFF" />
      {/* parking */}
      <rect {...box(58, -32, 78, -8)} rx={1} fill={C.asphalt} />
      <rect {...box(60, -8, 66, -3.5)} fill={C.asphalt} />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect x={59} y={-30 + i * 4.4} width={5.5} height={0.3} fill="#E8ECF2" />
          <rect x={72.5} y={-30 + i * 4.4} width={5.5} height={0.3} fill="#E8ECF2" />
        </g>
      ))}
      <rect x={59.6} y={-29.2} width={4.4} height={2.6} rx={0.8} fill="#F0476B" />
      <rect x={73.2} y={-20.4} width={4.4} height={2.6} rx={0.8} fill="#FFFFFF" />
      <rect x={59.6} y={-16} width={4.4} height={2.6} rx={0.8} fill="#2D8CFF" />
      {/* sidewalks */}
      <rect {...box(-130, -7.5, 130, -3.5)} fill={C.paving} />
      <rect {...box(-130, 3.5, 130, 7.5)} fill={C.paving} />
      <rect {...box(-50, -7.5, -16, -3.5)} fill={C.asphalt} />
      {/* signal road + side road */}
      <rect {...box(-75.5, -160, -68.5, 140)} fill={C.asphalt} />
      <rect {...box(-17.5, 3.5, -10.5, 44)} fill={C.asphalt} />
      {/* main street */}
      <rect {...box(-130, -3.5, 130, 3.5)} fill={C.asphalt} />
      {Array.from({ length: 44 }, (_, i) => -130 + i * 6).map((x) =>
        x > -78 && x < -66 ? null : <rect key={x} x={x} y={-0.18} width={3} height={0.36} fill="#FFD34D" />,
      )}
      {Array.from({ length: 24 }, (_, i) => -158 + i * 6).map((z) =>
        z > -10 && z < 10 ? null : <rect key={z} x={-72.18} y={z} width={0.36} height={3} fill="#FFFFFF" opacity={0.85} />,
      )}
      {/* crossings */}
      <rect {...box(-3.5, -3.5, 3.5, 3.5)} fill="#6B778A" />
      <g transform="rotate(90 0 0)">
        <Zebra x0={-3.2} x1={3.2} z0={-3} z1={3} />
      </g>
      <g transform="rotate(90 -62 0)">
        <Zebra x0={-62 - 3.2} x1={-62 + 3.2} z0={-2.2} z1={2.2} />
      </g>
      {/* flood dip */}
      <ellipse cx={-14} cy={20} rx={3.6} ry={5} fill={C.water} opacity={0.85} />
      {/* park */}
      <rect {...box(-63, 8.5, -19, 40)} rx={2} fill={C.grass} />
      <rect {...box(-60, 11.5, -22, 37)} rx={4} fill="none" stroke="#E8D6AE" strokeWidth={1.4} />
      <rect {...box(-38, 14, -27, 22)} rx={1.2} fill="#F7A072" />
      <circle cx={-50} cy={28} r={2.6} fill={C.water} stroke="#FFFFFF" strokeWidth={0.6} />
      {[
        [-58, 14],
        [-54, 34],
        [-24, 34],
        [-24, 13],
        [-44, 34],
        [-58, 24],
      ].map(([x, z], i) => (
        <Palm key={i} x={x} z={z} r={2.4} />
      ))}
      {/* houses */}
      {villas.map((x, i) => (
        <g key={x}>
          <rect x={x - 0.6} y={9.4} width={10.2} height={13.2} rx={0.8} fill={C.sand2} />
          <rect x={x + 1} y={11.5} width={7} height={8} rx={0.8} fill={villaColors[i]} stroke={C.wall} strokeWidth={0.4} />
          <rect x={x + 2.2} y={12.6} width={2.2} height={2.2} rx={0.4} fill="#C9D3DF" />
          <Palm x={x + 8.6} z={21} r={1.3} />
        </g>
      ))}
      {/* mosque */}
      <rect {...box(-92, -26, -77, -11)} rx={1.2} fill="#FFFFFF" stroke={C.wall} strokeWidth={0.6} />
      <circle cx={-84.5} cy={-18.5} r={4.2} fill="#22B573" />
      <circle cx={-84.5} cy={-18.5} r={1.4} fill="#7FD9A6" />
      <circle cx={-79.5} cy={-23.5} r={1.4} fill="#E9DCC1" stroke={C.wall} strokeWidth={0.4} />
      {/* bus stop shelter */}
      <rect {...box(26.5, -7.2, 34, -5.6)} rx={0.5} fill="#2D8CFF" />
      <rect {...box(25.5, -4.1, 35, -3.8)} fill="#FFD34D" />
      {/* roadworks */}
      {[-30, -28, -26, -24, -22].map((x) => (
        <circle key={x} cx={x} cy={4.6} r={0.55} fill="#FF8A3D" />
      ))}
      <circle cx={-26} cy={6} r={0.9} fill="#3D4A5E" />
      {/* gate + guard room */}
      <rect {...box(-4, -8.2, 4, -6.8)} fill={C.paving} />
      <rect {...box(5, -11.5, 8.5, -8.5)} rx={0.5} fill="#FFFFFF" stroke={C.wall} strokeWidth={0.4} />
      {/* street palms */}
      {[-110, -96, -46, -6, 6, 46, 86, 100].map((x) => (
        <Palm key={x} x={x} z={6.6} r={1.1} />
      ))}
    </g>
  );
}

// ------------------------------------------------------------------ inside sheets
function RoomShape({ id, children, fill }: { id: LocationId; children?: ReactNode; fill?: string }) {
  const p = PINS[id];
  const b = area(id, 0.3);
  return (
    <g>
      <rect {...b} rx={0.9} fill={fill ?? tint(p.color, 0.78)} stroke={tint(p.color, 0.35)} strokeWidth={0.35} />
      {children}
    </g>
  );
}

function Desks({ x0, z0, cols, rows, dx, dz, w = 1.6, d = 0.8, fill = '#FFFFFF' }: { x0: number; z0: number; cols: number; rows: number; dx: number; dz: number; w?: number; d?: number; fill?: string }) {
  const out: ReactNode[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push(<rect key={`${r}-${c}`} x={x0 + c * dx} y={z0 + r * dz} width={w} height={d} rx={0.2} fill={fill} />);
  return <g>{out}</g>;
}

function BuildingShell({ children }: { children: ReactNode }) {
  return (
    <g>
      <rect x={-200} y={-160} width={400} height={300} fill={C.sand} />
      {/* yard in front (south) */}
      <rect {...box(-60, -38, 60, 0)} fill="#F8EEDB" />
      <rect {...box(-6, -38, 0, -34)} fill={C.paving} />
      <rect {...box(-37, -75, 25, -37)} rx={1.4} fill={C.wall} />
      <rect {...box(-36, -74, 24, -38)} rx={1} fill="#F1E6D2" />
      {children}
    </g>
  );
}

function Corridor({ id }: { id: LocationId }) {
  const b = area(id, 0.1);
  return (
    <g>
      <rect {...b} rx={0.6} fill="#E7EBF0" stroke="#C9D1DC" strokeWidth={0.3} />
      <rect x={b.x + 1} y={b.y + b.height / 2 - 0.12} width={b.width - 2} height={0.24} fill="#FFFFFF" />
    </g>
  );
}

function Stairs() {
  const b = area('stairs', 0.3);
  return (
    <RoomShape id="stairs">
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={b.x + 0.8} y={b.y + 1 + i * 0.95} width={b.width / 2 - 1} height={0.5} fill="#FFFFFF" opacity={0.9} />
      ))}
      <rect x={b.x + b.width / 2 + 0.6} y={b.y + 1} width={b.width / 2 - 1.4} height={3} rx={0.3} fill="#C9D3DF" />
    </RoomShape>
  );
}

function GroundArt() {
  const sh = area('sports_hall', 0.3);
  return (
    <BuildingShell>
      <Corridor id="corridor_ground" />
      <RoomShape id="classroom">
        <Desks x0={9.5} z0={-48} cols={4} rows={4} dx={2.6} dz={1.9} />
        <rect x={10} y={-49.6} width={8} height={0.5} rx={0.2} fill="#2E7D5B" />
      </RoomShape>
      <RoomShape id="lobby">
        <rect x={-7} y={-47} width={8} height={1.2} rx={0.4} fill="#FFFFFF" />
        <rect x={-5} y={-39.6} width={4} height={0.8} rx={0.3} fill={COLORS.teal} />
      </RoomShape>
      <RoomShape id="canteen">
        {[
          [-23, -48],
          [-18, -48],
          [-23, -43],
          [-18, -43],
          [-14.5, -45.5],
        ].map(([x, z], i) => (
          <circle key={i} cx={x} cy={z} r={1.2} fill="#FFFFFF" />
        ))}
        <rect x={-25.5} y={-50.4} width={13} height={0.9} rx={0.3} fill="#F7A072" />
      </RoomShape>
      <RoomShape id="clinic">
        <rect x={-34} y={-48} width={2} height={4} rx={0.4} fill="#FFFFFF" />
        <rect x={-30.2} y={-44.6} width={0.8} height={2.6} fill="#F0476B" />
        <rect x={-31.1} y={-43.7} width={2.6} height={0.8} fill="#F0476B" />
      </RoomShape>
      <RoomShape id="sports_hall" fill="#F2C98A">
        <rect x={sh.x + 1.5} y={sh.y + 1.5} width={sh.width - 3} height={sh.height - 3} fill="none" stroke="#FFFFFF" strokeWidth={0.3} />
        <circle cx={-24} cy={-66} r={2} fill="none" stroke="#FFFFFF" strokeWidth={0.3} />
        <line x1={-24} y1={sh.y + 1.5} x2={-24} y2={sh.y + sh.height - 1.5} stroke="#FFFFFF" strokeWidth={0.3} />
        <rect x={-34} y={-71} width={3} height={2} rx={0.3} fill="#5AA9F0" />
      </RoomShape>
      <RoomShape id="principal">
        <rect x={-10} y={-67} width={4} height={1.6} rx={0.3} fill="#B98A62" />
      </RoomShape>
      <RoomShape id="prayer_room" fill="#BFE8CF">
        {[-68, -66, -64, -62].map((z) => (
          <rect key={z} x={-2} y={z} width={8} height={0.25} fill="#22B573" opacity={0.6} />
        ))}
      </RoomShape>
      <Stairs />
    </BuildingShell>
  );
}

function FirstArt() {
  return (
    <BuildingShell>
      <Corridor id="corridor_first" />
      <RoomShape id="computer_lab">
        <Desks x0={-34} z0={-48.5} cols={4} rows={3} dx={3.2} dz={2.6} w={2.4} d={0.9} />
      </RoomShape>
      <RoomShape id="biology_lab">
        <Desks x0={-18} z0={-48.5} cols={3} rows={3} dx={4} dz={2.6} w={3} d={1.1} />
        <rect x={-7.2} y={-42.5} width={1.4} height={1.4} rx={0.3} fill="#7CC4FA" />
      </RoomShape>
      <RoomShape id="art_room">
        <Desks x0={-1} z0={-48} cols={2} rows={2} dx={5} dz={4} w={4} d={2} />
        {[
          [0, -41],
          [2, -41],
          [4, -41],
        ].map(([x, z], i) => (
          <circle key={i} cx={x} cy={z} r={0.5} fill={['#F0476B', '#FFAA1F', '#2D8CFF'][i]} />
        ))}
      </RoomShape>
      <RoomShape id="library">
        {[-71, -69, -67].map((z) => (
          <rect key={z} x={-8} y={z} width={12} height={0.9} rx={0.2} fill="#FFAA1F" opacity={0.8} />
        ))}
        <circle cx={-2} cy={-63} r={2} fill="#FFFFFF" />
      </RoomShape>
      {/* other first-floor rooms (no location), drawn plain */}
      <rect {...box(12.3, -49.7, 23.7, -40.3)} rx={0.9} fill="#E9E2D4" />
      <rect {...box(-35.7, -71.7, -11.3, -59.3)} rx={0.9} fill="#E9E2D4" />
      <rect {...box(5.3, -71.7, 9.7, -59.3)} rx={0.9} fill="#E9E2D4" />
      <rect {...box(18.3, -71.7, 23.7, -59.3)} rx={0.9} fill="#E9E2D4" />
      <Stairs />
    </BuildingShell>
  );
}

// ------------------------------------------------------------------ sheets
interface SheetDef {
  vb: [number, number, number, number];
  art: () => ReactNode;
  pins: LocationId[];
}

export const SHEETS: Record<MapSheet, SheetDef> = {
  outside: {
    vb: [-96, -48, 180, 92],
    art: () => <OutsideArt />,
    pins: ['yard', 'football_field', 'gate', 'crosswalk_main', 'street_front', 'bus_stop', 'pickup_lane', 'parking', 'signal_crossing', 'sidewalk_far', 'houses', 'roadworks', 'park', 'flood_dip', 'mosque'],
  },
  ground: {
    vb: [-39, -76.5, 66, 40],
    art: () => <GroundArt />,
    pins: ['classroom', 'lobby', 'canteen', 'clinic', 'corridor_ground', 'sports_hall', 'principal', 'prayer_room', 'stairs'],
  },
  first: {
    vb: [-39, -76.5, 66, 40],
    art: () => <FirstArt />,
    pins: ['computer_lab', 'biology_lab', 'art_room', 'library', 'corridor_first', 'stairs'],
  },
};

/** Map scale (px per metre) at which pins are drawn at full size (the 1280x720 landscape panel). */
const PIN_REF_SCALE: Record<MapSheet, number> = { outside: 5.3, ground: 13.5, first: 13.5 };

export function sheetOf(id: LocationId): MapSheet {
  const d = LOCATIONS[id];
  if (d.kind !== 'inside') return 'outside';
  return d.floor === 1 ? 'first' : 'ground';
}

// ------------------------------------------------------------------ pins layer
/** Label side on a sheet turned a quarter turn (world +z is screen left there). */
const TURNED_SIDE = { b: 'l', t: 'r', l: 't', r: 'b' } as const;

function Pin({ id, x, y, here, turn, onPick }: { id: LocationId; x: number; y: number; here: boolean; turn?: boolean; onPick: (id: LocationId) => void }) {
  const p = PINS[id];
  const [pressed, setPressed] = useState(false);
  const Icon = p.icon;
  const lab = turn ? (p.lab ? TURNED_SIDE[p.lab] : 'b') : (p.lab ?? 'b');
  return (
    <button
      type="button"
      className={`mpin mpin--${lab}${here ? ' is-here' : ''}${pressed ? ' is-pressed' : ''}`}
      style={{ left: x, top: y, '--c': here ? COLORS.teal : p.color } as CSSProperties}
      aria-label={LOCATIONS[id].name}
      data-loc={id}
      onPointerDown={() => {
        setPressed(true);
        playSfx('pop');
      }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={() => onPick(id)}
    >
      <span className="mpin-in">
        <span className="mpin-bob">
          <span className="mpin-dot">
            <Icon size={here ? 24 : 20} strokeWidth={2.5} />
          </span>
        </span>
        <span className="mpin-label">{LOCATIONS[id].name}</span>
      </span>
    </button>
  );
}

function SheetView({ sheet, here, onPick, pins = true }: { sheet: MapSheet; here: LocationId; onPick?: (id: LocationId) => void; pins?: boolean }) {
  const def = SHEETS[sheet];
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<[number, number]>([0, 0]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const m = () => setSize([el.clientWidth, el.clientHeight]);
    m();
    const ro = new ResizeObserver(m);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [vx, vy, vw, vh] = def.vb;
  const [W, H] = size;
  // A tall box (phone or tablet held upright) shows the sheet turned a quarter turn, so the wide drawing
  // fills the panel instead of being a thin strip in the middle. Pins and labels stay upright.
  const sFlat = W && H ? Math.min(W / vw, H / vh) : 0;
  const sTurn = W && H ? Math.min(W / vh, H / vw) : 0;
  const turn = sTurn > sFlat * 1.15;
  const s = turn ? sTurn : sFlat;
  const ox = (W - (turn ? vh : vw) * s) / 2;
  const oy = (H - (turn ? vw : vh) * s) / 2;
  // Turned: world x runs down the screen and world z runs right to left (svg rotate(90)).
  const toPx = (x: number, z: number): [number, number] => (turn ? [ox + (vy + vh - z) * s, oy + (x - vx) * s] : [ox + (x - vx) * s, oy + (z - vy) * s]);
  const viewBox = turn ? `${-(vy + vh)} ${vx} ${vh} ${vw}` : def.vb.join(' ');
  const ps = s ? Math.max(0.6, Math.min(1.1, s / PIN_REF_SCALE[sheet])) : 1;

  // Labels that would cover another pin or label are hidden (the current place and the nearer pins win);
  // the icon still shows, and the name is spoken/shown on arrival.
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box || !s) return;
    const btns = [...box.querySelectorAll<HTMLElement>('.mpin')];
    btns.sort((a, b) => Number(b.classList.contains('is-here')) - Number(a.classList.contains('is-here')));
    const B = box.getBoundingClientRect();
    const dots = btns.map((b) => b.querySelector('.mpin-dot')!.getBoundingClientRect());
    const kept: DOMRect[] = [];
    const hit = (a: DOMRect, b: DOMRect) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
    btns.forEach((b, i) => {
      const lab = b.querySelector<HTMLElement>('.mpin-label');
      if (!lab) return;
      lab.style.visibility = '';
      const r = lab.getBoundingClientRect();
      const out = r.left < B.left + 2 || r.right > B.right - 2 || r.top < B.top + 2 || r.bottom > B.bottom - 2;
      const clash = kept.some((k) => hit(k, r)) || dots.some((d, j) => j !== i && hit(d, r));
      if ((out || clash) && !b.classList.contains('is-here')) lab.style.visibility = 'hidden';
      else kept.push(r);
    });
  }, [s, turn, sheet, here, pins]);

  return (
    // Pins and labels shrink a little when the map is drawn smaller (phones), so neighbours do not overlap.
    <div ref={ref} className="map-box" data-sheet={sheet} data-turn={turn ? '1' : undefined} style={{ '--ps': ps } as CSSProperties}>
      <svg key={`${sheet}${turn ? 't' : ''}`} viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden>
        {turn ? <g transform="rotate(90)">{def.art()}</g> : def.art()}
      </svg>
      {pins && s
        ? def.pins.map((id) => {
            const p = PINS[id];
            const o = LOCATIONS[id].origin;
            const [x, y] = toPx(p.at ? p.at[0] : o[0], p.at ? p.at[1] : o[2]);
            return <Pin key={id} id={id} x={x} y={y} here={id === here} turn={turn} onPick={(i) => onPick?.(i)} />;
          })
        : null}
    </div>
  );
}

/** Small static thumbnail of the outside sheet for the settings tile. */
export function MiniMap({ here }: { here: LocationId }) {
  const sheet = sheetOf(here);
  const def = SHEETS[sheet];
  const p = PINS[here];
  const o = LOCATIONS[here].origin;
  const at = p.at ?? [o[0], o[2]];
  const r = sheet === 'outside' ? 5 : 2.2;
  return (
    <svg viewBox={def.vb.join(' ')} preserveAspectRatio="xMidYMid slice" aria-hidden>
      {def.art()}
      <circle cx={at[0]} cy={at[1]} r={r * 1.7} fill={COLORS.teal} opacity={0.3} />
      <circle cx={at[0]} cy={at[1]} r={r} fill={COLORS.teal} stroke="#FFFFFF" strokeWidth={r * 0.35} />
    </svg>
  );
}

// ------------------------------------------------------------------ panel
export function MapPanel() {
  const open = useUiLocal((s) => s.mapOpen);
  const phase = useApp((s) => s.phase);
  const here = useApp((s) => s.location);
  const chosen = useUiLocal((s) => s.mapSheet);
  const sheet = chosen ?? sheetOf(here);
  const isOpen = open && (phase === 'mode' || phase === 'menu');
  const { mounted, closing } = usePresence(isOpen);

  useEffect(() => {
    if (isOpen) playSfx('slide', { volume: 0.7 });
  }, [isOpen]);

  const sheets = useMemo(() => (['outside', 'ground', 'first'] as MapSheet[]).map((id) => ({ id, label: MAP_SHEETS[id] })), []);
  if (!mounted) return null;

  const close = () => useUiLocal.getState().set({ mapOpen: false });
  const back = () => {
    useUiLocal.getState().set({ mapOpen: false });
    useApp.getState().setUi({ settingsOpen: true });
  };
  const pick = (id: LocationId) => {
    useUiLocal.getState().set({ mapOpen: false });
    useApp.getState().setUi({ settingsOpen: false, scenariosOpen: false });
    playSfx('whoosh', { volume: 0.6 });
    void travelTo(id);
  };

  return (
    <>
      <div className={`veil${closing ? ' is-closing' : ''}`} onPointerDown={close} />
      <section className={`panel mapp${closing ? ' is-closing' : ''}`} role="dialog" aria-label={UI_TEXT.map}>
        <header className="panel-head">
          <ToyButton color="#FFFFFF" fg="#1E2A3B" className="panel-close" label={UI_TEXT.back} onPress={back} sound="click" data={{ ui: 'map-back' }}>
            <ArrowRight size={28} strokeWidth={3} />
          </ToyButton>
          <div className="panel-title map-title">{UI_TEXT.map}</div>
          <div className="seg map-seg" role="radiogroup">
            {sheets.map((o) => (
              <ToyButton key={o.id} color={COLORS.teal} className={o.id === sheet ? 'is-on' : 'is-off'} onPress={() => useUiLocal.getState().set({ mapSheet: o.id })} data={{ sheet: o.id }}>
                {o.label}
              </ToyButton>
            ))}
          </div>
          <ToyButton color="#FFFFFF" fg="#1E2A3B" className="panel-close" label={UI_TEXT.close} onPress={close} sound="click" data={{ ui: 'close' }}>
            <X size={28} strokeWidth={3} />
          </ToyButton>
        </header>
        <SheetView sheet={sheet} here={here} onPick={pick} />
      </section>
    </>
  );
}
