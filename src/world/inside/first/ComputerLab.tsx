/**
 * Computer lab (معمل الحاسب). Local coordinates: x -7..7, z -5..5, floor y 0, ceiling 3.4.
 * Projector screen on the north wall, corridor door on the north wall (east end), windows south.
 * 16 workstations: W1..W5 (west wall), E1..E5 (east wall), IW1..3 / IE1..3 (central island).
 */
import { PAL } from '../../kit';
import type { Batch } from './batch';
import { AlarmBeacon, BatchMesh, ClockHands, StaticRoom, TileFloor, blob, useRoomFlags, type Kit4 } from './common';
import { FirstDoor, ShellWindows, buildShell, type ShellCfg } from './shell';
import { COMPUTER_LAB as L, CL_STATIONS, ROOM_H } from './landmarks';
import { acUnit, fireExtinguisher, pottedPlant, swivelChair, wallClock, METAL } from './furn';
import { drawDryHandsPoster, drawNoFood, drawPosturePoster, drawProjectedSlide, drawScreen, drawSocketPoster } from './draw';

const W = 14;
const D = 10;
const H = ROOM_H;
const DESK = 0.66;
const WOOD = '#E9CDA2';
const CHAIRS = ['#2D8CFF', '#14B8A6', '#2D8CFF', '#8B5CF6', '#14B8A6'];

export const COMPUTER_LAB_CFG: ShellCfg = {
  id: 'cl',
  W,
  D,
  H,
  door: { wall: 'n', x: L.door[0] },
  plaque: { name: 'معمل الحاسب', num: '١٠١', color: '#2D8CFF' },
  windows: L.windows.map((w) => ({ wall: 's' as const, at: w.centre[0], y: w.centre[1], w: w.w, h: w.h })),
  style: { low: '#DCE9F5', rail: '#2D8CFF', lowH: 1.0 },
  lights: [-3, 0.5, 3.8].flatMap((z) => [-4.5, 0, 4.5].map((x) => [x, z] as [number, number])),
};

/* ------------------------------------------------------------------ pieces */

/** Desk strip: top, student-side modesty rail and leg panels. `side` = side the student sits on (+1 east face, -1 west face). */
function deskStrip(b: Batch, axis: 'z', x0: number, x1: number, z0: number, z1: number, side: 1 | -1, legs: number[]) {
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  b.rbox([cx, DESK - 0.016, cz], [x1 - x0, 0.032, z1 - z0], WOOD, 0.012);
  b.box([cx + (side * (x1 - x0)) / 2, DESK - 0.016, cz], [0.012, 0.034, z1 - z0], '#2D8CFF');
  b.rbox([cx + (side * (x1 - x0)) / 2 - side * 0.02, 0.52, cz], [0.02, 0.2, z1 - z0], '#7CC4FA', 0.006);
  for (const z of legs) b.box([cx, 0.31, z], [x1 - x0 - 0.06, 0.62, 0.035], '#B7C0CB');
  void axis;
}

function keyboard(b: Batch) {
  b.rbox([0, 0.01, 0.0], [0.44, 0.02, 0.15], '#F1F4F8', 0.008);
  for (let r = 0; r < 3; r++) b.box([0, 0.022, -0.04 + r * 0.04], [0.4, 0.004, 0.028], '#C3CCD8');
  b.rbox([0.32, 0.012, 0.03], [0.06, 0.024, 0.1], '#F1F4F8', 0.012); // mouse
}

function computerAt(k: Kit4, x: number, z: number, rot: number, kind: number) {
  const { s, scr } = k;
  // monitor with its base standing at (x, DESK, z); +Z of the local frame faces the student
  s.at([x, DESK, z], rot, () => {
    s.cyl([0, 0.01, 0], [0.22, 0.02, 0.22], '#2B2F36');
    s.box([0, 0.1, -0.02], [0.05, 0.2, 0.035], '#2B2F36');
    s.rbox([0, 0.3, 0], [0.56, 0.35, 0.045], '#1C2430', 0.012);
    s.box([0, 0.3, -0.03], [0.2, 0.12, 0.03], '#2B2F36');
  });
  scr.at([x, DESK, z], rot, () => scr.sticker(`cl-screen-${kind % 5}`, [0, 0.3, 0.0235], 0.5, 0.29, (ctx, w, h) => drawScreen(ctx, w, h, kind), 0, 380));
}

