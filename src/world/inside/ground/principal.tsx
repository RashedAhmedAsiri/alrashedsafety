/**
 * principal (مكتب المدير) — 8 x 8 m, height 3.4. Local frame x -4..4, z -4..4.
 * Door in the south wall (east side). Desk on the north side facing the door, two visitor chairs,
 * bookshelf on the west wall, a plain flag stand (no logos), plants, framed certificates, a low
 * tea table with a dallah and cups, window on the east wall. Landmarks: PRINCIPAL in landmarks.ts.
 */
import { useMemo } from 'react';
import { PAL, mat, glow } from '../../kit';
import { Batch, BatchMeshes, XGEO, once } from './batch';
import { buildShell, CeilingPanels, Door, ExitSign, AlarmStrobe, WindowViews, onWall, useRoomFlags } from './shell';
import { makeAtlas, text, fillRR, strokeRR, star, drawClock, type Draw } from './paint';
import { CHROME, METAL, acUnit, bookshelf, officeChair, plant, poster, frame, rug, schoolChair, shadowRect, shadowRound, wallClock, fanMount } from './furniture';
import { PRINCIPAL } from './landmarks';

const SIZE: [number, number] = [8, 8];
const H = 3.4;
const GOLD = '#D9A93B';

const cert =
  (title: string, accent: string): Draw =>
  (ctx, w, h) => {
    fillRR(ctx, 0, 0, w, h, 10, '#FFF9E8');
    strokeRR(ctx, 14, 14, w - 28, h - 28, 8, accent, 8);
    strokeRR(ctx, 28, 28, w - 56, h - 56, 6, GOLD, 3);
    star(ctx, w / 2, h * 0.3, h * 0.12, GOLD);
    text(ctx, title, w / 2, h * 0.52, h * 0.15, accent, w - 90);
    for (let i = 0; i < 3; i++) fillRR(ctx, w * 0.22, h * (0.64 + i * 0.07), w * 0.56 * (i === 2 ? 0.6 : 1), 7, 3, '#D8CDB0');
    ctx.fillStyle = '#C23B3B';
    ctx.beginPath();
    ctx.arc(w * 0.8, h * 0.84, h * 0.06, 0, Math.PI * 2);
    ctx.fill();
  };

const drawPlate: Draw = (ctx, w, h) => {
  fillRR(ctx, 0, 0, w, h, h * 0.2, '#1F3A5F');
  strokeRR(ctx, 4, 4, w - 8, h - 8, h * 0.16, GOLD, 3);
  text(ctx, 'المدير', w / 2, h * 0.54, h * 0.62, '#FFFFFF', w - 24);
};

