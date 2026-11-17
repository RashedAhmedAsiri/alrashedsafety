/**
 * sports_hall (الصالة الرياضية) — 22 x 14 m, height 8. Local frame x -11..11, z -7..7.
 * Wooden floor with court lines, hoops on both end walls, wall bars and a high scoreboard on the
 * north wall, climbing ropes and a low beam in the north-east, blue foam mats, ball cart, 3-tier
 * bleachers along the south wall, water cooler on the east wall, high windows. Door in the south
 * wall (west). Landmarks: SPORTS in landmarks.ts, docs/sets/ground.md.
 */
import { useMemo } from 'react';
import { PAL, mat, canvasTexture, plankTexture, glow } from '../../kit';
import { Batch, BatchMeshes, XGEO, once, rand } from './batch';
import { buildShell, CeilingPanels, Door, ExitSign, AlarmStrobe, WindowViews, onWall, useRoomFlags } from './shell';
import { makeAtlas, text, fillRR, strokeRR, circle, person, arDigits, drawClock, type Draw } from './paint';
import { CHROME, METAL, waterCooler, wallClock, poster, shadowRect, shadowRound } from './furniture';
import { SPORTS } from './landmarks';

const SIZE: [number, number] = [22, 14];
const H = 8;
const BLUE = '#2D78C8';
const ORANGE = '#FF8A3D';

/** Court markings, transparent, 20 x 12 m at 50 px per metre. */
const courtTex = () =>
  canvasTexture('sports:court', 1000, 600, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const X = (m: number) => (m + 10) * 50;
    const Z = (m: number) => (m + 6) * 50;
    ctx.lineCap = 'butt';
    // painted keys
    for (const s of [-1, 1]) {
      ctx.fillStyle = 'rgba(40,120,215,0.92)';
      ctx.fillRect(Math.min(X(s * 9), X(s * 3.2)), Z(-2.45), Math.abs(X(s * 9) - X(s * 3.2)), 4.9 * 50);
    }
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 6;
    ctx.strokeRect(X(-9), Z(-5), 18 * 50, 10 * 50);
    ctx.beginPath();
    ctx.moveTo(X(0), Z(-5));
    ctx.lineTo(X(0), Z(5));
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(X(0), Z(0), 1.8 * 50, 0, Math.PI * 2);
    ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.strokeRect(Math.min(X(s * 9), X(s * 3.2)), Z(-2.45), Math.abs(X(s * 9) - X(s * 3.2)), 4.9 * 50);
      ctx.beginPath();
      ctx.arc(X(s * 3.2), Z(0), 1.8 * 50, s > 0 ? Math.PI / 2 : -Math.PI / 2, s > 0 ? Math.PI * 1.5 : Math.PI / 2, false);
      ctx.stroke();
      // three-point line
      const cx = s * 8.2;
      const a = Math.asin(4.6 / 6);
      ctx.beginPath();
      ctx.moveTo(X(s * 9), Z(-4.6));
      ctx.lineTo(X(cx - s * 6 * Math.cos(a)), Z(-4.6));
      ctx.arc(X(cx), Z(0), 6 * 50, s > 0 ? Math.PI + a : -a, s > 0 ? Math.PI - a : a, s > 0);
      ctx.lineTo(X(s * 9), Z(4.6));
      ctx.stroke();
    }
    // yellow training lines
    ctx.strokeStyle = 'rgba(247,197,49,0.9)';
    ctx.lineWidth = 4;
    ctx.strokeRect(X(-9.5), Z(-5.5), 19 * 50, 11 * 50);
  });

const drawScore: Draw = (ctx, w, h) => {
  fillRR(ctx, 0, 0, w, h, 18, '#1B2431');
  strokeRR(ctx, 6, 6, w - 12, h - 12, 14, '#4A5870', 4);
  text(ctx, 'المضيف', w * 0.76, h * 0.2, h * 0.17, '#FFFFFF', w * 0.3);
  text(ctx, 'الضيف', w * 0.24, h * 0.2, h * 0.17, '#FFFFFF', w * 0.3);
  text(ctx, arDigits(24), w * 0.76, h * 0.62, h * 0.46, '#FFD24A', w * 0.3, 900);
  text(ctx, arDigits(18), w * 0.24, h * 0.62, h * 0.46, '#FFD24A', w * 0.3, 900);
  text(ctx, arDigits('12:30'), w / 2, h * 0.38, h * 0.2, '#7CF0C8', w * 0.2, 900);
};