function powerStrip(b: Batch, covered = true) {
  // lying on the desk, long axis along local z
  b.rbox([0, 0.02, 0], [0.075, 0.04, 0.34], '#F4F4F0', 0.012);
  for (let i = -1; i <= 1; i++) {
    b.rbox([0, 0.046, i * 0.1], [0.06, 0.016, 0.08], covered ? '#7DD3FC' : '#1E2A3B', 0.006);
    if (covered) b.box([0.024, 0.056, i * 0.1], [0.008, 0.006, 0.07], '#38BDF8');
  }
  b.box([0, 0.03, 0.18], [0.04, 0.02, 0.012], '#E23B3B');
  b.box([0.02, 0.043, 0.15], [0.01, 0.006, 0.01], '#2BE07A');
}

function cpuTower(b: Batch) {
  b.rbox([0, 0.2, 0], [0.19, 0.4, 0.4], '#2B2F36', 0.02);
  b.box([0.0, 0.3, 0.2], [0.14, 0.03, 0.004], '#1C2430');
  b.box([0.04, 0.17, 0.202], [0.015, 0.015, 0.004], '#2BE07A');
  b.box([-0.03, 0.17, 0.202], [0.05, 0.02, 0.004], '#4A5563');
}

function cableTray(b: Batch, len: number) {
  // runs along local x, back at z = 0, +Z out of the wall
  b.box([0, 0, 0.045], [len, 0.07, 0.09], '#C9D2DC');
  b.box([0, 0.036, 0.045], [len, 0.008, 0.07], '#7B8490');
  for (let x = -len / 2 + 0.25; x < len / 2; x += 0.9) b.box([x, 0, 0.092], [0.025, 0.074, 0.006], '#9AA6B2');
  // cables peeking out at the end
  b.box([len / 2 + 0.01, 0.01, 0.05], [0.02, 0.012, 0.03], '#2B2F36');
  b.box([len / 2 + 0.01, -0.012, 0.05], [0.02, 0.012, 0.03], '#E5484D');
}

function teacherDesk(b: Batch) {
  b.rbox([0, 0.72, 0], [1.5, 0.045, 0.74], '#C98F5A', 0.015);
  b.rbox([-0.55, 0.36, 0], [0.38, 0.68, 0.68], '#B57B48', 0.02);
  for (let i = 0; i < 3; i++) {
    b.box([-0.55, 0.16 + i * 0.2, 0.345], [0.32, 0.16, 0.012], '#D9A46B');
    b.box([-0.55, 0.2 + i * 0.2, 0.355], [0.1, 0.02, 0.012], '#6B4A2B');
  }
  b.rbox([0.68, 0.36, 0], [0.06, 0.68, 0.68], '#B57B48', 0.015);
  b.rbox([0.1, 0.38, 0.32], [1.1, 0.6, 0.03], '#B57B48', 0.01);
  b.box([0.1, 0.55, 0.338], [0.9, 0.05, 0.008], '#2D8CFF');
  b.cyl([0.35, 0.8, -0.2], [0.08, 0.12, 0.08], '#2D8CFF');
  b.cyl([0.34, 0.88, -0.2], [0.012, 0.14, 0.012], '#F5C518', [0, 0, 0.15], true);
  b.box([0.18, 0.745, 0.17], [0.22, 0.02, 0.3], '#FFFFFF');
}

function socketPlate(b: Batch) {
  // on the west wall: local frame +Z out of the wall
  b.rbox([0, 0, 0.008], [0.1, 0.1, 0.016], '#F8FAFC', 0.012);
  b.box([-0.02, 0.012, 0.018], [0.012, 0.028, 0.004], '#1E2A3B');
  b.box([0.02, 0.012, 0.018], [0.012, 0.028, 0.004], '#1E2A3B');
  b.cyl([0, -0.025, 0.018], [0.016, 0.004, 0.016], '#1E2A3B', [Math.PI / 2, 0, 0], true);
}

