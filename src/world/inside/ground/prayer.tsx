/**
 * prayer_room (المصلى) — 10 x 10 m, height 3.6. Local frame x -5..5, z -5..5.
 * Door in the south wall (east side), shoe racks beside it, green carpet with prayer rows facing the
 * qibla niche on the north wall, Quran shelves on the west wall, soft warm light, sheer-curtained
 * windows on the east wall. Landmarks: PRAYER in landmarks.ts, docs/sets/ground.md.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { PAL, mat, canvasTexture, glow } from '../../kit';
import { Batch, BatchMeshes, once, rand } from './batch';
import { buildShell, CeilingPanels, Door, ExitSign, AlarmStrobe, WindowViews, onWall, pushWall, useRoomFlags } from './shell';
import { makeAtlas, text, fillRR, strokeRR, circle, star, drawClock, type Draw } from './paint';
import { acUnit, fanMount, plant, poster, shadowRect, shadowRound, wallClock, METAL } from './furniture';
import { PRAYER } from './landmarks';

const SIZE: [number, number] = [10, 10];
const H = 3.6;
const GREEN = '#2E9E6A';
const GOLD = '#E3B341';

const carpetTex = () =>
  canvasTexture('prayer:carpet', 1024, 896, (ctx, w, h) => {
    ctx.fillStyle = '#2F8F63';
    ctx.fillRect(0, 0, w, h);
    const cols = 10;
    const rows = 5;
    const cw = w / cols;
    const ch = h / rows;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x = c * cw + cw * 0.12;
        const y = r * ch + ch * 0.08;
        const ww = cw * 0.76;
        const hh = ch * 0.84;
        ctx.fillStyle = '#3BA774';
        ctx.beginPath();
        ctx.moveTo(x, y + hh);
        ctx.lineTo(x, y + ww * 0.55);
        ctx.quadraticCurveTo(x, y, x + ww / 2, y);
        ctx.quadraticCurveTo(x + ww, y, x + ww, y + ww * 0.55);
        ctx.lineTo(x + ww, y + hh);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#D6EFD9';
        ctx.lineWidth = 4;
        ctx.stroke();
        circle(ctx, x + ww / 2, y + hh * 0.38, ww * 0.1, '#D6EFD9');
      }
    // border
    ctx.strokeStyle = '#E8D9A8';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, w - 14, h - 14);
  });

const drawMihrab: Draw = (ctx, w, h) => {
  fillRR(ctx, 0, 0, w, h, 24, '#F4E7C3');
  ctx.fillStyle = '#1F7A55';
  ctx.beginPath();
  ctx.moveTo(w * 0.14, h);
  ctx.lineTo(w * 0.14, h * 0.36);
  ctx.quadraticCurveTo(w * 0.14, h * 0.05, w / 2, h * 0.05);
  ctx.quadraticCurveTo(w * 0.86, h * 0.05, w * 0.86, h * 0.36);
  ctx.lineTo(w * 0.86, h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.fillStyle = '#2E9E6A';
  ctx.beginPath();
  ctx.moveTo(w * 0.24, h);
  ctx.lineTo(w * 0.24, h * 0.38);
  ctx.quadraticCurveTo(w * 0.24, h * 0.15, w / 2, h * 0.15);
  ctx.quadraticCurveTo(w * 0.76, h * 0.15, w * 0.76, h * 0.38);
  ctx.lineTo(w * 0.76, h);
  ctx.closePath();
  ctx.fill();
  star(ctx, w / 2, h * 0.34, w * 0.1, GOLD);
  circle(ctx, w / 2, h * 0.34, w * 0.045, '#1F7A55');
};

const drawQiblaSign: Draw = (ctx, w, h) => {
  fillRR(ctx, 0, 0, w, h, h * 0.3, '#1F7A55');
  strokeRR(ctx, 6, 6, w - 12, h - 12, h * 0.26, GOLD, 5);
  // arrow pointing up (toward the wall)
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(h * 0.55, h * 0.18);
  ctx.lineTo(h * 0.8, h * 0.5);
  ctx.lineTo(h * 0.62, h * 0.5);
  ctx.lineTo(h * 0.62, h * 0.82);
  ctx.lineTo(h * 0.48, h * 0.82);
  ctx.lineTo(h * 0.48, h * 0.5);
  ctx.lineTo(h * 0.3, h * 0.5);
  ctx.closePath();
  ctx.fill();
  text(ctx, 'القبلة', w * 0.66, h * 0.54, h * 0.52, '#FFFFFF', w * 0.5);
};

const drawShoes: Draw = (ctx, w, h) => {
  fillRR(ctx, 0, 0, w, h, h * 0.3, '#FFFFFF');
  strokeRR(ctx, 5, 5, w - 10, h - 10, h * 0.26, GREEN, 5);
  for (const dx of [0.12, 0.26]) {
    ctx.fillStyle = '#2D8CFF';
    ctx.beginPath();
    ctx.ellipse(h * (0.5 + dx * 2.4), h * 0.55, h * 0.16, h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  text(ctx, 'الأحذية', w * 0.64, h * 0.54, h * 0.5, GREEN, w * 0.5);
};

const drawRehal: Draw = (ctx, w, h) => {
  fillRR(ctx, 0, 0, w, h, 14, '#1F7A55');
  strokeRR(ctx, 10, 10, w - 20, h - 20, 10, GOLD, 5);
  star(ctx, w / 2, h * 0.4, w * 0.2, GOLD);
  circle(ctx, w / 2, h * 0.4, w * 0.09, '#1F7A55');
};

const atlas = once(() =>
  makeAtlas('prayer', 1024, [
    { name: 'mihrab', w: 360, h: 520, bg: '#F4E7C3', draw: drawMihrab },
    { name: 'qibla', w: 420, h: 130, bg: '#1F7A55', draw: drawQiblaSign },
    { name: 'shoes', w: 420, h: 130, bg: '#FFFFFF', draw: drawShoes },
    { name: 'cover', w: 128, h: 170, bg: '#1F7A55', draw: drawRehal },
    { name: 'clock', w: 200, h: 200, bg: PAL.ink, draw: drawClock },
  ]),
);

const BOOKS = ['#1F7A55', '#2E9E6A', '#E3B341', '#F4E7C3', '#2D6FB5', '#8B5E34', '#1F7A55'];

const build = once(() => {
  const A = atlas();
  const b = new Batch();
  const [W, D] = SIZE;
  const wood = '#B98A5C';
  const shell = buildShell(b, {
    size: SIZE,
    height: H,
    wall: '#F6EFDF',
    low: '#D3E8D6',
    lowHeight: 1.0,
    floor: mat('#E7DDC8', { rough: 0.7 }),
    ceiling: '#FBF6EA',
    skirting: '#C9B58F',
    openings: [
      { wall: 's', at: PRAYER.doorX, width: 1.1, height: 2.2, kind: 'door' },
      { wall: 'e', at: -2.2, width: 1.5, height: 1.7, sill: 0.9, kind: 'window', view: 'yard' },
      { wall: 'e', at: 2.2, width: 1.5, height: 1.7, sill: 0.9, kind: 'window', view: 'yard' },
    ],
    panels: [
      [-2.4, -2.4],
      [2.4, -2.4],
      [-2.4, 1.6],
      [2.4, 1.6],
    ],
    panelSize: [1.1, 0.5],
  });

  /* --- carpet --- */
  const [cx0, cx1, cz0, cz1] = PRAYER.carpet;
  const cm = mat('#FFFFFF', { map: carpetTex(), rough: 1 });
  b.floorPlane([(cx0 + cx1) / 2, 0.012, (cz0 + cz1) / 2], [cx1 - cx0, cz1 - cz0], cm);
  b.rbox([(cx0 + cx1) / 2, 0.005, (cz0 + cz1) / 2], [cx1 - cx0 + 0.08, 0.01, cz1 - cz0 + 0.08], '#2A7F59');

  /* --- qibla niche on the north wall --- */
  {
    const f = onWall('n', PRAYER.qibla[0], 1.4, 0, SIZE);
    b.push(f.p, f.rotY);
    b.rbox([0, 0.0, 0.05], [1.5, 2.55, 0.1], '#E6D3A3');
    b.plane([0, 0, 0.102], [1.3, 2.35], A.mat, 0, A.rect('mihrab'));
    b.pop();
    const s = onWall('n', PRAYER.qibla[0], 3.0, 0.01, SIZE);
    poster(b, s.p, s.rotY, 1.2, 0.37, A.mat, A.rect('qibla'));
    // lanterns either side of the niche (soft light)
    for (const x of [-1.5, 1.5]) {
      const l = onWall('n', x, 2.2, 0.0, SIZE);
      b.push(l.p, l.rotY);
      b.cyl8([0, 0.35, 0.18], [0.02, 0.5, 0.02], '#C9B58F');
      b.cyl([0, 0.0, 0.18], [0.2, 0.34, 0.2], glow('#FFD98A', 1.1));
      b.cyl([0, 0.2, 0.18], [0.24, 0.05, 0.24], GOLD);
      b.cyl([0, -0.2, 0.18], [0.14, 0.05, 0.14], GOLD);
      b.pop();
    }
  }

  /* --- Quran shelves on the west wall (floor-to-1.9 m wooden units) --- */
  PRAYER.shelves.forEach((z, k) => {
    pushWall(b, 'w', z, 0, 0, SIZE);
    const w = 2.2;
    const h = 1.9;
    const d = 0.34;
    b.box([0, h / 2, 0.02], [w, h, 0.02], '#8F6840');
    b.box([-w / 2 + 0.02, h / 2, d / 2], [0.04, h, d], wood);
    b.box([w / 2 - 0.02, h / 2, d / 2], [0.04, h, d], wood);
    b.box([0, h - 0.02, d / 2], [w, 0.04, d], wood);
    b.box([0, 0.06, d / 2], [w, 0.12, d], wood);
    for (let i = 0; i < 5; i++) {
      const y = 0.12 + i * 0.35;
      if (i) b.box([0, y, d / 2], [w - 0.06, 0.03, d - 0.02], wood);
      let x = -w / 2 + 0.07;
      let j = 0;
      while (x < w / 2 - 0.12) {
        const bw = 0.045 + rand(k * 50 + i * 9 + j) * 0.04;
        const bh = 0.24 + rand(k * 20 + i * 4 + j * 3) * 0.06;
        b.box([x + bw / 2, y + 0.015 + bh / 2, d / 2 + 0.01], [bw, bh, 0.22], BOOKS[(j + i + k) % BOOKS.length]);
        if (j % 3 === 0) b.box([x + bw / 2, y + 0.015 + bh * 0.62, d / 2 + 0.121], [bw * 0.7, 0.025, 0.004], GOLD);
        x += bw + 0.004;
        j++;
        if (i === 4 && j > 12) break;
      }
    }
    shadowRect(b, 0, d / 2, w, d);
    b.pop();
  });
  // rehals (Quran stands) with open Qurans on low rows in the carpet front corner
  for (const [x, z] of [[-3.6, -4.45], [3.6, -4.45]] as [number, number][]) {
    b.push([x, 0, z], 0);
    b.rbox([0, 0.5, 0], [0.5, 0.04, 0.34], '#8B5E34', [-0.35, 0, 0]);
    b.rbox([0, 0.55, 0.01], [0.4, 0.03, 0.26], '#F4EAD0', [-0.35, 0, 0]);
    b.box([0, 0.3, -0.04], [0.04, 0.5, 0.04], '#8B5E34');
    b.box([0, 0.02, 0], [0.34, 0.04, 0.3], '#8B5E34');
    b.pop();
  }

  /* --- shoe racks beside the door (south wall) --- */
  PRAYER.shoeRacks.forEach(([x], k) => {
    pushWall(b, 's', x, 0, 0.0, SIZE);
    const w = 1.2;
    const d = 0.32;
    b.box([-w / 2 + 0.02, 0.5, d / 2], [0.04, 1.0, d], '#B98A5C');
    b.box([w / 2 - 0.02, 0.5, d / 2], [0.04, 1.0, d], '#B98A5C');
    for (let i = 0; i < 4; i++) {
      const y = 0.08 + i * 0.3;
      b.box([0, y, d / 2], [w, 0.03, d], '#B98A5C');
      for (let j = 0; j < 5; j++) {
        if (rand(k * 40 + i * 5 + j) < 0.28) continue;
        const sx = -w / 2 + 0.14 + j * 0.23;
        const col = ['#2D8CFF', '#FF8A3D', '#22B573', '#F0476B', '#F2F2F2', '#444B55'][(i + j + k * 2) % 6];
        for (const dx of [-0.045, 0.045]) b.rbox([sx + dx, y + 0.06, d / 2 + 0.02], [0.08, 0.1, 0.22], col);
      }
    }
    b.box([0, 0.5, 0.012], [w, 1.0, 0.01], '#9C7348');
    b.pop();
  });
  {
    const f = onWall('s', PRAYER.shoeRacks[0][0] - 0.2, 1.45, 0.01, SIZE);
    poster(b, f.p, f.rotY, 1.15, 0.36, A.mat, A.rect('shoes'));
  }
  // low bench by the door to sit while taking shoes off
  pushWall(b, 's', PRAYER.doorX - 1.6, 0, 0.25, SIZE);
  b.rbox([0, 0.4, 0], [1.1, 0.06, 0.34], '#B98A5C');
  for (const x of [-0.45, 0.45]) b.box([x, 0.2, 0], [0.06, 0.4, 0.28], PAL.darkMetal);
  b.pop();

  /* --- curtains and window blinds on the east wall --- */
  for (const z of [-2.2, 2.2]) {
    const f = onWall('e', z, 0, 0, SIZE);
    b.push(f.p, f.rotY);
    b.cyl([0, 2.28, 0.1], [0.04, 2.3, 0.04], '#8B5E34', [0, 0, Math.PI / 2]);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) b.rbox([s * (0.95 - i * 0.07), 1.2, 0.1 + (i % 2) * 0.03], [0.1, 2.2, 0.04], '#F2EBDD');
    }
    b.pop();
  }

  /* --- ceiling fans, ac, clock --- */
  for (const [x, z] of [[-2.4, 0.2], [2.4, 0.2]] as [number, number][]) {
    fanMount(b, [x, H, z], 0.4);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.5;
      b.rbox([x + Math.cos(a) * 0.4, H - 0.43, z + Math.sin(a) * 0.4], [0.6, 0.02, 0.13], '#EFE7D3', -a);
    }
  }
  {
    const f = onWall('w', -4.0, 2.7, 0, SIZE);
    acUnit(b, f.p, f.rotY);
    const g = onWall('s', -2.4, 2.4, 0, SIZE);
    wallClock(b, g.p, g.rotY, A.mat, A.rect('clock'), 0.4);
  }
  plant(b, [-4.4, 0, 4.4], 1.1, '#EDE3CF', 3);
  plant(b, [4.4, 0, -4.4], 1.0, '#EDE3CF', 6);
  // pendant lamps for soft light
  for (const [x, z] of [[-1.5, -1.0], [1.5, -1.0], [0, 2.4]] as [number, number][]) {
    b.cyl8([x, H - 0.4, z], [0.012, 0.8, 0.012], '#8B7A55');
    b.add(new THREE.SphereGeometry(0.5, 12, 8), glow('#FFE2A8', 1.0), [x, H - 0.85, z], [0.34, 0.34, 0.34]);
  }
  shadowRound(b, 0, 0, 0.001);
  return { parts: b.build(), shell };
});

export function PrayerRoom() {
  const { parts, shell } = useMemo(build, []);
  const flags = useRoomFlags();
  const door = onWall('s', PRAYER.doorX, 0, 0, SIZE);
  const exit = onWall('s', PRAYER.doorX, 2.55, 0.06, SIZE);
  const strobe = onWall('s', 4.6, 2.3, 0, SIZE);
  return (
    <group>
      <BatchMeshes parts={parts} />
      <WindowViews views={shell.views} />
      <CeilingPanels shell={shell} warm />
      <Door p={door.p} rotY={door.rotY} width={1.1} height={2.2} color="#C99A63" open={flags.door === 'open'} window={false} hinge="right" />
      <ExitSign p={exit.p} rotY={exit.rotY} scale={0.85} />
      <AlarmStrobe p={strobe.p} rotY={strobe.rotY} />
    </group>
  );
}

export { METAL };