const drawBanner: Draw = (ctx, w, h) => {
  fillRR(ctx, 0, 0, w, h, h * 0.3, BLUE);
  strokeRR(ctx, 6, 6, w - 12, h - 12, h * 0.26, '#FFFFFF', 5);
  person(ctx, h * 0.55, h * 0.88, h * 0.66, '#FFFFFF', 'run');
  person(ctx, w - h * 0.55, h * 0.88, h * 0.66, '#FFFFFF', 'stretch');
  text(ctx, 'الصَّالَةُ الرِّيَاضِيَّةُ', w / 2, h * 0.54, h * 0.46, '#FFFFFF', w - h * 2.2);
};

const drawWarm: Draw = (ctx, w, h) => {
  fillRR(ctx, 0, 0, w, h, 16, '#FFFFFF');
  strokeRR(ctx, 6, 6, w - 12, h - 12, 14, ORANGE, 6);
  person(ctx, w / 2, h * 0.68, h * 0.5, ORANGE, 'stretch');
  text(ctx, 'الإحماء', w / 2, h * 0.84, h * 0.13, ORANGE, w - 30);
};

const atlas = once(() =>
  makeAtlas('sports', 2048, [
    { name: 'score', w: 640, h: 360, bg: '#1B2431', draw: drawScore },
    { name: 'banner', w: 1200, h: 190, bg: BLUE, draw: drawBanner },
    { name: 'warm', w: 300, h: 400, bg: '#FFFFFF', draw: drawWarm },
    { name: 'clock', w: 200, h: 200, bg: PAL.ink, draw: drawClock },
  ]),
);

function ball(b: Batch, p: [number, number, number], col: string, r = 0.24) {
  b.add(XGEO.sphereLow, col, p, [r, r, r]);
}