/* ------------------------------------------------------------------ static build */

function buildLab(k: Kit4) {
  const { s, g, e, scr } = k;
  buildShell(k, COMPUTER_LAB_CFG);

  // ---- north wall: projector screen, AC, clock, signs, tray, extinguisher
  const sc = L.screen;
  s.box([sc.centre[0], sc.centre[1], -D / 2 + 0.02], [sc.w + 0.2, sc.h + 0.2, 0.04], '#2B2F36');
  s.box([sc.centre[0], sc.centre[1], -D / 2 + 0.042], [sc.w + 0.1, sc.h + 0.1, 0.004], '#F4F4F0');
  scr.sticker('cl-slide', [sc.centre[0], sc.centre[1], -D / 2 + 0.046], sc.w, sc.h, drawProjectedSlide, 0, 300);
  s.cyl([0, 2.78, -D / 2 + 0.1], [0.12, sc.w + 0.3, 0.12], '#E3E7EC', [0, 0, Math.PI / 2]);
  s.box([0, 2.7, -D / 2 + 0.07], [sc.w + 0.2, 0.08, 0.05], '#C9D2DC');
  s.at([L.acUnit[0], L.acUnit[1], -D / 2], 0, () => acUnit(s));
  s.at([L.clock[0], L.clock[1], -D / 2], 0, () => wallClock(s, 0.46));
  for (const ns of L.noFoodSigns) {
    const onNorth = Math.abs(ns[2] + D / 2) < 0.1;
    if (onNorth) s.sticker('cl-nofood', [ns[0], ns[1], -D / 2 + 0.012], 0.46, 0.58, drawNoFood, 0, 360);
    else s.sticker('cl-nofood', [-W / 2 + 0.012, ns[1], ns[2]], 0.46, 0.58, drawNoFood, Math.PI / 2, 360);
  }
  s.at([2.2, 0.9, -D / 2], 0, () => fireExtinguisher(s));
  s.sticker('cl-ext-sign', [2.2, 1.65, -D / 2 + 0.012], 0.22, 0.22, (ctx, w, h) => {
    ctx.fillStyle = '#E23B3B';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
    ctx.fillStyle = '#E23B3B';
    ctx.fillRect(w * 0.38, h * 0.2, w * 0.24, h * 0.6);
  }, 0, 300);
  s.at([-3.9, 0.98, -D / 2], 0, () => cableTray(s, 6.0));
  s.at([2.1, 0.98, -D / 2], 0, () => cableTray(s, 5.8));

  // ---- teacher's corner
  const td = L.teacherDesk;
  s.at([td[0], 0, td[2]], 0, () => teacherDesk(s));
  computerAt(k, td[0] + 0.1, td[2] + 0.1, Math.PI, 1);
  s.at([td[0] + 0.1, td[1] + 0.005, td[2] - 0.15], Math.PI, () => keyboard(s));
  s.at([td[0], 0, td[2] - 0.67], Math.PI, () => swivelChair(s, '#2B3A4A'));
  blob(k, td[0], td[2], 1.9, 1.1);
  s.at([-6.1, 0, -4.35], 0, () => pottedPlant(s, 1.2));
  blob(k, -6.1, -4.35, 0.8, 0.8);

  // ---- west + east desk strips and 16 computers
  const legs = [-3.7, -2.6, -1.5, -0.4, 0.7, 1.8];
  deskStrip(s, 'z', -7.0, -6.3, -3.75, 1.95, 1, legs);
  deskStrip(s, 'z', 6.3, 7.0, -3.75, 1.95, -1, legs);
  deskStrip(s, 'z', -0.75, 0.75, -3.75, -0.35, 1, [-3.7, -2.6, -1.5, -0.4]);
  // island: second face + divider
  s.box([-0.75, DESK - 0.016, -2.05], [0.012, 0.034, 3.4], '#2D8CFF');
  s.rbox([-0.73, 0.52, -2.05], [0.02, 0.2, 3.4], '#7CC4FA', 0.006);
  s.rbox([0.73, 0.52, -2.05], [0.02, 0.2, 3.4], '#7CC4FA', 0.006);
  s.box([0, DESK + 0.17, -2.05], [0.03, 0.34, 3.34], '#14B8A6');
  CL_STATIONS.forEach((st, i) => {
    const [kx, , kz] = st.keyboard;
    const faceRot = st.rotY; // student faces this way; the monitor faces back toward the student
    const monRot = faceRot + Math.PI;
    const monX = st.monitor[0];
    computerAt(k, monX, kz, monRot, i);
    s.at([kx, DESK, kz], monRot, () => keyboard(s));
    // chair: the child faces -Z of the chair, so chair rot = student rotY + PI (+ a little wobble)
    s.at([st.seat[0] + (i % 3) * 0.04 * Math.sign(Math.sin(faceRot)), 0, st.seat[2]], monRot + (((i * 7) % 5) - 2) * 0.1, () => swivelChair(s, CHAIRS[i % CHAIRS.length]));
    blob(k, st.seat[0], st.seat[2], 0.7, 0.7);
    // CPU tower under the desk
    const towerX = st.id.startsWith('I') ? (st.id.startsWith('IW') ? -0.5 : 0.5) : st.id.startsWith('W') ? -6.7 : 6.7;
    s.at([towerX, 0, kz + 0.25], monRot, () => cpuTower(s));
  });
  blob(k, -6.6, -0.9, 1.0, 5.8);
  blob(k, 6.6, -0.9, 1.0, 5.8);
  blob(k, 0, -2.05, 1.8, 3.6);

  // ---- power strips with safety covers (desk) + tray drops
  for (const z of [-2.6, -0.4, 1.78]) {
    s.at([-6.9, DESK, z], 0, () => powerStrip(s));
    s.at([6.9, DESK, z], 0, () => powerStrip(s));
    s.box([-6.95, 0.82, z], [0.05, 0.32, 0.05], '#C9D2DC');
    s.box([6.95, 0.82, z], [0.05, 0.32, 0.05], '#C9D2DC');
    s.cyl([-6.9, DESK + 0.0, z + 0.2], [0.012, 0.01, 0.012], '#2B2F36', undefined, true);
  }
  s.at([0, DESK, -3.5], 0, () => powerStrip(s));
  s.at([0, DESK, -0.65], 0, () => powerStrip(s));
  // wall trays on west + east walls
  s.at([-W / 2, L.cableTrayY, -0.9], Math.PI / 2, () => cableTray(s, 6.0));
  s.at([W / 2, L.cableTrayY, -0.9], -Math.PI / 2, () => cableTray(s, 6.0));

  // ---- west wall: uncovered socket, drinks shelf, posters, AC
  const so = L.socket;
  s.at([-W / 2, so[1], so[2]], Math.PI / 2, () => socketPlate(s));
  s.at([-W / 2, 0.38, 4.1], Math.PI / 2, () => {
    // two covered sockets for contrast
    s.rbox([0, 0, 0.008], [0.1, 0.1, 0.016], '#F8FAFC', 0.012);
    s.rbox([0, 0, 0.022], [0.09, 0.09, 0.016], '#7DD3FC', 0.012);
  });
  const ds = L.drinksShelf;
  s.box([ds[0] + 0.07, ds[1] - 0.012, ds[2]], [0.28, 0.025, 0.9], '#C98F5A');
  for (const dz of [-0.4, 0.4]) s.box([ds[0] - 0.05, ds[1] - 0.1, ds[2] + dz], [0.04, 0.17, 0.03], METAL);
  s.rbox([ds[0] + 0.05, ds[1] + 0.1, ds[2] + 0.3], [0.08, 0.2, 0.08], '#2D8CFF', 0.03); // water bottle
  s.cyl([ds[0] + 0.05, ds[1] + 0.22, ds[2] + 0.3], [0.04, 0.04, 0.04], '#F8FAFC');
  s.rbox([ds[0] + 0.05, ds[1] + 0.09, ds[2] + 0.42], [0.075, 0.18, 0.075], '#F0476B', 0.03);
  s.rbox([ds[0] + 0.06, ds[1] + 0.05, ds[2] - 0.35], [0.08, 0.1, 0.06], '#FFAA1F', 0.015);
  s.sticker('cl-socket-poster', [-W / 2 + 0.012, 1.25, so[2]], 0.5, 0.64, drawSocketPoster, Math.PI / 2, 300);
  s.sticker('cl-posture', [-W / 2 + 0.012, 2.15, -1.9], 0.55, 0.69, drawPosturePoster, Math.PI / 2, 300);
  s.sticker('cl-dry', [-W / 2 + 0.012, 2.15, -0.35], 0.55, 0.69, drawDryHandsPoster, Math.PI / 2, 300);
  s.sticker('cl-posture', [W / 2 - 0.012, 2.15, -2.4], 0.55, 0.69, drawPosturePoster, -Math.PI / 2, 300);
  s.sticker('cl-dry', [W / 2 - 0.012, 2.15, -0.9], 0.55, 0.69, drawDryHandsPoster, -Math.PI / 2, 300);
  s.at([-W / 2, 2.95, -1.0], Math.PI / 2, () => acUnit(s));

  // ---- east wall: printer table, storage cupboard
  const pr = L.printer;
  s.rbox([W / 2 - 0.5, 0.37, pr[2]], [0.9, 0.74, 1.2], '#E9CDA2', 0.02);
  s.box([W / 2 - 0.5, 0.38, pr[2] + 0.605], [0.8, 0.5, 0.01], '#B7C0CB');
  s.at([pr[0] + 0.05, pr[1] - 0.02, pr[2]], -Math.PI / 2, () => {
    s.rbox([0, 0.12, 0], [0.5, 0.24, 0.42], '#E9EDF2', 0.03);
    s.rbox([0, 0.25, -0.02], [0.44, 0.03, 0.34], '#C9D2DC', 0.01);
    s.box([0, 0.28, -0.2], [0.4, 0.02, 0.18], '#FFFFFF', [-0.3, 0, 0]);
    s.box([0, 0.14, 0.215], [0.34, 0.06, 0.01], '#1C2430');
    s.box([0.17, 0.2, 0.216], [0.05, 0.03, 0.008], '#3BC9B5');
    s.box([0.14, 0.04, 0.0], [0.04, 0.01, 0.3], '#C9D2DC');
  });
  for (let i = 0; i < 3; i++) s.box([W / 2 - 0.5, pr[1] + 0.04 + i * 0.012, pr[2] + 0.45], [0.3, 0.014, 0.21], '#FFFFFF');
  blob(k, W / 2 - 0.55, pr[2], 1.3, 1.5);
  s.rbox([W / 2 - 0.4, 0.95, 4.65], [0.7, 1.9, 0.6], '#F4EBDD', 0.02);
  s.box([W / 2 - 0.4, 0.95, 4.34], [0.66, 1.84, 0.01], '#DCE9F5');
  for (const dx of [-0.17, 0.17]) s.box([W / 2 - 0.4 + dx * 0.0 - 0.0, 0.95, 4.335], [0.005, 1.8, 0.004], '#B7C0CB');
  s.box([W / 2 - 0.5, 1.0, 4.328], [0.02, 0.2, 0.012], METAL);
  s.box([W / 2 - 0.3, 1.0, 4.328], [0.02, 0.2, 0.012], METAL);
  blob(k, W / 2 - 0.4, 4.6, 0.9, 0.9);

  // ---- south wall: low shelf with headphones/mice bins + plant in the corner
  s.at([-W / 2 + 0.4, 0, 4.7], 0, () => pottedPlant(s, 1.3, '#2D8CFF'));
  blob(k, -W / 2 + 0.4, 4.7, 0.8, 0.8);
  s.rbox([0.0, 0.4, D / 2 - 0.25], [2.4, 0.8, 0.4], '#F4EBDD', 0.02);
  s.rbox([0.0, 0.82, D / 2 - 0.25], [2.5, 0.04, 0.44], '#C98F5A', 0.012);
  const bin = ['#E5484D', '#2D8CFF', '#22B573', '#F5C518', '#8B5CF6', '#FF8A3D'];
  for (let i = 0; i < 6; i++) {
    s.rbox([-1.0 + i * 0.4, 0.5, D / 2 - 0.44], [0.32, 0.26, 0.04], bin[i], 0.015);
    s.box([-1.0 + i * 0.4, 0.5, D / 2 - 0.465], [0.2, 0.05, 0.006], '#FFFFFF');
    s.rbox([-1.0 + i * 0.4, 0.2, D / 2 - 0.44], [0.32, 0.26, 0.04], bin[(i + 3) % 6], 0.015);
  }
  blob(k, 0, D / 2 - 0.3, 2.8, 0.7);

  // ---- projector hanging from the ceiling
  const pj = L.projector;
  g.cyl([pj[0], 3.2, pj[2]], [0.04, 0.4, 0.04], '#C9D2DC');
  g.rbox([pj[0], pj[1] - 0.05, pj[2]], [0.38, 0.12, 0.3], '#F1F4F8', 0.03);
  g.cyl([pj[0], pj[1] - 0.04, pj[2] - 0.17], [0.09, 0.05, 0.09], '#1C2430', [Math.PI / 2, 0, 0]);
  e.box([pj[0] + 0.14, pj[1] - 0.0, pj[2] - 0.151], [0.03, 0.012, 0.004], '#2BE07A');
}

