// OWNER: exam worker. Flat pictograms for the exam answer buttons (no text, no external images).
// One entry per question: index 0..2 = option أ/ب/ج for choice questions, card 0..2 for open ones.
import type { ReactNode } from 'react';

const SKIN = '#F5C9A0';
const HAIR = '#3A2A22';
const INK = '#1E2A3B';
const RED = '#F0476B';
const BLUE = '#2D8CFF';
const GREEN = '#22B573';
const AMBER = '#FFAA1F';
const BROWN = '#B07A45';
const GREY = '#8A94A6';

type P = [number, number];
const pts = (a: P[]) => a.map((p) => p.join(',')).join(' ');

function Limb({ p, c, w = 6.5 }: { p: P[]; c: string; w?: number }) {
  return <polyline points={pts(p)} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />;
}

function Head({ x, y, r = 9.5, hair = HAIR, look = 0 }: { x: number; y: number; r?: number; hair?: string; look?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={SKIN} />
      <path d={`M${x - r} ${y - 1} A${r} ${r} 0 0 1 ${x + r} ${y - 1} Q${x} ${y - r * 0.55} ${x - r} ${y - 1}Z`} fill={hair} />
      <circle cx={x - 3.3 + look} cy={y + 1.5} r={1.3} fill={INK} />
      <circle cx={x + 3.3 + look} cy={y + 1.5} r={1.3} fill={INK} />
      <path d={`M${x - 2.6 + look} ${y + 5.2} Q${x + look} ${y + 7} ${x + 2.6 + look} ${y + 5.2}`} fill="none" stroke={INK} strokeWidth={1.2} strokeLinecap="round" />
    </g>
  );
}

/** A standing child (feet at x,y). arms: 'down' | 'wave' | 'up'. */
function Stand({ x, y, s = 1, shirt = BLUE, pants = INK, arms = 'down', hair = HAIR }: { x: number; y: number; s?: number; shirt?: string; pants?: string; arms?: 'down' | 'wave' | 'up'; hair?: string }) {
  const hip: P = [x, y - 20 * s];
  const neck: P = [x, y - 37 * s];
  const armPts: P[][] =
    arms === 'down'
      ? [[[x, y - 34 * s], [x - 9 * s, y - 22 * s]], [[x, y - 34 * s], [x + 9 * s, y - 22 * s]]]
      : arms === 'wave'
        ? [[[x, y - 34 * s], [x - 9 * s, y - 22 * s]], [[x, y - 34 * s], [x + 9 * s, y - 44 * s], [x + 12 * s, y - 54 * s]]]
        : [[[x, y - 34 * s], [x - 9 * s, y - 46 * s]], [[x, y - 34 * s], [x + 9 * s, y - 46 * s]]];
  return (
    <g>
      <Limb p={[hip, [x - 5 * s, y], [x - 7 * s, y]]} c={pants} w={6 * s} />
      <Limb p={[hip, [x + 5 * s, y], [x + 7 * s, y]]} c={pants} w={6 * s} />
      <Limb p={[neck, hip]} c={shirt} w={11 * s} />
      {armPts.map((a, i) => (
        <Limb key={i} p={a} c={shirt} w={5 * s} />
      ))}
      <Head x={x} y={y - 46 * s} r={9.5 * s} hair={hair} />
    </g>
  );
}

/** Adult (teacher): taller, dark suit, hair covered. */
function Teacher({ x, y, wave = false }: { x: number; y: number; wave?: boolean }) {
  return (
    <g>
      <Limb p={[[x, y - 25], [x - 5, y]]} c="#334155" w={7} />
      <Limb p={[[x, y - 25], [x + 5, y]]} c="#334155" w={7} />
      <Limb p={[[x, y - 52], [x, y - 25]]} c="#8B5CF6" w={14} />
      <Limb p={wave ? [[x, y - 48], [x + 12, y - 58], [x + 14, y - 70]] : [[x, y - 48], [x + 11, y - 30]]} c="#8B5CF6" w={6} />
      <Limb p={[[x, y - 48], [x - 11, y - 30]]} c="#8B5CF6" w={6} />
      <circle cx={x} cy={y - 63} r={11} fill={SKIN} />
      <path d={`M${x - 11} ${y - 65} A11 11 0 0 1 ${x + 11} ${y - 65} Q${x} ${y - 70} ${x - 11} ${y - 65}Z`} fill="#4A3A5E" />
      <circle cx={x - 3.5} cy={y - 62} r={1.4} fill={INK} />
      <circle cx={x + 3.5} cy={y - 62} r={1.4} fill={INK} />
    </g>
  );
}