const drawMap: Draw = (ctx, w, h) => {
  fillRR(ctx, 0, 0, w, h, 8, '#F4F0E4');
  ctx.fillStyle = '#7CC4FA';
  ctx.fillRect(w * 0.05, h * 0.1, w * 0.9, h * 0.8);
  const blobs: [number, number, number, number, string][] = [
    [0.2, 0.35, 0.22, 0.18, '#8FD18A'],
    [0.5, 0.6, 0.26, 0.2, '#EAD59A'],
    [0.72, 0.3, 0.16, 0.2, '#8FD18A'],
  ];
  for (const [x, y, bw, bh, c] of blobs) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(w * x, h * y, w * bw, h * bh, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  strokeRR(ctx, 4, 4, w - 8, h - 8, 6, '#8B5E34', 6);
};

const atlas = once(() =>
  makeAtlas('principal', 1024, [
    { name: 'c1', w: 420, h: 300, bg: '#FFF9E8', draw: cert('شهادة تقدير', '#1F7A55') },
    { name: 'c2', w: 420, h: 300, bg: '#FFF9E8', draw: cert('شهادة شكر', '#2D6FB5') },
    { name: 'c3', w: 420, h: 300, bg: '#FFF9E8', draw: cert('مدرسة آمنة', '#B5532D') },
    { name: 'plate', w: 360, h: 100, bg: '#1F3A5F', draw: drawPlate },
    { name: 'map', w: 360, h: 260, bg: '#F4F0E4', draw: drawMap },
    { name: 'clock', w: 200, h: 200, bg: PAL.ink, draw: drawClock },
  ]),
);

const build = once(() => {
  const A = atlas();
  const b = new Batch();
  const [W, D] = SIZE;
  const wood = '#8A5A33';
  const shell = buildShell(b, {
    size: SIZE,
    height: H,
    wall: '#F3EBDA',
    low: '#6C8F7C',
    lowHeight: 1.0,
    floor: mat('#B88C5E', { rough: 0.6 }),
    ceiling: '#FBF7EE',
    skirting: '#5E4026',
    openings: [
      { wall: 's', at: PRINCIPAL.doorX, width: 1.0, height: 2.2, kind: 'door' },
      { wall: 'e', at: 0.4, width: 1.8, height: 1.5, sill: 0.95, kind: 'window', view: 'yard' },
    ],
    panels: [
      [-1.6, -1.4],
      [1.6, -1.4],
      [-1.6, 2.0],
      [1.6, 2.0],
    ],
    panelSize: [1.2, 0.5],
  });

  // rug under the visitor area
  rug(b, [0, 0, -1.3], 0, 3.4, 2.6, '#9C2F3A', '#6E1F28');
  // wood floor boards
  for (let i = -3; i <= 3; i++) b.floorPlane([i * 1.0, 0.003, 0], [0.012, 8], mat('#9C7248'));

  /* --- desk (faces south) --- */
  const [dx, dz] = PRINCIPAL.desk;
  b.push([dx, 0, dz], 0);
  b.rbox([0, 0.76, 0], [2.2, 0.06, 0.95], '#5E3B1F');
  b.rbox([0, 0.8, 0], [2.0, 0.015, 0.8], '#2F5F4A');
  for (const s of [-1, 1]) {
    b.rbox([s * 0.9, 0.37, 0], [0.4, 0.74, 0.85], wood);
    for (let i = 0; i < 3; i++) {
      b.box([s * 0.9, 0.12 + i * 0.22, 0.43], [0.34, 0.18, 0.012], '#9C6A3E');
      b.box([s * 0.9, 0.12 + i * 0.22, 0.44], [0.12, 0.02, 0.012], CHROME());
    }
  }
  b.box([0, 0.48, -0.38], [1.4, 0.55, 0.03], wood);
  b.rbox([0, 0.42, 0.5], [2.1, 0.06, 0.04], wood);
  // front panel with plate
  b.box([0, 0.44, 0.44], [1.4, 0.58, 0.03], '#7A4F2B');
  b.plane([0, 0.52, 0.459], [0.7, 0.19], A.mat, 0, A.rect('plate'));
  // things on the desk: laptop, lamp, pen cup, papers, phone, plate stand
  b.rbox([-0.45, 0.83, 0.1], [0.38, 0.02, 0.26], '#3A4452');
  b.rbox([-0.45, 0.94, -0.06], [0.38, 0.22, 0.015], '#3A4452', [-0.25, 0, 0]);
  b.box([-0.45, 0.94, -0.05], [0.34, 0.18, 0.004], mat('#8FD7FF', { emissive: '#8FD7FF', emissiveIntensity: 0.6 }), [-0.25, 0, 0]);
  b.cyl([0.65, 0.83, -0.2], [0.18, 0.04, 0.18], '#222B36');
  b.cyl8([0.65, 1.0, -0.2], [0.02, 0.3, 0.02], '#222B36');
  b.add(XGEO.shade, '#2F8F63', [0.65, 1.17, -0.15], [0.26, 0.15, 0.26], [0.4, 0, 0]);
  b.cyl8([0.35, 0.86, -0.15], [0.09, 0.12, 0.09], '#C23B3B');
  for (const x of [0.33, 0.37]) b.cyl8([x, 0.95, -0.15], [0.008, 0.14, 0.008], x > 0.35 ? '#2D6FB5' : '#222B36', [0, 0, x > 0.35 ? -0.2 : 0.2]);
  b.rbox([0.1, 0.815, 0.12], [0.3, 0.012, 0.22], '#FFFFFF', 0.2);
  b.rbox([0.14, 0.827, 0.1], [0.28, 0.012, 0.21], '#F4F1E6', -0.1);
  b.rbox([0.5, 0.82, 0.22], [0.08, 0.03, 0.15], '#222B36', 0.3);
  // name plate on the desk
  b.rbox([0, 0.85, 0.3], [0.36, 0.06, 0.07], '#1F3A5F');
  b.plane([0, 0.855, 0.337], [0.32, 0.05], A.mat, 0, A.rect('plate'));
  shadowRect(b, 0, 0, 2.2, 0.95);
  b.pop();
  officeChair(b, [PRINCIPAL.principalSeat[0], 0, PRINCIPAL.principalSeat[1]], 0, '#3A4452', true);
  for (const [x, z] of PRINCIPAL.visitorChairs) schoolChair(b, [x, 0, z], Math.PI, '#2D6FB5');
  // wooden armchairs look: add arms
  for (const [x, z] of PRINCIPAL.visitorChairs) for (const s of [-1, 1]) b.rbox([x + s * 0.23, 0.55, z], [0.04, 0.04, 0.34], '#1F4F8A');

  /* --- west wall: bookshelf, then a map frame --- */
  {
    const f = onWall('w', PRINCIPAL.bookshelf[1], 0, 0, SIZE);
    bookshelf(b, [f.p[0] + 0.17, 0, f.p[2]], f.rotY, 2.4, 2.1, 5, 11, wood);
    const g = onWall('w', 1.4, 1.75, 0.0, SIZE);
    frame(b, g.p, g.rotY, 0.9, 0.65, A.mat, A.rect('map'), '#7A4F2B');
    const k = onWall('w', 2.9, 0.0, 0.0, SIZE);
    // low cabinet with a globe
    b.push([k.p[0] + 0.2, 0, k.p[2]], k.rotY);
    b.rbox([0, 0.4, 0], [1.2, 0.8, 0.4], wood);
    b.box([0, 0.4, 0.201], [0.02, 0.7, 0.004], '#5E3B1F');
    b.cyl8([0, 0.82, 0], [0.18, 0.04, 0.18], '#5E3B1F');
    b.ball([0, 1.0, 0], [0.28, 0.28, 0.28], '#2D8CFF');
    b.ball([-0.05, 1.02, 0.1], [0.12, 0.1, 0.1], '#7FC24A');
    b.cyl8([0, 1.0, 0], [0.01, 0.34, 0.01], CHROME(), [0, 0, 0.4]);
    shadowRect(b, 0, 0, 1.2, 0.4);
    b.pop();
  }

  /* --- north wall: three framed certificates above the desk, clock --- */
  {
    for (const [x, name] of [[-1.15, 'c1'], [0, 'c2'], [1.15, 'c3']] as [number, string][]) {
      const f = onWall('n', x, 1.95, 0.0, SIZE);
      frame(b, f.p, f.rotY, 0.88, 0.63, A.mat, A.rect(name), '#8A5A33', 0.04);
    }
    const f = onWall('n', -3.0, 2.55, 0, SIZE);
    wallClock(b, f.p, f.rotY, A.mat, A.rect('clock'), 0.38);
    const g = onWall('w', 2.6, 2.6, 0, SIZE);
    acUnit(b, g.p, g.rotY);
  }

  /* --- flag stand in the north-east corner (plain, no logos) --- */
  {
    const [fx, fz] = PRINCIPAL.flagStand;
    b.cyl([fx, 0.03, fz], [0.34, 0.06, 0.34], '#222B36');
    b.cyl8([fx, 1.25, fz], [0.035, 2.5, 0.035], '#C9CED6');
    b.ball([fx, 2.55, fz], [0.08, 0.08, 0.08], GOLD);
    // plain green flag with a white stripe, hanging from a cross bar
    b.cyl8([fx - 0.38, 2.38, fz], [0.02, 0.78, 0.02], '#C9CED6', [0, 0, Math.PI / 2]);
    b.rbox([fx - 0.38, 2.0, fz], [0.7, 0.8, 0.02], '#1F9D5F');
    b.box([fx - 0.38, 1.82, fz + 0.012], [0.62, 0.07, 0.004], '#FFFFFF');
    shadowRound(b, fx, fz, 0.2);
  }

  /* --- plants + tea table --- */
  plant(b, [-3.5, 0, -3.5], 1.25, '#EDE3CF', 3);
  plant(b, [3.5, 0, 3.4 - 0.0], 1.1, '#EDE3CF', 9);
  plant(b, [-3.5, 0, 3.4], 1.0, '#EDE3CF', 12);
  {
    const [tx, tz] = PRINCIPAL.teaTable;
    b.push([tx, 0, tz], 0);
    b.cyl([0, 0.4, 0], [0.7, 0.04, 0.7], '#5E3B1F');
    b.cyl8([0, 0.2, 0], [0.06, 0.4, 0.06], '#3A2A1A');
    b.cyl([0, 0.02, 0], [0.4, 0.04, 0.4], '#3A2A1A');
    // dallah
    b.cyl([-0.1, 0.52, 0], [0.16, 0.2, 0.16], GOLD);
    b.ballLow([-0.1, 0.65, 0], [0.18, 0.12, 0.18], GOLD);
    b.cone([-0.1, 0.72, 0], [0.08, 0.1, 0.08], GOLD);
    b.cyl8([-0.2, 0.62, 0], [0.025, 0.14, 0.025], GOLD, [0, 0, 0.7]);
    b.add(XGEO.arc, GOLD, [-0.0, 0.62, 0], [0.16, 0.16, 0.2], [0, 0, 1.2]);
    // little cups on a tray
    b.cyl([0.12, 0.43, 0.05], [0.34, 0.015, 0.34], '#E9E1D3');
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      b.cyl8([0.12 + Math.cos(a) * 0.09, 0.47, 0.05 + Math.sin(a) * 0.09], [0.05, 0.06, 0.05], '#FFFFFF');
      b.cyl8([0.12 + Math.cos(a) * 0.09, 0.5, 0.05 + Math.sin(a) * 0.09], [0.042, 0.004, 0.042], '#8B4A1D');
    }
    shadowRound(b, 0, 0, 0.4);
    b.pop();
    for (const [x, z, r] of [[2.9, -0.2, 0], [2.9, 1.4, Math.PI]] as [number, number, number][]) {
      b.push([x, 0, z], r);
      b.rbox([0, 0.2, 0], [0.5, 0.4, 0.5], '#7A4F2B');
      b.rbox([0, 0.45, 0], [0.5, 0.1, 0.5], '#2D6FB5');
      b.pop();
    }
  }
  // ceiling fan hub (static)
  fanMount(b, [0, H, 0.6], 0.4);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    b.rbox([Math.cos(a) * 0.4, H - 0.43, 0.6 + Math.sin(a) * 0.4], [0.6, 0.02, 0.13], '#EFE7D3', -a);
  }
  // blinds on the east window
  {
    const f = onWall('e', 0.4, 2.55, 0.0, SIZE);
    b.cyl8([f.p[0] - 0.1, 2.5, f.p[2]], [0.07, 2.0, 0.07], '#F4EEE2', [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 4; i++) b.box([f.p[0] - 0.1, 2.38 - i * 0.045, f.p[2]], [0.02, 0.03, 1.8], '#F4EEE2');
  }
  return { parts: b.build(), shell };
});

export function Principal() {
  const { parts, shell } = useMemo(build, []);
  const flags = useRoomFlags();
  const door = onWall('s', PRINCIPAL.doorX, 0, 0, SIZE);
  const exit = onWall('s', PRINCIPAL.doorX, 2.5, 0.06, SIZE);
  const strobe = onWall('s', 0.8, 2.4, 0, SIZE);
  return (
    <group>
      <BatchMeshes parts={parts} />
      <WindowViews views={shell.views} />
      <CeilingPanels shell={shell} warm />
      <Door p={door.p} rotY={door.rotY} width={1.0} height={2.2} color="#7A4F2B" open={flags.door === 'open'} hinge="right" />
      <ExitSign p={exit.p} rotY={exit.rotY} scale={0.8} />
      <AlarmStrobe p={strobe.p} rotY={strobe.rotY} />
    </group>
  );
}

export { METAL, glow };
