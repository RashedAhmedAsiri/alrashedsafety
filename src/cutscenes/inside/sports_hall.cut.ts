import { cutscene } from '../api';
import type { CutsceneCtx } from '../api';
import { headingTo, shots } from '../framing';
import type { BoySpec, Vec3 } from '../../core/types';
import { bg, slideTo } from './halls.util';

// sports_hall: local origin (-24,0,-66), court x -9..9, z -5..5, bleachers on the south wall (z 5.4+), ball cart (-6.5,5.6),
// landing mat (6.3,-3.6). Rotations: PI/2 faces +X, -PI/2 west, 0 south, PI north.
const SPEC: Record<string, Partial<BoySpec>> = {
  s1: { shirt: '#FF8A3D', striped: false, height: 'medium', skin: 2, hair: 'black', backpack: null },
  s2: { shirt: '#7CC4FA', striped: true, height: 'tall', skin: 3, hair: 'black', backpack: null },
  s3: { shirt: '#E5484D', striped: false, height: 'small', skin: 1, hair: 'brown', backpack: null },
  s4: { shirt: '#F5C518', striped: false, height: 'medium', skin: 4, hair: 'black', backpack: null },
  s5: { shirt: '#9B6BF2', striped: true, height: 'tall', skin: 2, hair: 'brown', backpack: null },
  s6: { shirt: '#3DBE6E', striped: false, height: 'small', skin: 3, hair: 'black', backpack: null },
  s7: { shirt: '#FFFFFF', striped: false, height: 'medium', skin: 1, hair: 'black', backpack: null },
};
const E = Math.PI / 2;
const W = -Math.PI / 2;
const N = Math.PI;
const IDS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'];
// Starting spots: left team west of the centre line, right team east of it.
const START: Record<string, [number, number]> = {
  s1: [1.2, 0.9], s2: [-3.0, -1.5], s3: [-4.0, 2.0], s4: [3.5, -1.8], s5: [4.6, 1.9], s6: [-2.4, 0.6], s7: [3.2, 0.4],
};
const BALLS: [number, number][] = [[-1.5, 2.6], [0.8, -2.2], [2.4, 3.0], [-3.4, -0.8], [4.0, -0.6]];

/** A boy keeps playing: jogs between random-ish spots in his half until aborted. */
let gameGen = 0; // bumping it stops every running play() loop
function play(c: CutsceneCtx, id: string, xr: [number, number], zr: [number, number], seed: number) {
  const gen = gameGen;
  bg(async () => {
    const a = c.actor(id);
    let k = seed;
    while (gen === gameGen) {
      k = (k * 9301 + 49297) % 233280;
      const x = xr[0] + (k / 233280) * (xr[1] - xr[0]);
      k = (k * 9301 + 49297) % 233280;
      const z = zr[0] + (k / 233280) * (zr[1] - zr[0]);
      await a.walkTo(c.at(x, z), { speed: 2.0, clip: 'run' });
      await c.wait(0.15);
    }
  });
}

function ball(c: CutsceneCtx, id: string, p: [number, number]) {
  return c.prop(id, 'ball', { pos: c.at(p[0], p[1]) });
}

/** Restart the game loops. `area` keeps every runner inside one box (x range, z range), e.g. away from a low camera. */
function startGame(c: CutsceneCtx, ids: string[], area?: { xl?: [number, number]; xr?: [number, number]; z?: [number, number] }) {
  gameGen++;
  ids.forEach((id, i) => {
    const left = ['s2', 's3', 's6'].includes(id);
    play(c, id, left ? (area?.xl ?? [-5.5, -1.0]) : (area?.xr ?? [1.0, 5.5]), area?.z ?? [-3.8, 3.8], 11 + i * 37);
  });
}