function Door({ x, y, w = 30, h = 56, open = false }: { x: number; y: number; w?: number; h?: number; open?: boolean }) {
  return (
    <g>
      <rect x={x - 3} y={y - 3} width={w + 6} height={h + 3} rx={3} fill="#7C5430" />
      <rect x={x} y={y} width={w} height={h} rx={2} fill={open ? '#2B2F3A' : BROWN} />
      {open ? <path d={`M${x} ${y} L${x + w * 0.45} ${y + 5} L${x + w * 0.45} ${y + h + 3} L${x} ${y + h}Z`} fill={BROWN} /> : null}
      {!open ? <circle cx={x + w - 6} cy={y + h * 0.55} r={2.6} fill="#FFD36A" /> : null}
    </g>
  );
}

function Arrow({ dir }: { dir: 'left' | 'right' }) {
  const s = dir === 'right' ? 1 : -1;
  return (
    <g transform={`translate(60 60) scale(${s} 1)`}>
      <path d="M-34 -13 H8 V-30 L38 0 L8 30 V13 H-34Z" fill={BLUE} stroke="#1B6CD0" strokeWidth={4} strokeLinejoin="round" />
    </g>
  );
}

function ClosedEyes() {
  const eye = (cx: number) => (
    <g>
      <path d={`M${cx - 18} 56 Q${cx} 74 ${cx + 18} 56`} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
      {[-12, 0, 12].map((d) => (
        <line key={d} x1={cx + d} y1={64 + (d === 0 ? 4 : 1)} x2={cx + d * 1.25} y2={72 + (d === 0 ? 4 : 0)} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      ))}
    </g>
  );
  return (
    <g>
      {eye(34)}
      {eye(86)}
    </g>
  );
}

function Backpack() {
  return (
    <g>
      <path d="M28 44 Q28 26 44 26 Q60 26 60 44 V92 Q60 98 54 98 H34 Q28 98 28 92Z" fill={RED} />
      <rect x={33} y={62} width={22} height={22} rx={5} fill="#C8294D" />
      <path d="M36 28 Q44 16 52 28" fill="none" stroke="#C8294D" strokeWidth={4} strokeLinecap="round" />
      <rect x={38} y={70} width={12} height={4} rx={2} fill="#FFD36A" />
    </g>
  );
}

function Desk() {
  return (
    <g>
      <rect x={14} y={54} width={92} height={12} rx={5} fill={BROWN} />
      <rect x={22} y={66} width={7} height={32} rx={3} fill="#7C5430" />
      <rect x={91} y={66} width={7} height={32} rx={3} fill="#7C5430" />
      <rect x={30} y={40} width={22} height={14} rx={2} fill={GREEN} />
      <rect x={34} y={44} width={14} height={2.5} rx={1} fill="#fff" opacity={0.8} />
      <rect x={60} y={46} width={30} height={8} rx={2} fill={AMBER} />
    </g>
  );
}

/** A child sitting on a chair (side view, facing left). lean: 'forward' | 'back' | 'up'. */
function Chair({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 22} y={y - 4} width={34} height={7} rx={3} fill={BROWN} />
      <rect x={x + 6} y={y - 40} width={6} height={40} rx={3} fill="#7C5430" />
      <rect x={x - 20} y={y + 3} width={5} height={24} rx={2} fill="#7C5430" />
      <rect x={x + 5} y={y + 3} width={5} height={24} rx={2} fill="#7C5430" />
    </g>
  );
}

