/**
 * Entrance lobby: 12 x 12 m, height 4. Local x -6..6, z -6..6, floor y = 0.
 * North wall (z -6): school name, trophy cabinet, opening to the corridor (east part).
 * South wall (z +6): glass main doors toward the yard, exit sign, evacuation map, window.
 * West wall: honor board + benches. East wall: notice board, bench, water cooler.
 */
import { PAL } from '../../kit';
import type { Batch } from './batch';
import {
  AlarmBeacon,
  StaticRoom,
  TileFloor,
  WindowView,
  behindDoor,
  blob,
  ceiling,
  lightPanel,
  walls,
  windowFrame,
  type Kit4,
} from './common';
import { alarmButton, bench, emergencyLamp, exitSign, potPlant, waterCooler } from './parts';
import { drawEmblem, drawEvacMap, drawFloorMedallion, drawGeoBand, drawHonorBoard, drawNoticeBoard, drawPoster, fillRR, star, text } from './pictos';
import { LOBBY } from './landmarks';

const W = 12;
const D = 12;
const H = 4;
const SCHOOL = 'مدرسة الراشد';

function trophyCup(b: Batch, x: number, y: number, z: number, s: number, color = '#F2B705') {
  b.cyl([x, y + s * 0.02, z], [s * 0.5, s * 0.04, s * 0.5], '#6B4A2B');
  b.cyl([x, y + s * 0.12, z], [s * 0.12, s * 0.2, s * 0.12], color);
  b.cyl([x, y + s * 0.34, z], [s * 0.42, s * 0.3, s * 0.42], color);
  b.cyl([x, y + s * 0.5, z], [s * 0.46, s * 0.04, s * 0.46], '#FFE08A');
  for (const sx of [-1, 1]) b.torus([x + sx * s * 0.22, y + s * 0.34, z], s * 0.18, color, [0, 0, 0], 0.4);
}

function trophyCabinet(b: Batch, g: Batch) {
  // centre x = 0 at the wall, 2.6 wide, 2.0 high, 0.5 deep, back at z = 0 (facing +Z)
  const w = 2.6;
  const h = 2.05;
  b.box([0, h / 2 + 0.05, 0.02], [w, h, 0.04], '#5A3B22');
  b.rbox([0, 0.2, 0.26], [w + 0.06, 0.4, 0.5], '#8E5B34', 0.02);
  b.box([0, 0.405, 0.26], [w + 0.1, 0.03, 0.54], '#6B4326');
  b.rbox([0, h + 0.07, 0.26], [w + 0.08, 0.1, 0.52], '#8E5B34', 0.02);
  for (const sx of [-1, 1]) b.box([sx * (w / 2 + 0.01), 0.4 + (h - 0.4) / 2 + 0.05, 0.26], [0.08, h - 0.35, 0.5], '#8E5B34');
  b.box([0, 0.4 + (h - 0.4) / 2 + 0.05, 0.05], [w - 0.06, h - 0.4, 0.02], '#3D5A80'); // blue velvet back
  // shelves
  const ys = [0.42, 0.85, 1.28, 1.7];
  ys.forEach((y, i) => {
    b.box([0, y, 0.25], [w - 0.08, 0.03, 0.46], '#B57B48');
    if (i === 3) return;
    const items = i === 0 ? 3 : 5;
    for (let j = 0; j < items; j++) {
      const x = -w / 2 + 0.3 + j * ((w - 0.6) / (items - 1));
      if (i === 0) trophyCup(b, x, y + 0.015, 0.25, 0.8, ['#F2B705', '#D9D9D9', '#C98F5A'][j % 3]);
      else if ((i + j) % 3 === 0) trophyCup(b, x, y + 0.015, 0.25, 0.46, '#F2B705');
      else if ((i + j) % 3 === 1) {
        // medal on a stand
        b.cyl([x, y + 0.02, 0.25], [0.12, 0.02, 0.12], '#6B4A2B');
        b.cyl([x, y + 0.13, 0.25], [0.012, 0.2, 0.012], '#9AA6B2');
        b.disc([x, y + 0.26, 0.255], 0.13, '#F2B705');
        b.disc([x, y + 0.26, 0.256], 0.08, '#FFE08A');
      } else {
        // framed certificate
        b.box([x, y + 0.14, 0.15], [0.28, 0.24, 0.015], '#8E5B34', [-0.12, 0, 0]);
        b.box([x, y + 0.14, 0.16], [0.24, 0.2, 0.012], '#FFF8EC', [-0.12, 0, 0]);
        b.box([x, y + 0.14, 0.168], [0.14, 0.012, 0.006], '#F2B705', [-0.12, 0, 0]);
      }
    }
  });
  // football on the top shelf and a small cup
  b.ball([-0.7, 1.82, 0.25], [0.2, 0.2, 0.2], '#FFFFFF');
  trophyCup(b, 0.4, 1.715, 0.25, 0.55, '#F2B705');
  // glass shine (doors outline)
  g.box([0, 1.2, 0.52], [w - 0.02, 0.012, 0.01], '#E9F5FB');
  g.box([0, 0.43, 0.52], [w - 0.02, 0.012, 0.01], '#E9F5FB');
  for (const x of [-w / 2 + 0.01, 0, w / 2 - 0.01]) g.box([x, 1.24, 0.52], [0.03, 1.6, 0.012], '#E9F5FB');
}

