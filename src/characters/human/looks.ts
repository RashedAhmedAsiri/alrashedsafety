/**
 * Appearance of every human: boys (BoySpec + extra seeded details) and the adult kinds.
 * Everything is deterministic from the actor id / seed so the same id always looks the same.
 */
import { SHIRT_COLORS, type BoySpec, type CharacterKind } from '../../core/types';

/* ------------------------------------------------------------------ random */

export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  // final avalanche
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

export function rng(seed: number) {
  let a = seed >>> 0 || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Splits an id like "s12" / "boy_3" / "p4" into a stem hash and a trailing number (or null). */
function idParts(id: string): { stem: number; n: number | null } {
  const m = /^(.*?)(\d+)$/.exec(id);
  if (!m) return { stem: hashString(id), n: null };
  return { stem: hashString(m[1] || '#'), n: parseInt(m[2], 10) };
}

/* ----------------------------------------------------------------- palettes */

/** Saudi skin range, light (0) to dark (4). */
export const SKIN_TONES = ['#F3D3B2', '#E3B68C', '#C9986B', '#A6744D', '#7D5236'] as const;
export const HAIR_COLORS = { black: '#1F1C1B', brown: '#3E2A1F' } as const;
export const PANTS_COLORS = { blue: '#35589A', black: '#2A2D35' } as const;
export const BACKPACK_COLORS = ['#E5484D', '#2D8CFF', '#22B573', '#FFAA1F', '#8B5CF6', '#14B8A6', '#FF6FA8', '#1E2A3B', '#F5C518', '#FF8A3D'] as const;
const SHOE_ACCENTS = ['#2D8CFF', '#E5484D', '#1E2A3B', '#22B573', '#8A94A6', '#FF8A3D', '#14B8A6'] as const;
const GLASSES_FRAMES = ['#1E2A3B', '#C0392B', '#2D6CDF', '#6B4A2B'] as const;

export type HairStyle = 'crop' | 'fringe' | 'tuft' | 'side' | 'buzz';
const HAIR_STYLES: HairStyle[] = ['crop', 'fringe', 'tuft', 'side', 'buzz'];

/** A boy's full look: BoySpec plus seeded extras. */
export interface BoyLook extends BoySpec {
  hairStyle: HairStyle;
  shoe: string;
  /** Stripe color when striped. */
  stripe: string;
  glasses: string | null;
  /** 0..1 small proportion variation. */
  chub: number;
}

export function boyLook(id: string, spec: Partial<BoySpec> = {}): BoyLook {
  const { stem, n } = idParts(id);
  const r = rng(hashString(id) ^ 0x51ed27);
  const k = n ?? Math.floor(r() * 1000);
  const off = stem % 997;
  // Sequential ids (s1, s2, s3 ...) step through palettes with co-prime strides so neighbours differ.
  const shirtIdx = (off + k * 3) % SHIRT_COLORS.length;
  const heights: BoySpec['height'][] = ['small', 'medium', 'tall'];
  const height = heights[(off + k * 2) % 3];
  const skin = (off * 7 + k * 2) % 5;
  const striped = spec.striped ?? (off + k * 5) % 7 === 3;
  const shirt = spec.shirt ?? SHIRT_COLORS[shirtIdx];
  const isWhite = shirt.toUpperCase() === '#FFFFFF';
  let backpack: string | null = BACKPACK_COLORS[(off * 3 + k * 7) % BACKPACK_COLORS.length];
  if (backpack.toUpperCase() === shirt.toUpperCase()) backpack = BACKPACK_COLORS[(off * 3 + k * 7 + 3) % BACKPACK_COLORS.length];
  if ((off + k * 3) % 5 === 4) backpack = null;
  const look: BoyLook = {
    shirt,
    striped,
    pants: spec.pants ?? ((off + k) % 3 === 2 ? 'black' : 'blue'),
    skin: spec.skin ?? skin,
    height: spec.height ?? height,
    hair: spec.hair ?? ((off + k * 3) % 4 === 1 ? 'brown' : 'black'),
    backpack: spec.backpack === undefined ? backpack : spec.backpack,
    hairStyle: HAIR_STYLES[(off * 5 + k * 3) % HAIR_STYLES.length],
    shoe: SHOE_ACCENTS[(off + k * 4) % SHOE_ACCENTS.length],
    stripe: isWhite ? '#2D5DA8' : '#FFFFFF',
    glasses: (off + k * 7) % 9 === 5 ? GLASSES_FRAMES[(off + k) % GLASSES_FRAMES.length] : null,
    chub: ((off * 13 + k * 5) % 11) / 10,
  };
  return look;
}

/* ------------------------------------------------------------------- adults */

export type Headwear = 'ghutra' | 'shemagh' | 'cap' | 'none';
export type Outfit = 'thobe' | 'uniform' | 'coverall' | 'casual';

export interface AdultLook {
  kind: Exclude<CharacterKind, 'boy'>;
  height: number;
  skin: number;
  outfit: Outfit;
  /** Main garment color (thobe, uniform shirt, coverall, polo). */
  cloth: string;
  /** Trousers color (uniform / casual); thobe uses the thobe color. */
  trousers: string;
  headwear: Headwear;
  /** Igal (black cord) over the ghutra/shemagh. */
  igal: boolean;
  capColor: string;
  vest: null | { color: string; reflective: boolean; cross: boolean };
  beard: 'full' | 'short' | 'mustache' | 'stubble' | 'none';
  hair: string;
  sunglasses: boolean;
  glasses: string | null;
  shoes: string;
  belly: number;
  badge: boolean;
}

const BEARDS: AdultLook['beard'][] = ['full', 'short', 'mustache', 'short', 'full'];

export function adultLook(kind: Exclude<CharacterKind, 'boy'>, id: string): AdultLook {
  const r = rng(hashString(id) ^ 0xa11ce);
  const skin = 1 + Math.floor(r() * 3); // 1..3
  const beard = BEARDS[Math.floor(r() * BEARDS.length)];
  const base: AdultLook = {
    kind,
    height: 1.75,
    skin,
    outfit: 'thobe',
    cloth: '#F8F7F2',
    trousers: '#F8F7F2',
    headwear: 'ghutra',
    igal: true,
    capColor: '#1E2A3B',
    vest: null,
    beard,
    hair: HAIR_COLORS.black,
    sunglasses: false,
    glasses: null,
    shoes: '#3B2A20',
    belly: r() * 0.6,
    badge: false,
  };
  switch (kind) {
    case 'teacher':
      return { ...base, glasses: r() < 0.5 ? '#3B2A20' : null, beard: beard === 'mustache' ? 'short' : beard };
    case 'counselor':
      return { ...base, headwear: 'none', igal: false, vest: { color: '#9CD3F2', reflective: false, cross: true }, glasses: '#1E2A3B', beard: 'short' };
    case 'guard':
      return { ...base, outfit: 'uniform', cloth: '#2B3A55', trousers: '#232C3F', headwear: 'cap', igal: false, capColor: '#1D2738', beard: 'mustache', shoes: '#16181D', badge: true, height: 1.8, belly: 0.4 + r() * 0.4 };
    case 'organizer':
      return { ...base, vest: { color: '#F7D21E', reflective: true, cross: false }, igal: true };
    case 'cleaner':
      return { ...base, outfit: 'coverall', cloth: '#2F6FB8', trousers: '#2F6FB8', headwear: 'cap', igal: false, capColor: '#2A5E9C', beard: 'mustache', shoes: '#2A2D35', height: 1.7, belly: 0.1 };
    case 'stranger':
      return { ...base, outfit: 'casual', cloth: '#8FB2C6', trousers: '#CDB68E', headwear: 'cap', igal: false, capColor: '#5E6B57', beard: 'stubble', sunglasses: true, shoes: '#6B5440', height: 1.76, belly: 0.2 };
    case 'parent':
      return { ...base, headwear: 'shemagh', igal: true, beard: beard === 'mustache' ? 'full' : beard, height: 1.74 };
  }
}

/* ----------------------------------------------------------------- unified */

export type Look = { adult: false; boy: BoyLook; key: string } | { adult: true; a: AdultLook; key: string };

export function lookFor(kind: CharacterKind, id: string, spec?: Partial<BoySpec>): Look {
  if (kind === 'boy') {
    const boy = boyLook(id, spec ?? {});
    return { adult: false, boy, key: 'boy|' + JSON.stringify(boy) };
  }
  const a = adultLook(kind, id);
  return { adult: true, a, key: 'adult|' + JSON.stringify(a) };
}

/** Per-person 0..1 random used for animation phase offsets. */
export function seedUnit(id: string): number {
  return (hashString(id + '#anim') % 10007) / 10007;
}
