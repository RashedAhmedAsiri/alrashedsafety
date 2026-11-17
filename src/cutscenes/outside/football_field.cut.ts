import { cutscene, type CutsceneCtx } from '../api';
import { shots } from '../framing';
import type { BoySpec, Vec3 } from '../../core/types';

// football_field: six boys, S1 red shirt hangs on the south goal's crossbar (goal line z -13, posts x 36.5/41.5).
const SPECS: Record<string, Partial<BoySpec>> = {
  s1: { shirt: '#E5484D', striped: false, height: 'medium', backpack: null, pants: 'black', hair: 'black', skin: 2 },
  s2: { shirt: '#F5C518', striped: false, height: 'tall', backpack: null, pants: 'blue', hair: 'brown', skin: 1 },
  s3: { shirt: '#7CC4FA', striped: true, height: 'small', backpack: null, pants: 'black', hair: 'black', skin: 3 },
  s4: { shirt: '#3DBE6E', striped: false, height: 'medium', backpack: null, pants: 'blue', hair: 'black', skin: 4 },
  s5: { shirt: '#9B6BF2', striped: true, height: 'tall', backpack: null, pants: 'blue', hair: 'brown', skin: 2 },
  s6: { shirt: '#FFFFFF', striped: false, height: 'small', backpack: null, pants: 'black', hair: 'black', skin: 1 },
};
const IDS = Object.keys(SPECS);
const W = (c: CutsceneCtx, x: number, z: number, dy = 0): Vec3 => c.at(x - c.loc.origin[0], z - c.loc.origin[2], dy);
const GOAL = { x: 39, z: -13 };
/** Camera heading: from the pitch looking south at the goal (the netting behind the goal is the backdrop). */
const SOUTH = Math.PI;
/** Alrashed in the goal mouth facing the pitch (north), the boys in an arc on both sides of him. */
const TALK = { x: 38.9, z: -14.4 };
const ARC = [-1.75, -1.3, -0.8, 0.8, 1.3, 1.75].map((a) => [TALK.x + Math.sin(a) * 1.7, TALK.z - Math.cos(a) * 1.7] as [number, number]);