function buildLobby(k: Kit4) {
  const { s, g, e } = k;
  const mo = LOBBY.mainDoors;
  const co = LOBBY.corridorOpening;
  walls(
    s,
    W,
    D,
    H,
    [
      { wall: 's', at: mo[0], width: LOBBY.mainDoorsWidth + 0.2, height: 2.7 },
      { wall: 's', at: -4.2, width: 2.4, height: 1.8, sill: 0.9 },
      { wall: 'n', at: co[0], width: LOBBY.corridorOpeningWidth, height: 2.9 },
    ],
    { low: '#EADFC9', rail: '#C9A227', lowH: 1.1 },
  );
  ceiling(k, W, D, H);
  for (const [p, sz] of [
    [[0, H - 0.04, -D / 2 + 0.03], [W, 0.08, 0.06]],
    [[0, H - 0.04, D / 2 - 0.03], [W, 0.08, 0.06]],
    [[-W / 2 + 0.03, H - 0.04, 0], [0.06, 0.08, D]],
    [[W / 2 - 0.03, H - 0.04, 0], [0.06, 0.08, D]],
  ] as [[number, number, number], [number, number, number]][])
    s.box(p, sz, '#EFE6D6');

  // ---- geometric Saudi band around the walls under the cornice
  s.sticker('band-n', [0, 3.5, -D / 2 + 0.008], W, 0.34, (ctx, w, h) => drawGeoBand(ctx, w, h), 0, 120);
  s.sticker('band-s', [0, 3.5, D / 2 - 0.008], W, 0.34, (ctx, w, h) => drawGeoBand(ctx, w, h), Math.PI, 120);
  s.sticker('band-w', [-W / 2 + 0.008, 3.5, 0], D, 0.34, (ctx, w, h) => drawGeoBand(ctx, w, h), Math.PI / 2, 120);
  s.sticker('band-e', [W / 2 - 0.008, 3.5, 0], D, 0.34, (ctx, w, h) => drawGeoBand(ctx, w, h), -Math.PI / 2, 120);

  // ---- north wall: school name, emblem, trophy cabinet
  const sn = LOBBY.schoolName;
  s.rbox([sn[0], sn[1], -D / 2 + 0.04], [5.5, 0.9, 0.08], '#1F5E8C', 0.04);
  s.sticker(
    'school-name',
    [sn[0], sn[1], -D / 2 + 0.088],
    5.3,
    0.78,
    (ctx, w, h) => {
      fillRR(ctx, 0, 0, w, h, h * 0.2, '#14B8A6');
      fillRR(ctx, h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12, h * 0.16, '#FFFFFF');
      text(ctx, SCHOOL, w / 2, h * 0.54, h * 0.62, '#1F5E8C', 700, w * 0.8);
      star(ctx, h * 0.5, h * 0.5, h * 0.2, '#F7C531', 8, 0.6);
      star(ctx, w - h * 0.5, h * 0.5, h * 0.2, '#F7C531', 8, 0.6);
    },
    0,
    300,
  );
  s.sticker('emblem', [sn[0] - 3.45, sn[1], -D / 2 + 0.01], 0.95, 0.95, drawEmblem, 0, 300);
  s.sticker('emblem2', [sn[0] + 3.35, sn[1], -D / 2 + 0.01], 0.95, 0.95, drawEmblem, 0, 300);
  const tc = LOBBY.trophyCabinet;
  s.at([tc[0], 0, -D / 2], 0, () => g.at([tc[0], 0, -D / 2], 0, () => trophyCabinet(s, g)));
  blob(k, tc[0], -D / 2 + 0.4, 3.2, 1.0);
  // cabinet spot lights are not needed; a small plaque
  s.at([co[0], 0, -D / 2], 0, () => behindDoor(s, LOBBY.corridorOpeningWidth, 2.9, 2.4, '#F0E6D2'));
  exitSign(k, [co[0], 3.05, -D / 2 + 0.03], 0, 0, 0.62);

  // ---- south wall: main doors, window, exit sign, evacuation map, alarm
  s.at([mo[0], 0, D / 2], Math.PI, () => {
    const dw = LOBBY.mainDoorsWidth;
    const dh = 2.6;
    s.box([-dw / 2 - 0.06, dh / 2, 0], [0.12, dh, 0.3], '#7B8794');
    s.box([dw / 2 + 0.06, dh / 2, 0], [0.12, dh, 0.3], '#7B8794');
    s.box([0, dh + 0.06, 0], [dw + 0.24, 0.12, 0.3], '#7B8794');
    s.box([0, dh / 2, 0.0], [0.07, dh, 0.08], '#7B8794');
    for (const sx of [-1, 1]) {
      // leaf frame (glass shows the yard through a view quad)
      s.box([sx * (dw / 4), 0.07, -0.02], [dw / 2 - 0.05, 0.14, 0.06], '#7B8794');
      s.box([sx * (dw / 4), dh - 0.05, -0.02], [dw / 2 - 0.05, 0.1, 0.06], '#7B8794');
      s.box([sx * (dw / 4), 1.05, 0.04], [0.04, 0.55, 0.04], '#C9D1DA');
      s.box([sx * 0.12, 1.05, 0.04], [0.03, 0.8, 0.03], '#C9D1DA');
    }
    s.box([0, 0.35, 0.05], [dw - 0.1, 0.012, 0.01], '#F7C531');
    s.box([0, 1.5, 0.05], [dw - 0.1, 0.012, 0.01], '#F7C531');
    // welcome mat on the floor (inside)
    s.rbox([0, 0.01, -0.9], [dw + 0.4, 0.02, 1.1], '#6B7A8C', 0.01);
    s.rbox([0, 0.022, -0.9], [dw + 0.2, 0.01, 0.9], '#8DA2B8', 0.005);
  });
  s.at([-4.2, 1.8, D / 2], Math.PI, () => windowFrame(s, 2.4, 1.8, 1));
  exitSign(k, [LOBBY.exitSign[0], LOBBY.exitSign[1], D / 2 - 0.03], Math.PI, 0, 1.0);
  const em = LOBBY.evacMap;
  s.box([em[0], em[1], D / 2 - 0.01], [0.56, 0.74, 0.02], '#1FAE5B');
  s.sticker('evac', [em[0], em[1], D / 2 - 0.022], 0.52, 0.7, (ctx, w, h) => drawEvacMap(ctx, w, h, 2), Math.PI, 420);
  alarmButton(k, [4.6, 1.4, D / 2], Math.PI);

  // ---- west wall: honor board + benches
  const hb = LOBBY.honorBoard;
  s.sticker('honor', [-W / 2 + 0.012, hb[1], hb[2]], 2.6, 1.3, drawHonorBoard, Math.PI / 2, 260);
  s.sticker('poster-w1', [-W / 2 + 0.012, 1.75, 2.6], 0.7, 0.92, (ctx, w, h) => drawPoster(ctx, w, h, 1), Math.PI / 2, 260);
  s.sticker('poster-w2', [-W / 2 + 0.012, 1.75, 4.0], 0.7, 0.92, (ctx, w, h) => drawPoster(ctx, w, h, 5), Math.PI / 2, 260);
  // ---- east wall: notice board + bench + water cooler
  const nb = LOBBY.noticeBoard;
  s.sticker('notice', [W / 2 - 0.012, nb[1], nb[2]], 2.4, 1.3, drawNoticeBoard, -Math.PI / 2, 260);
  s.sticker('poster-e1', [W / 2 - 0.012, 1.75, -4.2], 0.7, 0.92, (ctx, w, h) => drawPoster(ctx, w, h, 3), -Math.PI / 2, 260);

  // benches (back to the wall): west wall faces +X (rot pi/2), east wall faces -X (rot -pi/2)
  for (const b of LOBBY.benches) {
    const west = b[0] < 0;
    s.at([b[0] + (west ? -0.2 : 0.2), 0, b[2]], west ? Math.PI / 2 : -Math.PI / 2, () => bench(s, 1.9, '#D9A46B'));
    blob(k, b[0], b[2], 0.9, 2.1);
  }
  const wc = LOBBY.waterCooler;
  s.at([W / 2, 0, wc[2]], -Math.PI / 2, () => waterCooler(s));
  blob(k, W / 2 - 0.3, wc[2], 0.7, 0.7);
  // plants
  const plants: [number, number, number, string][] = [
    [-5.35, -5.35, 1.6, '#E07A3F'],
    [5.4, 5.35, 1.5, '#2D8CFF'],
    [-5.4, 5.4, 1.4, '#F0476B'],
    [1.7, -5.4, 1.2, '#14B8A6'],
  ];
  for (const [x, z, h, c] of plants) {
    s.at([x, 0, z], 0, () => potPlant(s, h, c));
    blob(k, x, z, 0.8, 0.8);
  }

  // ---- floor: border band, medallion, runner to the corridor
  const md = LOBBY.medallion;
  s.sticker('medallion', [md[0], 0.006, md[2]], 3.4, 3.4, drawFloorMedallion, [-Math.PI / 2, 0, 0], 220);
  for (const [x, z, sx, sz] of [
    [0, -D / 2 + 0.55, W - 1.0, 0.12],
    [0, D / 2 - 0.55, W - 1.0, 0.12],
    [-W / 2 + 0.55, 0, 0.12, D - 1.0],
    [W / 2 - 0.55, 0, 0.12, D - 1.0],
  ] as [number, number, number, number][]) {
    s.quad([x, 0.004, z], [sx, sz], '#1F8F86', [-Math.PI / 2, 0, 0]);
  }
  // green guide strip toward the doors
  e.box([0, 0.012, 3.6], [0.1, 0.012, 4.4], '#2BE07A');

  // ---- emergency lamps and ceiling lights
  emergencyLamp(k, [-3.0, 2.9, -D / 2], 0);
  emergencyLamp(k, [-W / 2, 2.9, 3.0], Math.PI / 2);
  for (const x of [-3.6, 0, 3.6]) for (const z of [-3.6, 0, 3.6]) lightPanel(k, x, H, z, 1.4, 0.7);
}

export function Lobby() {
  const mo = LOBBY.mainDoors;
  return (
    <group>
      <TileFloor w={W + 0.4} d={D + 0.4} tile={0.9} base="#F1E9D8" lineColor="#E0D5BE" rough={0.35} />
      <StaticRoom id="lobby" build={buildLobby} />
      <AlarmBeacon p={[4.6, 2.5, D / 2]} rotY={Math.PI} />
      <WindowView p={[mo[0], 1.3, D / 2]} rotY={Math.PI} w={LOBBY.mainDoorsWidth} h={2.6} view="yard" depth={0.6} />
      <WindowView p={[-4.2, 1.8, D / 2]} rotY={Math.PI} w={2.4} h={1.8} view="yard" depth={0.6} />
    </group>
  );
}