export default [
  cutscene('sports_hall', 'setup', async (c) => {
    c.setFlag('door', 'open');
    BALLS.forEach(([x, z], i) => c.prop(`b${i + 1}`, 'ball', { pos: c.at(x, z), params: { kind: 'dodge', color: i % 2 ? '#E5484D' : '#2D78C8' } }));
    IDS.forEach((id) => {
      const [x, z] = START[id];
      const left = ['s2', 's3', 's6'].includes(id);
      c.spawn(id, 'boy', { pos: c.at(x, z), rotY: left ? E : W, spec: SPEC[id], clip: 'run' });
    });
    c.spawn('teacher', 'teacher', { pos: c.at(-2.2, 4.7), rotY: N, clip: 'idle' });
    c.robot.place(c.at(5.6, 4.0), N - 0.6); // on the side line, watching
    c.expr('smile');
    // wide from the bleachers side (south) of the court
    await shots.wide(c, c.at(0, -0.5), 0, { dur: 0, zoom: 1.0, height: 2.8 });
  }),

  cutscene('sports_hall', 'before', async (c) => {
    const s1 = c.actor('s1');
    // Before 1 (0-3 s): wide from the bleachers, a dodgeball game, balls roll loose across the court.
    c.sfx('bounce', { loop: true, volume: 0.3 });
    // the others play on the north half only (behind S1), so nobody runs past the low camera of the next shot
    startGame(c, IDS.filter((i) => i !== 's1'), { z: [-3.8, -1.2] });
    s1.walkTo([c.at(0.8, 0.0), c.at(1.6, 1.0)], { speed: 2.0, clip: 'run' });
    ball(c, 'b1', BALLS[0]).moveTo(c.at(-3.0, 0.2), 2.6, 'out');
    ball(c, 'b2', BALLS[1]).moveTo(c.at(2.6, -0.4), 2.4, 'out');
    ball(c, 'b3', BALLS[2]).moveTo(c.at(5.2, 0.2), 2.6, 'out');
    await c.wait(3.0);
    // Before 2 (3-5 s): low tracking at ankle height, S1 runs backwards, his heel lands on a loose ball; Alrashed rolls in.
    s1.walkTo(c.at(1.4, 0.9), { speed: 2.0 });
    await c.wait(0.4);
    s1.face(W);
    const heel = c.prop('heelBall', 'ball', { pos: c.at(3.5, 0.9), params: { kind: 'dodge', color: '#E5484D' } });
    await shots.two(c, c.at(2.4, 0.9), c.at(3.4, 1.9), { heading: 0, zoom: 0.8, height: 1.4, dur: 0 });
    s1.play('run');
    c.robot.walkTo(c.at(4.15, 1.15), { speed: 2.8, clip: 'jog' }); // from the side, not between the camera and S1
    c.sfx('whoosh', { volume: 0.4 });
    c.expr('surprised');
    await slideTo(c, s1, c.at(1.4, 0.9), c.at(3.4, 0.9), 1.0, W);
    s1.play('slip', { dur: 1.4 });
    heel.moveTo(c.at(1.6, 1.6), 0.9, 'out');
    c.sfx('servo');
    await c.wait(0.9);
    c.robot.face(s1.pos());
    c.robot.play('catch', { dur: 1.0 });
    await c.wait(0.5);
    s1.play('idle');
    // Before 3 (5-6.5 s): close on Alrashed, he sets S1 upright and points at the scattered balls.
    await shots.two(c, c.robot, s1, { heading: 0, zoom: 0.65, height: 1.4, dur: 0 });
    c.expr('warning');
    c.sfx('chime', { volume: 0.5 });
    c.robot.face(c.at(0.0, 0.4));
    await c.robot.play('point', { dur: 1.6 });
    // The other boys stop and everyone gathers: boys to the bench, Alrashed to the centre.
    IDS.forEach((id) => c.actor(id).flag('face', 'worried'));
    c.stopSfx('bounce');
    gameGen++;
    // high from the east end, looking west along the bleachers: the runners cross the frame toward the bench and never
    // pass under the camera (a camera on the bleachers looks through their railing)
    await c.cam({ pos: c.at(8.7, 0.6, 2.9), look: c.at(3.2, 3.6, 0.7), fov: 55, dur: 0, ease: 'linear' });
    await Promise.all(
      IDS.map((id, i) => {
        const a = c.actor(id);
        return a.walkTo(c.at(1.8 + i * 1.0, 4.9), { speed: 2.4, clip: 'run' });
      }).concat([c.robot.walkTo(c.at(3.6, 1.4), { speed: 1.8, clip: 'jog' })]),
    );
    IDS.forEach((id, i) => {
      const a = c.actor(id);
      a.place(c.at(1.8 + i * 1.0, 5.4), N);
      a.flag('seatH', 0.45);
      a.flag('seated', true);
      a.play('sit');
      a.flag('face', 'smile');
    });
    c.robot.face(c.at(4.8, 5.0));
    c.robot.flag('turnToCamera', true);
    c.robot.play('idle');
    c.expr('explaining');
    // speech: from the court (north-east), the boys on the bench face the camera, Alrashed at the centre turns to it
    await shots.two(c, c.robot, [c.actor('s1'), c.actor('s7')], { heading: headingTo(c.at(7.0, -3.6), c.at(3.8, 3.4)), zoom: 0.7, height: 1.7, dur: 0 });
  }),

  cutscene('sports_hall', 'during', async (c) => {
    // He points at the loose balls, the mats and the teacher (the camera holds the speech shot).
    const aims: Vec3[] = [c.at(-1.5, 2.6, 0.1), c.at(6.3, -3.6, 0.3), c.at(-2.2, 4.7, 1.0)];
    for (;;) {
      for (const aim of aims) {
        c.robot.face(aim);
        await c.robot.play('point', { dur: 1.8 });
        c.robot.face(c.at(4.8, 5.0));
        await c.robot.play('explain2', { dur: 2.8 });
      }
    }
  }),

  cutscene('sports_hall', 'after', async (c) => {
    c.robot.flag('turnToCamera', false);
    c.robot.lookAt(null);
    c.robot.play('idle');
    // After 1 (0-4 s): top-down, the boys collect every ball into the cart while Alrashed holds it steady.
    await shots.wide(c, c.at(-4.4, 3.6), headingTo(c.at(1.5, 6.4), c.at(-4.4, 3.2)), { dur: 0, zoom: 0.75, height: 2.4 });
    c.expr('happy');
    const spots: [number, number][] = [[-3.2, 3.0], [-4.8, 2.0], [-2.4, 4.4], [-5.4, 3.6], [-3.6, 1.6], [-4.4, 4.9]];
    c.prop('b1', 'ball', { pos: c.at(...spots[0]) });
    c.prop('b2', 'ball', { pos: c.at(...spots[1]) });
    c.prop('b3', 'ball', { pos: c.at(...spots[2]) });
    c.prop('b4', 'ball', { pos: c.at(...spots[3]) });
    c.prop('b5', 'ball', { pos: c.at(...spots[4]) });
    c.prop('heelBall', 'ball', { pos: c.at(0, 0) }).remove();
    c.prop('b6', 'ball', { pos: c.at(...spots[5]), params: { kind: 'dodge', color: '#E5484D' } });
    c.robot.place(c.at(-6.5, 4.5), 0);
    c.robot.flag('reach', 'both');
    const starts: [number, number][] = [[-1.5, 2.6], [-2.2, 0.8], [-1.0, 4.4], [-3.6, 0.2], [-0.6, 1.4], [-2.0, 5.6]];
    // a drop spot each around the east half of the cart (-6.5, 5.6), the first to arrive taking the far (south) ones;
    // `via` steers the south-side ones around the cart instead of through it
    const drop: Record<string, { at: [number, number]; via?: [number, number] }> = {
      s1: { at: [-6.95, 6.4], via: [-5.6, 6.35] },
      s4: { at: [-6.25, 6.42], via: [-5.6, 6.35] },
      s2: { at: [-5.6, 6.2] },
      s5: { at: [-5.5, 5.6] },
      s3: { at: [-5.6, 5.0] },
      s6: { at: [-5.95, 4.62] },
    };
    // the teacher and S7 watch from beside the cart, out of the camera's way
    c.actor('teacher').place(c.at(-8.2, 3.4), E - 0.3);
    ['s2', 's3', 's4', 's5', 's6', 's1'].forEach((id, i) => {
      const a = c.actor(id);
      a.flag('seated', false);
      a.flag('face', 'happy');
      a.place(c.at(...starts[i]), W);
      a.play('idle');
      bg(async () => {
        await a.walkTo(c.at(...spots[i]), { speed: 2.2, clip: 'run' });
        c.prop(`b${i + 1}`, 'ball', { pos: c.at(...spots[i]) }).set({ visible: false });
        a.hold('ball');
        const d = drop[id];
        await a.walkTo(d.via ? [c.at(...d.via), c.at(...d.at)] : [c.at(...d.at)], { speed: 2.2, clip: 'run' });
        a.face(c.at(-6.5, 5.6));
        a.hold(null);
        c.sfx('thud', { volume: 0.5 });
      });
    });
    c.actor('s7').place(c.at(-7.5, 4.9), E + 0.5);
    c.actor('s7').flag('seated', false);
    c.actor('s7').play('idle');
    await c.wait(4.0);
    c.robot.flag('reach', false);
    // After 2 (4-7 s): medium, warm-up circle with arm swings and jumping jacks led by Alrashed.
    await shots.wide(c, c.at(0, 0), 0, { dur: 0, zoom: 0.7, height: 2.4 });
    c.robot.place(c.at(0, 0), 0);
    c.robot.flag('turnToCamera', true);
    IDS.forEach((id, i) => {
      const a = c.actor(id);
      const ang = (i / IDS.length) * Math.PI * 2 + 0.4;
      const p = c.at(Math.cos(ang) * 1.8, Math.sin(ang) * 1.8);
      a.place(p, Math.atan2(-Math.cos(ang), -Math.sin(ang)));
      a.play('stretch', { dur: 1.5 });
    });
    c.sfx('whistle', { volume: 0.6 });
    c.expr('smile');
    c.robot.play('celebrate');
    await c.wait(1.6);
    IDS.forEach((id) => c.actor(id).play('jump'));
    c.sfx('chime', { volume: 0.5 }); // upbeat sting
    await c.wait(1.6);
    c.robot.flag('turnToCamera', false);
    // After 3 (7-9 s): wide pull-back, the game restarts on a clean court; one boy jumps safely onto the blue mat.
    c.robot.play('idle');
    c.expr('proud');
    c.robot.place(c.at(3.4, -1.0), E);
    const t = c.actor('teacher');
    t.place(c.at(8.2, -2.0), W);
    startGame(c, ['s2', 's3', 's4', 's5', 's6', 's7'], { xl: [-6.5, -3.5], xr: [-3.0, -0.5], z: [-3.0, 3.0] }); // west half, behind the camera
    c.sfx('bounce', { loop: true, volume: 0.3 });
    const s1 = c.actor('s1');
    s1.place(c.at(6.3, -1.9), N);
    s1.play('idle');
    await shots.two(c, s1, c.robot, { heading: headingTo(c.at(1.2, 2.8), c.at(5.4, -2.4)), zoom: 0.9, height: 1.6, dur: 0 });
    await s1.walkTo(c.at(6.3, -2.6), { speed: 1.0 });
    s1.play('jump', { dur: 0.9 });
    await c.wait(0.45);
    s1.place(c.at(6.3, -3.4, 0.2), N);
    await c.wait(0.5);
    s1.play('cheer');
    c.sfx('cheer', { volume: 0.6 });
    await c.wait(1.0);
    c.stopSfx('bounce');
  }),
];