const build = once(() => {
  const A = atlas();
  const b = new Batch();
  const [W, D] = SIZE;
  const floor = mat('#FFFFFF', { map: plankTexture('#E0AE72', [11, 7]), rough: 0.45 });
  const shell = buildShell(b, {
    size: SIZE,
    height: H,
    wall: '#F5EEDD',
    low: '#3A73B8',
    lowHeight: 1.7,
    floor,
    ceiling: '#EDEBE3',
    skirting: '#2B5A93',
    openings: [
      { wall: 's', at: SPORTS.doorX, width: 1.8, height: 2.4, kind: 'door' },
      ...[-7.5, -2.5, 2.5, 7.5].map((x) => ({ wall: 'n' as const, at: x, width: 2.4, height: 1.8, sill: 5.2, kind: 'window' as const, view: 'back' as const })),
      ...[-3.8, 0.2, 4.2, 8.2].map((x) => ({ wall: 's' as const, at: x, width: 2.4, height: 1.8, sill: 5.2, kind: 'window' as const, view: 'yard' as const })),
    ],
    panels: [-8, -4, 0, 4, 8].flatMap((x) => [-3.6, 3.6].map((z) => [x, z] as [number, number])),
    panelSize: [1.8, 0.6],
  });

  /* --- court lines --- */
  b.floorPlane([0, 0.006, 0], [20, 12], mat('#FFFFFF', { map: courtTex(), opacity: 0.999, rough: 0.5 }));

  /* --- steel trusses and duct overhead --- */
  for (const x of [-8, -4, 0, 4, 8]) {
    b.box([x, 7.55, 0], [0.28, 0.4, D], '#9AA4AE');
    b.box([x, 7.2, 0], [0.12, 0.12, D], '#7C8791');
    for (let i = -6; i <= 6; i++) b.box([x, 7.38, i + 0.5], [0.06, 0.3, 0.06], '#7C8791', [0.6, 0, 0]);
  }
  b.cyl([0, 6.9, -4.6], [0.55, W - 1, 0.55], '#D5DADF', [0, 0, Math.PI / 2]);
  for (let x = -9; x <= 9; x += 3) b.box([x, 7.3, -4.6], [0.06, 0.8, 0.06], '#8D969F');

  /* --- hoops on both end walls --- */
  for (const [hx, hy] of SPORTS.hoops) {
    const s = Math.sign(hx);
    b.push([s * 11, 0, 0], s > 0 ? -Math.PI / 2 : Math.PI / 2); // local +Z faces into the hall
    // padded wall support and backboard
    b.rbox([0, 3.4, 0.14], [0.6, 1.4, 0.28], '#1F4F8A');
    b.rbox([0, 3.5, 0.36], [1.9, 1.15, 0.05], mat('#F7FBFF', { opacity: 0.85, rough: 0.1 }));
    b.box([0, 3.5, 0.388], [1.92, 1.17, 0.01], '#FFFFFF');
    b.box([0, 3.5, 0.392], [1.82, 1.07, 0.006], mat('#DCEBFA', { opacity: 0.6, rough: 0.1 }));
    strokeRect(b, 0, 3.32, 0.4, 0.59, 0.45);
    // rim + net
    b.add(XGEO.ring, '#FF6A1A', [0, hy, 0.4 + 0.1 + 0.15], [0.46, 0.46, 0.46], [Math.PI / 2, 0, 0]);
    b.box([0, hy, 0.4 + 0.02], [0.1, 0.04, 0.1], '#FF6A1A');
    b.add(XGEO.shade, '#FFFFFF', [0, hy - 0.2, 0.4 + 0.25], [0.5, 0.38, 0.5], [Math.PI, 0, 0]);
    b.pop();
  }

  /* --- wall bars on the north wall --- */
  {
    const [x0, x1] = SPORTS.wallBars;
    const L = x1 - x0;
    const f = onWall('n', (x0 + x1) / 2, 0, 0.12, SIZE);
    b.push(f.p, f.rotY);
    for (let i = 0; i <= 6; i++) b.box([-L / 2 + (i * L) / 6, 1.3, 0], [0.09, 2.6, 0.06], '#C58E4F');
    for (let r = 0; r < 17; r++) b.cyl([0, 0.2 + r * 0.15, 0.04], [0.035, L, 0.035], '#E8C28A', [0, 0, Math.PI / 2]);
    b.box([0, 2.62, 0.0], [L + 0.1, 0.06, 0.1], '#9C6B34');
    for (let i = 0; i <= 6; i++) b.box([-L / 2 + (i * L) / 6, 1.3, -0.07], [0.04, 2.6, 0.08], '#6E4A24');
    b.pop();
  }

  /* --- scoreboard (high on the north wall, between windows) --- */
  {
    const f = onWall('n', 0, 5.0, 0.0, SIZE);
    b.push(f.p, f.rotY);
    b.rbox([0, 0, 0.1], [2.3, 1.35, 0.2], '#1B2431');
    b.plane([0, 0, 0.202], [2.2, 1.24], A.glow(1.15), 0, A.rect('score'));
    b.pop();
  }
  // banners over the hoops
  for (const x of [-1, 1]) {
    const f = onWall(x < 0 ? 'w' : 'e', 0, 5.7, 0.0, SIZE);
    b.push(f.p, f.rotY);
    b.box([0, 0, 0.008], [4.3, 0.74, 0.016], '#FFFFFF');
    b.plane([0, 0, 0.02], [4.2, 0.66], A.mat, 0, A.rect('banner'));
    b.pop();
  }
  {
    const f = onWall('w', -4.2, 4.2, 0, SIZE);
    wallClock(b, f.p, f.rotY, A.mat, A.rect('clock'), 0.7);
    const g = onWall('s', -6.2, 1.7, 0.01, SIZE);
    poster(b, g.p, g.rotY, 0.8, 1.07, A.mat, A.rect('warm'));
  }

  /* --- climbing ropes + beam --- */
  {
    const [bx] = SPORTS.ropes[0];
    const bz = SPORTS.ropes[0][1];
    b.box([bx + 0.4, 6.6, bz], [2.2, 0.12, 0.12], '#7C8791');
    for (const dx of [-0.6, 1.4]) b.box([bx + dx, 6.6, bz - 0.5], [0.1, 0.1, 1.0], '#7C8791');
    for (const [rx, rz] of SPORTS.ropes) {
      b.cyl([rx, 3.5, rz], [0.055, 6.2, 0.055], '#D9C79D');
      b.ballLow([rx, 0.55, rz], [0.13, 0.13, 0.13], '#C4B07F');
      b.cyl([rx, 6.5, rz], [0.12, 0.1, 0.12], CHROME());
      for (let k = 0; k < 7; k++) b.cyl([rx, 0.9 + k * 0.8, rz], [0.062, 0.04, 0.062], '#B9A574');
    }
    const [mx, mz] = SPORTS.beam;
    b.rbox([mx, 0.3, mz], [3.4, 0.1, 0.11], '#C58E4F');
    b.rbox([mx, 0.3 - 0.0, mz], [3.42, 0.03, 0.12], '#2D78C8');
    for (const dx of [-1.5, 1.5]) {
      b.box([mx + dx, 0.14, mz], [0.1, 0.28, 0.3], '#7C8791');
      b.box([mx + dx, 0.02, mz], [0.1, 0.04, 0.5], '#4A5563');
    }
    b.rbox([mx, 0.025, mz], [3.9, 0.05, 1.0], '#2D8CFF');
    shadowRect(b, mx, mz, 3.8, 0.9);
  }

  /* --- blue foam mats --- */
  {
    const [lx, lz] = SPORTS.landingMat;
    b.rbox([lx, 0.1, lz], [2.2, 0.2, 1.4], '#2D8CFF');
    b.rbox([lx, 0.205, lz], [2.0, 0.01, 1.2], '#1F6FD0');
    for (const dx of [-0.35, 0.35]) b.box([lx + dx, 0.12, lz + 0.71], [0.18, 0.04, 0.01], '#0F4FA0');
    b.rbox([lx + 2.2, 0.05, lz + 0.3], [2.0, 0.1, 1.2], '#4AA3FF');
    shadowRect(b, lx + 0.9, lz + 0.1, 4.2, 1.4);
    const [sx, sz] = SPORTS.matStack;
    for (let i = 0; i < 4; i++) {
      b.rbox([sx + (i % 2) * 0.05, 0.06 + i * 0.12, sz + (i % 3) * 0.03], [2.0, 0.11, 1.0], ['#2D8CFF', '#4AA3FF', '#1F6FD0', '#2D8CFF'][i]);
      b.box([sx + 0.9, 0.06 + i * 0.12, sz + 0.51], [0.18, 0.04, 0.01], '#0F4FA0');
    }
    shadowRect(b, sx, sz, 2.0, 1.0);
    // a mat leaning on the east wall
    b.rbox([10.6, 0.8, -3.0], [0.1, 1.6, 1.0], '#4AA3FF', [0, 0, 0.1]);
  }

  /* --- ball cart --- */
  {
    const [cx, cz] = SPORTS.ballCart;
    b.push([cx, 0, cz], 0.3);
    const wire = METAL();
    for (const [x, z] of [[-0.45, -0.3], [0.45, -0.3], [-0.45, 0.3], [0.45, 0.3]] as [number, number][]) {
      b.cyl8([x, 0.5, z], [0.03, 0.8, 0.03], wire);
      b.cyl([x, 0.06, z], [0.1, 0.1, 0.1], '#2A2F36', [Math.PI / 2, 0, 0]);
    }
    b.box([0, 0.2, 0], [0.96, 0.03, 0.66], wire);
    b.rbox([0, 0.55, 0.3], [0.92, 0.55, 0.02], mat('#FF8A3D', { opacity: 0.35 }));
    b.rbox([0, 0.55, -0.3], [0.92, 0.55, 0.02], mat('#FF8A3D', { opacity: 0.35 }));
    for (const s of [-1, 1]) b.box([s * 0.46, 0.55, 0], [0.02, 0.55, 0.62], wire);
    b.box([0, 0.85, 0.3], [0.96, 0.03, 0.03], wire);
    b.box([0, 0.85, -0.3], [0.96, 0.03, 0.03], wire);
    const cols = ['#FF7A1A', '#F2F2F2', '#E5484D', '#FF7A1A', '#2D8CFF'];
    for (let i = 0; i < 12; i++) ball(b, [-0.35 + (i % 4) * 0.23, 0.36 + Math.floor(i / 4) * 0.2, -0.1 + ((i * 7) % 3) * 0.12], cols[i % cols.length], 0.22);
    b.box([0.5, 0.95, 0], [0.06, 0.3, 0.5], wire, [0, 0, -0.5]);
    b.pop();
    shadowRect(b, cx, cz, 1.1, 0.8, 0.3);
  }

  /* --- bleachers on the south wall (3 tiers) --- */
  for (let t = 0; t < 3; t++) {
    const z = 5.4 + t * 0.6;
    const y = 0.45 + t * 0.45;
    b.rbox([5.2, y, z], [8.4, 0.06, 0.52], '#C58E4F');
    b.box([5.2, y / 2, z + 0.24], [8.4, y, 0.05], '#9C6B34');
    if (t < 2) b.box([5.2, (y + 0.45) / 2 - 0.0, z + 0.3], [8.4, 0.02, 0.01], '#7E5426');
  }
  for (const x of [1.0, 3.4, 5.2, 7.0, 9.4]) b.box([x, 0.67, 6.0], [0.06, 1.34, 1.9], '#7C8791');
  b.box([5.2, 0.0, 6.0], [8.6, 0.02, 2.2], '#E0AE72');
  shadowRect(b, 5.2, 5.9, 8.4, 2.0);
  // railing along the top
  b.cyl8([5.2, 1.9, 5.1], [0.04, 8.4, 0.04], CHROME(), [0, 0, Math.PI / 2]);
  for (const x of [1.0, 5.2, 9.4]) b.cyl8([x, 1.55, 5.1], [0.04, 0.7, 0.04], CHROME());

  /* --- water cooler, bins, benches by the door --- */
  {
    const f = onWall('e', SPORTS.cooler[1], 0, 0.22, SIZE);
    waterCooler(b, f.p, f.rotY);
    const g = onWall('e', SPORTS.cooler[1] + 0.75, 0, 0.22, SIZE);
    b.push(g.p, g.rotY);
    b.cyl([0, 0.3, 0], [0.4, 0.6, 0.4], '#2D8CFF');
    b.cyl([0, 0.61, 0], [0.42, 0.03, 0.42], '#1F6FD0');
    b.pop();
    const p = onWall('e', SPORTS.cooler[1], 1.75, 0.01, SIZE);
    b.push(p.p, p.rotY);
    b.rbox([0, 0, 0.01], [0.5, 0.34, 0.02], '#2D8CFF');
    b.cyl8([0, 0.0, 0.03], [0.1, 0.04, 0.1], '#FFFFFF');
    b.pop();
  }
  {
    const f = onWall('s', SPORTS.doorX + 2.6, 0, 0.25, SIZE);
    b.push(f.p, f.rotY);
    b.rbox([0, 0.4, 0], [1.4, 0.06, 0.36], '#C58E4F');
    for (const x of [-0.55, 0.55]) b.box([x, 0.2, 0], [0.06, 0.4, 0.3], PAL.darkMetal);
    b.pop();
  }
  // cones and a stack of hula hoops at the west wall
  for (let i = 0; i < 5; i++) b.cone([-10.4, 0.2, -4.5 + i * 0.35], [0.28, 0.4, 0.28], ORANGE);
  for (let i = 0; i < 4; i++) b.add(XGEO.ring, ['#E5484D', '#F7C531', '#22B573', '#2D8CFF'][i], [-10.5, 0.9 + i * 0.12, 4.5], [0.8, 0.8, 0.8], [Math.PI / 2, 0, 0]);
  shadowRound(b, 0, 0, 0.001);
  return { parts: b.build(), shell };
});