export default [
  cutscene('football_field', 'setup', async (c) => {
    c.setFlag('schoolPeople', false);
    c.robot.place(W(c, 33.5, -18.5), 1.0);
    c.expr('smile');
    await shots.wide(c, W(c, 37.5, -16.5), SOUTH, { zoom: 1.1, dur: 0 });
  }),

  cutscene('football_field', 'before', async (c) => {
    // ---- Before 1 (0-3 s): wide, six boys play; after a goal S1 swings on the crossbar ----
    c.sfx('cheer', { volume: 0.4 });
    const pos: [number, number][] = [[35, -24], [41, -22], [38, -19], [43, -26], [34, -17], [40, -16.2]];
    IDS.forEach((id, i) => c.spawn(id, 'boy', { pos: W(c, pos[i][0], pos[i][1]), rotY: 2.8 - i * 0.4, spec: SPECS[id], clip: 'idle' }));
    c.spawn('s1', 'boy', { pos: W(c, 38.2, -17.4), rotY: 0, spec: SPECS.s1, clip: 'run' });
    c.prop('ball', 'ball', { pos: W(c, 39, -15.2, 0), params: { kind: 'football' } });
    await shots.wide(c, W(c, 37.5, -16.5), SOUTH, { zoom: 1.1, dur: 0 });
    c.actor('s2').walkTo(W(c, 39.5, -19.5), { speed: 2.2, clip: 'run' });
    c.actor('s3').walkTo(W(c, 36, -20), { speed: 2.2, clip: 'run' });
    c.actor('s4').walkTo(W(c, 41, -19), { speed: 2.2, clip: 'run' });
    c.actor('s1').walkTo(W(c, 38.9, -13.8), { speed: 2.6, clip: 'run' });
    await c.wait(1.4);
    c.sfx('bounce');
    c.sfx('screech', { volume: 0.2 });
    const s1 = c.actor('s1');
    s1.place(W(c, 38.9, GOAL.z - 0.1), 0);
    s1.flag('barY', 2.0);
    s1.play('hangGoal');
    c.expr('surprised');
    await c.wait(1.6);
    // ---- Before 2 (3-5 s): a whistle on his face screen; he jogs over, steadies the post ----
    c.expr('warning');
    c.sfx('whistle');
    c.status('walking');
    await shots.follow(c, c.robot, c.robot.walkTo(W(c, 37.0, -13.8), { speed: 2.2, clip: 'jog' }), { heading: SOUTH, with: [s1], dur: 0.5 });
    c.robot.face(W(c, 36.5, -13));
    c.robot.flag('reach', 'r');
    await c.wait(0.4);
    c.status('explaining');
    // ---- Before 3 (5-6 s): close on S1, he lets go and lands on his feet ----
    await shots.two(c, c.robot, s1, { heading: SOUTH, zoom: 0.7, dur: 0 }); // close enough that the other boys stay behind the camera
    s1.play('idle');
    s1.place(W(c, 38.9, GOAL.z - 0.2), 0);
    c.sfx('thud');
    await c.wait(0.8);
    // Speech: boys gathered around Alrashed in the goal mouth, he taps the goal post
    c.robot.flag('reach', false);
    const gather = [c.robot.walkTo(W(c, TALK.x, TALK.z), { speed: 1.2 }), ...IDS.map((id, i) => c.actor(id).walkTo(W(c, ARC[i][0], ARC[i][1]), { speed: 1.8 }))];
    await Promise.race([Promise.all(gather), c.wait(3.5)]);
    c.robot.face(SOUTH);
    IDS.forEach((id) => c.actor(id).face(W(c, TALK.x, TALK.z)));
    await shots.two(c, c.robot, IDS.map((id) => c.actor(id)), { heading: SOUTH, zoom: 0.85, dur: 0.8 });
  }),

  cutscene('football_field', 'during', async (c) => {
    // tap the goal post while explaining
    c.robot.face(W(c, 36.5, -13));
    c.robot.play('point', { dur: 1.8 });
    await c.wait(2);
  }),

  cutscene('football_field', 'after', async (c) => {
    // ---- After 1 (0-5 s): Alrashed leads a warm-up, the boys copy ----
    c.expr('happy');
    // warm-up: he faces the boys (two rows on the pitch); seen side-on from the west touchline
    c.robot.place(W(c, 38.6, -14.6), SOUTH);
    const rows: [number, number][] = [[36.2, -17.6], [37.6, -17.4], [39.0, -17.6], [40.4, -17.4], [41.8, -17.6], [38.3, -19.0]];
    IDS.forEach((id, i) => {
      const a = c.actor(id);
      a.place(W(c, rows[i][0], rows[i][1]), 0);
    });
    await shots.two(c, c.robot, W(c, 39, -18), { heading: Math.PI / 2, zoom: 1.2, dur: 0 });
    await c.wait(1.0);
    c.sfx('beep');
    c.robot.play('celebrate'); // arm circles
    IDS.forEach((id) => c.actor(id).play('stretch', { dur: 3 }));
    await c.wait(1.6);
    c.sfx('beep');
    c.robot.play('jog'); // knee lifts, in place
    IDS.forEach((id) => c.actor(id).play('run'));
    await c.wait(1.6);
    c.sfx('beep');
    c.robot.play('explain3'); // side stretch
    IDS.forEach((id) => c.actor(id).play('stretch', { dur: 3 }));
    await c.wait(1.2);
    c.robot.play('idle');
    // ---- After 2 (5-8 s): the boys drink in the shade at the bench ----
    // team bench: seat x 27.2..27.5 (faces east), top 0.455, z -31.05..-24.45; shade-roof posts at x 27.95,
    // z -31.4 / -27.75 / -24.1 (nobody sits right in front of the middle post, the knees would go into it)
    const bench: [number, number][] = [-30.6, -29.6, -28.6, -26.9, -25.9, -24.95].map((z) => [27.4, z]);
    IDS.forEach((id, i) => {
      const a = c.actor(id);
      a.flag('seated', true);
      a.flag('seatH', 0.455);
      a.place(W(c, bench[i][0], bench[i][1]), Math.PI / 2);
      a.hold('waterBottle');
      a.play('sit');
    });
    c.robot.place(W(c, 29.2, -23.6), -2.3);
    await shots.two(c, c.robot, W(c, 27.6, -28.5), { heading: -Math.PI / 2 - 0.35, dur: 0 });
    c.expr('sunDrop');
    c.sfx('chime', { volume: 0.4 });
    IDS.forEach((id) => c.actor(id).play('drink', { dur: 2.6 }));
    await c.wait(2.8);
    // ---- After 3 (8-12 s): the game restarts, S1 trips lightly, S2 calls Alrashed ----
    c.sfx('whistle');
    IDS.forEach((id) => {
      const a = c.actor(id);
      a.hold(null);
      a.flag('seated', false);
      a.flag('seatH', false);
    });
    const ball = c.prop('ball', 'ball', { pos: W(c, 38, -23, 0), params: { kind: 'football' } });
    const start: [number, number][] = [[33, -24], [36, -26], [38, -22], [41, -25], [35, -20], [40, -21]];
    IDS.forEach((id, i) => c.actor(id).place(W(c, start[i][0], start[i][1]), 1.2));
    c.robot.place(W(c, 31.8, -17.5), 0.8);
    await shots.wide(c, W(c, 36.5, -23), SOUTH, { zoom: 1.0, dur: 0 });
    c.sfx('cheer', { volume: 0.3 });
    IDS.forEach((id, i) => {
      if (id !== 's1' && id !== 's2') c.actor(id).walkTo(W(c, start[i][0] + 3, start[i][1] + 1.5), { speed: 2.4, clip: 'run' });
    });
    ball.moveTo(W(c, 36, -22.5, 0), 1.6);
    c.actor('s1').walkTo(W(c, 36.5, -23.2), { speed: 2.4, clip: 'run' });
    c.actor('s2').walkTo(W(c, 37.4, -22.2), { speed: 2.2, clip: 'run' });
    await c.wait(1.4);
    c.actor('s1').play('trip', { dur: 1.7 });
    c.expr('worried');
    c.actor('s2').play('raiseHand');
    c.sfx('whistle');
    c.status('walking');
    await c.robot.walkTo(W(c, 35.5, -22.4), { speed: 2.4, clip: 'jog' });
    c.status('explaining');
    c.robot.face(c.actor('s1').pos());
    await shots.two(c, c.robot, c.actor('s1'), { heading: SOUTH, dur: 0.6 });
    c.expr('proud');
    c.robot.play('thumbsUp', { dur: 1.8 });
    c.actor('s1').play('thumbsUp', { dur: 1.6 });
    await c.wait(1.8);
  }),
];