/* ------------------------------------------------------------------ dynamic bits */

/** Juice box: on the shelf by default, on S1's desk with flag juice: 'desk'. */
function Juice() {
  const { flags } = useRoomFlags();
  const onDesk = flags.juice === 'desk';
  const p = onDesk ? L.juiceOnDesk : L.juiceOnShelf;
  return (
    <group position={[p[0], p[1], p[2]]} rotation={[0, onDesk ? 0.4 : Math.PI / 2, 0]}>
      <BatchMesh
        deps={[]}
        build={(b) => {
          b.rbox([0, 0.05, 0], [0.06, 0.1, 0.04], '#FF8A3D', 0.008);
          b.box([0, 0.05, 0.0205], [0.04, 0.04, 0.002], '#FFE680');
          b.cyl([0.012, 0.13, 0], [0.006, 0.07, 0.006], '#E5484D', [0, 0, 0.25], true);
          b.box([0, 0.1, 0], [0.058, 0.004, 0.038], '#FFC27A');
        }}
      />
    </group>
  );
}

/** Tissue box next to S1 and the socket safety cover (flag socketCover). */
function Extras() {
  const { flags } = useRoomFlags();
  const cover = flags.socketCover === true || flags.socketCover === 'true' || flags.socketCover === 'on';
  const t = L.tissues;
  const so = L.socket;
  return (
    <>
      <BatchMesh
        deps={[]}
        build={(b) => {
          b.at([t[0], t[1], t[2]], 0.3, () => {
            b.rbox([0, 0.05, 0], [0.24, 0.1, 0.12], '#FFFFFF', 0.015);
            b.box([0, 0.052, 0], [0.12, 0.103, 0.06], '#7CC4FA');
            b.box([0, 0.1, 0], [0.1, 0.03, 0.01], '#FFFFFF', [0.3, 0, 0.1]);
          });
        }}
      />
      {cover && (
        <BatchMesh
          deps={[]}
          build={(b) => {
            b.at([so[0] + 0.02, so[1], so[2]], Math.PI / 2, () => {
              b.rbox([0, 0, 0.016], [0.115, 0.115, 0.034], '#7DD3FC', 0.016);
              b.box([0, 0, 0.034], [0.085, 0.085, 0.004], '#38BDF8');
              b.box([0, 0.0, 0.037], [0.03, 0.03, 0.003], '#E0F2FE');
            });
          }}
        />
      )}
    </>
  );
}

export function ComputerLab() {
  return (
    <group>
      <TileFloor w={W + 0.4} d={D + 0.4} tile={0.6} base="#E3E8EF" lineColor="#CED5DF" />
      <StaticRoom id="computer_lab" build={buildLab} />
      <FirstDoor cfg={COMPUTER_LAB_CFG} />
      <ShellWindows cfg={COMPUTER_LAB_CFG} />
      <ClockHands p={[L.clock[0], L.clock[1], L.clock[2] + 0.045]} d={0.42} />
      <AlarmBeacon p={[3.95, 2.35, -D / 2]} />
      <Juice />
      <Extras />
    </group>
  );
}

void PAL;