/** Thin dark outline rectangle on a backboard (shooter's square). Frame is the current one. */
function strokeRect(b: Batch, x: number, y: number, z: number, w: number, h: number) {
  const t = 0.025;
  b.box([x, y + h / 2, z], [w, t, 0.006], '#E5484D');
  b.box([x, y - h / 2, z], [w, t, 0.006], '#E5484D');
  b.box([x - w / 2, y, z], [t, h, 0.006], '#E5484D');
  b.box([x + w / 2, y, z], [t, h, 0.006], '#E5484D');
}

export function SportsHall() {
  const { parts, shell } = useMemo(build, []);
  const flags = useRoomFlags();
  const door = onWall('s', SPORTS.doorX, 0, 0, SIZE);
  const exit = onWall('s', SPORTS.doorX, 2.75, 0.06, SIZE);
  const strobe = onWall('s', -5.2, 3.0, 0, SIZE);
  return (
    <group>
      <BatchMeshes parts={parts} />
      <WindowViews views={shell.views} />
      <CeilingPanels shell={shell} />
      <Door p={door.p} rotY={door.rotY} width={1.8} height={2.4} color="#2D78C8" double open={flags.door !== 'closed' && flags.door === 'open'} />
      <ExitSign p={exit.p} rotY={exit.rotY} scale={1.0} />
      <AlarmStrobe p={strobe.p} rotY={strobe.rotY} />
    </group>
  );
}

export { rand, glow, circle };