function Drop({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return <path d={`M${x} ${y - 6 * s} Q${x + 5 * s} ${y + 1 * s} ${x} ${y + 5 * s} Q${x - 5 * s} ${y + 1 * s} ${x} ${y - 6 * s}Z`} fill={RED} />;
}

function SitForward() {
  return (
    <g>
      <Chair x={72} y={70} />
      <Limb p={[[64, 66], [40, 66], [38, 94]]} c={INK} w={7} />
      <Limb p={[[66, 66], [62, 44], [50, 42]]} c={BLUE} w={11} />
      <Head x={44} y={46} r={10} look={-2} />
      <Limb p={[[60, 54], [48, 56], [40, 50]]} c={BLUE} w={5} />
      <circle cx={37.5} cy={50} r={3.4} fill={SKIN} />
      <Drop x={34} y={64} s={0.9} />
    </g>
  );
}

function SitBack() {
  return (
    <g>
      <Chair x={72} y={70} />
      <Limb p={[[64, 66], [40, 66], [38, 94]]} c={INK} w={7} />
      <Limb p={[[68, 66], [72, 44], [78, 36]]} c={BLUE} w={11} />
      <g transform="rotate(-48 80 32)">
        <Head x={80} y={30} r={10} />
      </g>
      <Limb p={[[70, 50], [58, 58]]} c={BLUE} w={5} />
      <Drop x={92} y={26} s={0.9} />
      <path d="M95 14 L99 20 M101 22 L106 24" stroke={GREY} strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

function Runner({ x = 58, y = 96, c = AMBER, dir = 1 }: { x?: number; y?: number; c?: string; dir?: 1 | -1 }) {
  const f = (dx: number): number => x + dx * dir;
  return (
    <g>
      <Limb p={[[f(0), y - 24], [f(14), y - 10], [f(10), y]]} c={INK} w={6} />
      <Limb p={[[f(0), y - 24], [f(-12), y - 14], [f(-22), y - 18]]} c={INK} w={6} />
      <Limb p={[[f(4), y - 56], [f(0), y - 24]]} c={c} w={11} />
      <Limb p={[[f(4), y - 50], [f(16), y - 44], [f(22), y - 52]]} c={c} w={5} />
      <Limb p={[[f(4), y - 50], [f(-8), y - 42], [f(-16), y - 48]]} c={c} w={5} />
      <Head x={f(8)} y={y - 66} r={9.5} look={3 * dir} />
      <path d={`M${f(-26)} ${y - 40} h-12 M${f(-26)} ${y - 30} h-16 M${f(-26)} ${y - 20} h-10`} stroke={GREY} strokeWidth={2.5} strokeLinecap="round" opacity={0.7} />
    </g>
  );
}

function Ear() {
  return (
    <g transform="translate(92 38)">
      <path d="M0 -14 C14 -14 18 0 10 10 C6 15 8 20 2 22 C-4 24 -8 18 -6 14" fill="none" stroke={GREEN} strokeWidth={5} strokeLinecap="round" />
      <path d="M-1 -4 C5 -6 8 0 4 4" fill="none" stroke={GREEN} strokeWidth={4} strokeLinecap="round" />
      <path d="M-18 -12 q-5 8 0 16 M-26 -16 q-8 12 0 24" fill="none" stroke={GREEN} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
    </g>
  );
}

function SitCalm() {
  return (
    <g>
      <Chair x={50} y={72} />
      <Limb p={[[44, 68], [70, 68], [72, 96]]} c={INK} w={7} />
      <Limb p={[[44, 66], [44, 40]]} c={BLUE} w={11} />
      <Limb p={[[44, 52], [58, 62], [66, 62]]} c={BLUE} w={5} />
      <Head x={46} y={28} r={10} look={2} />
      <Ear />
    </g>
  );
}

function RunToDoor() {
  return (
    <g>
      <Door x={76} y={36} w={30} h={58} />
      <Runner x={30} y={96} c={AMBER} dir={1} />
    </g>
  );
}

function Switch() {
  return (
    <g>
      <rect x={28} y={14} width={64} height={92} rx={10} fill="#F1F3F7" stroke="#CBD2DC" strokeWidth={3} />
      <rect x={46} y={36} width={28} height={44} rx={6} fill="#DDE2EA" />
      <rect x={50} y={42} width={20} height={20} rx={4} fill="#fff" />
      <circle cx={60} cy={26} r={2.4} fill="#CBD2DC" />
      <circle cx={60} cy={94} r={2.4} fill="#CBD2DC" />
      <path d="M96 78 Q82 66 70 56" fill="none" stroke={SKIN} strokeWidth={10} strokeLinecap="round" />
      <circle cx={68} cy={55} r={7} fill={SKIN} />
    </g>
  );
}

function Cone({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g>
      <rect x={x - 10 * s} y={y - 2 * s} width={20 * s} height={5 * s} rx={2} fill="#E5732A" />
      <path d={`M${x - 8 * s} ${y - 2 * s} L${x - 2.5 * s} ${y - 26 * s} H${x + 2.5 * s} L${x + 8 * s} ${y - 2 * s}Z`} fill={AMBER} />
      <path d={`M${x - 5.4 * s} ${y - 12 * s} H${x + 5.4 * s} L${x + 4 * s} ${y - 17 * s} H${x - 4 * s}Z`} fill="#fff" />
    </g>
  );
}

function Hole({ x, y, w = 40 }: { x: number; y: number; w?: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={w / 2 + 3} ry={8} fill="#B8BFCB" />
      <ellipse cx={x} cy={y + 1} rx={w / 2 - 2} ry={5.5} fill="#1B2230" />
    </g>
  );
}

function AroundCone() {
  return (
    <g>
      <Cone x={60} y={88} s={1.1} />
      <path d="M14 100 Q60 38 108 100" fill="none" stroke={GREEN} strokeWidth={4} strokeDasharray="2 8" strokeLinecap="round" />
      <path d="M100 92 L110 100 L98 103" fill="none" stroke={GREEN} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <Stand x={26} y={84} s={0.8} shirt={GREEN} />
    </g>
  );
}

function PeekIn() {
  return (
    <g>
      <Hole x={62} y={92} w={46} />
      <Limb p={[[34, 96], [32, 74]]} c={INK} w={6} />
      <Limb p={[[34, 98], [44, 88]]} c={INK} w={6} />
      <Limb p={[[36, 70], [40, 50]]} c={AMBER} w={11} />
      <Limb p={[[38, 56], [52, 62]]} c={AMBER} w={5} />
      <Head x={50} y={44} r={10} look={3} />
      <path d="M58 56 L62 72" stroke={GREY} strokeWidth={2.5} strokeDasharray="1 5" strokeLinecap="round" />
    </g>
  );
}

function JumpOver() {
  return (
    <g>
      <Hole x={60} y={98} w={44} />
      <path d="M22 92 Q60 20 98 92" fill="none" stroke={GREY} strokeWidth={2.5} strokeDasharray="1 6" strokeLinecap="round" />
      <Limb p={[[56, 60], [44, 64], [38, 76]]} c={INK} w={6} />
      <Limb p={[[56, 60], [68, 62], [78, 70]]} c={INK} w={6} />
      <Limb p={[[56, 42], [56, 60]]} c={AMBER} w={11} />
      <Limb p={[[56, 46], [44, 34]]} c={AMBER} w={5} />
      <Limb p={[[56, 46], [68, 34]]} c={AMBER} w={5} />
      <Head x={56} y={30} r={9.5} />
    </g>
  );
}

function Car({ children, belt = false }: { children?: ReactNode; belt?: boolean }) {
  void belt;
  return (
    <g>
      <path d="M8 82 Q8 62 26 58 L40 40 Q44 36 50 36 H82 Q90 36 94 44 L102 58 Q112 62 112 74 V86 Q112 90 108 90 H12 Q8 90 8 86Z" fill="#DDE6F2" stroke="#9FB0C8" strokeWidth={3} strokeLinejoin="round" />
      <path d="M44 56 L52 42 H82 L90 56Z" fill="#BFE6FF" opacity={0.9} />
      <circle cx={30} cy={90} r={9} fill={INK} />
      <circle cx={30} cy={90} r={4} fill="#9FB0C8" />
      <circle cx={92} cy={90} r={9} fill={INK} />
      <circle cx={92} cy={90} r={4} fill="#9FB0C8" />
      {children}
    </g>
  );
}

function Seat({ x, hl = false }: { x: number; hl?: boolean }) {
  return (
    <g>
      <path d={`M${x} 82 V54 Q${x} 48 ${x + 6} 48 Q${x + 12} 48 ${x + 12} 54 V76 H${x + 26} V84 H${x}Z`} fill={hl ? '#F0476B' : '#6B7A90'} />
    </g>
  );
}

function CarFront() {
  return (
    <Car>
      <Seat x={30} />
      <Seat x={72} hl />
      <circle cx={92} cy={58} r={5} fill="none" stroke={INK} strokeWidth={2.5} />
      <Head x={80} y={38} r={7} />
      <Limb p={[[80, 46], [80, 62]]} c={BLUE} w={8} />
      <path d="M118 28 l0 0" />
    </Car>
  );
}

function CarBack() {
  return (
    <Car>
      <Seat x={30} hl />
      <Seat x={72} />
      <Head x={42} y={38} r={7} />
      <Limb p={[[42, 46], [42, 62]]} c={BLUE} w={8} />
      <path d="M36 46 L50 66" stroke={AMBER} strokeWidth={4} strokeLinecap="round" />
      <rect x={38} y={64} width={9} height={4} rx={1.5} fill={AMBER} />
    </Car>
  );
}

function CarStand() {
  return (
    <Car>
      <Seat x={30} />
      <Seat x={72} />
      <Stand x={58} y={86} s={0.62} shirt={BLUE} />
    </Car>
  );
}

function Lying({ x, y, c = BLUE }: { x: number; y: number; c?: string }) {
  return (
    <g>
      <Limb p={[[x + 8, y], [x + 34, y]]} c={INK} w={6} />
      <Limb p={[[x - 4, y], [x + 8, y]]} c={c} w={11} />
      <Head x={x - 16} y={y - 1} r={9} />
    </g>
  );
}

function CallTeacher() {
  return (
    <g>
      <line x1={10} y1={98} x2={110} y2={98} stroke="#D9C9A8" strokeWidth={4} strokeLinecap="round" />
      <Lying x={52} y={92} />
      <Teacher x={100} y={96} wave />
      <Stand x={22} y={96} s={0.72} shirt={GREEN} arms="wave" />
      <path d="M24 66 L12 66 M14 62 L10 66 L14 70" stroke={GREY} strokeWidth={2.4} fill="none" strokeLinecap="round" />
    </g>
  );
}

function Crowd() {
  const spots: P[] = [[26, 84], [40, 66], [60, 60], [80, 66], [94, 84], [60, 100]];
  const cols = [BLUE, AMBER, GREEN, RED, '#8B5CF6', '#14B8A6'];
  return (
    <g>
      <Lying x={52} y={86} />
      {spots.map((p, i) => (
        <g key={i}>
          <Limb p={[[p[0], p[1] + 2], [p[0], p[1] + 16]]} c={cols[i]} w={11} />
          <Head x={p[0]} y={p[1] - 6} r={8} />
        </g>
      ))}
    </g>
  );
}

function PourWater() {
  return (
    <g>
      <line x1={10} y1={98} x2={110} y2={98} stroke="#D9C9A8" strokeWidth={4} strokeLinecap="round" />
      <Lying x={46} y={92} />
      <Stand x={92} y={96} s={0.9} shirt={AMBER} />
      <g transform="rotate(-125 70 50)">
        <rect x={62} y={36} width={16} height={30} rx={5} fill="#7CC4FF" stroke="#2D8CFF" strokeWidth={2.5} />
        <rect x={66} y={30} width={8} height={8} rx={2} fill="#2D8CFF" />
      </g>
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${38 + i * 6} ${62 + i * 8} q-2 5 0 8 q2 -3 0 -8Z`} fill="#2D8CFF" />
      ))}
    </g>
  );
}

export const PICTURES: Record<string, (() => ReactNode)[]> = {
  q1_fire_alarm: [
    () => (
      <g>
        <Backpack />
        <Door x={70} y={40} w={34} h={58} open />
      </g>
    ),
    () => (
      <g>
        <line x1={8} y1={98} x2={112} y2={98} stroke="#D9C9A8" strokeWidth={4} strokeLinecap="round" />
        <Teacher x={90} y={96} wave />
        <Stand x={60} y={96} s={0.72} shirt={GREEN} />
        <Stand x={36} y={96} s={0.72} shirt={AMBER} />
        <Stand x={14} y={96} s={0.72} shirt={BLUE} />
      </g>
    ),
    () => <Desk />,
  ],
  q3_look_left: [() => <Arrow dir="right" />, () => <Arrow dir="left" />, () => <ClosedEyes />],
  q4_nosebleed: [() => <SitForward />, () => <SitBack />, () => <Runner />],
  q6_power_outage: [() => <SitCalm />, () => <RunToDoor />, () => <Switch />],
  q7_open_sewer: [() => <AroundCone />, () => <PeekIn />, () => <JumpOver />],
  q9_car_seat: [() => <CarFront />, () => <CarBack />, () => <CarStand />],
  q10_friend_fainted: [() => <CallTeacher />, () => <Crowd />, () => <PourWater />],
};

export function Picture({ qid, index, size = 120 }: { qid: string; index: number; size?: number }) {
  const draw = PICTURES[qid]?.[index];
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" style={{ display: 'block' }}>
      {draw ? draw() : null}
    </svg>
  );
}
