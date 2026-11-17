import { cutscene } from '../api';
import { shots } from '../framing';
import type { BoySpec } from '../../core/types';

// corridor_running: corridor_ground, local origin (-6,0,-55), x runs east along the corridor, right side going east is z > 0.
// Wet patch x 6.3..8.9, z 0.1..1.7, sign at (7.0,-0.05). Rotations: PI/2 faces +X (east), -PI/2 west, 0 south, PI north.
// Camera rule: the corridor is narrow, so every shot looks down it from the east end (heading ~ -PI/2), slightly from
// the south side.
const S1: Partial<BoySpec> = { shirt: '#E5484D', striped: false, height: 'medium', skin: 2, hair: 'black', backpack: '#2D78C8' };
const S2: Partial<BoySpec> = { shirt: '#3DBE6E', striped: true, height: 'small', skin: 1, hair: 'brown', backpack: '#F5C518' };
const E = Math.PI / 2;
const W = -Math.PI / 2;
const LOOK_WEST = -Math.PI / 2 + 0.25;

export default [
  cutscene('corridor_running', 'setup', async (c) => {
    c.setFlag('wetFloor', true);
    c.spawn('cleaner', 'cleaner', { pos: c.at(7.6, -1.6), rotY: 0, clip: 'mop', hold: 'mop' });
    c.spawn('s1', 'boy', { pos: c.at(0.3, 0.9), rotY: E, spec: S1, clip: 'run' });
    c.spawn('s2', 'boy', { pos: c.at(-0.7, -0.5), rotY: E, spec: S2, clip: 'run' });
    c.robot.place(c.at(10.2, -1.5), W);
    c.expr('surprised');
    await shots.wide(c, c.at(4.5, 0.3), LOOK_WEST, { dur: 0, zoom: 1.1, height: 1.8 });
  }),

  cutscene('corridor_running', 'before', async (c) => {
    const s1 = c.actor('s1');
    const s2 = c.actor('s2');
    // 1: down the corridor: two boys race toward the camera, past the yellow sign.
    c.expr('surprised');
    c.sfx('tap', { volume: 0.25 }); // mop bucket
    c.sfx('footsteps', { loop: true, volume: 0.5 });
    s1.flag('face', 'laugh');
    s2.flag('face', 'laugh');
    const r1 = s1.walkTo(c.at(6.9, 0.9), { speed: 3.2, clip: 'run' });
    void s2.walkTo(c.at(5.4, -0.5), { speed: 3.0, clip: 'run' }).then(() => void s2.play('idle'), () => undefined);
    await r1;
    c.stopSfx('footsteps');
    // 2: S1's foot slides on the wet patch; Alrashed catches his arm.
    await shots.two(c, s1, c.robot, { heading: LOOK_WEST, zoom: 0.8, dur: 0 });
    s1.play('slip', { dur: 2.2 }); // still slipping when Alrashed reaches him
    c.sfx('screech', { volume: 0.3 });
    c.expr('warning');
    c.sfx('servo');
    await c.robot.walkTo(c.at(7.6, 1.15), { speed: 2.8, clip: 'jog' });
    c.robot.face(s1.pos());
    await c.robot.play('catch', { dur: 0.8 });
    // 3 (speech): the boys step off the wet patch and stand beside Alrashed.
    s1.play('idle');
    s2.play('idle'); // he arrived with the run clip still on
    s1.flag('face', 'worried');
    s2.flag('face', 'worried');
    s1.place(c.at(9.7, -0.5), E);
    s2.place(c.at(9.6, 1.4), E);
    c.robot.place(c.at(10.7, 0.5), W);
    s1.face(c.robot.pos());
    s2.face(c.robot.pos());
    c.robot.flag('turnToCamera', true);
    c.expr('warning');
    await shots.two(c, c.robot, [s1, s2], { heading: LOOK_WEST, zoom: 1.0, dur: 0 });
  }),

  cutscene('corridor_running', 'during', async (c) => {
    // Pointing at the sign and the right side of the corridor, over and over.
    const sign = c.at(7.0, -0.05, 0.5);
    const right = c.at(14.0, 1.6, 0.2);
    for (;;) {
      c.robot.face(sign);
      await c.robot.play('point', { dur: 1.8 });
      await c.robot.play('explain1', { dur: 2.6 });
      c.robot.face(right);
      await c.robot.play('point', { dur: 1.8 });
      await c.robot.play('explain2', { dur: 2.8 });
    }
  }),

  cutscene('corridor_running', 'after', async (c) => {
    const s1 = c.actor('s1');
    const s2 = c.actor('s2');
    c.robot.flag('turnToCamera', false);
    c.robot.play('idle');
    // 1: S1 kneels by the wall and ties his lace, Alrashed waits beside him.
    s1.place(c.at(4.6, 1.9), E);
    s2.place(c.at(3.8, 1.3), E);
    c.robot.place(c.at(5.7, 1.3), W);
    await shots.two(c, s1, c.robot, { heading: LOOK_WEST, zoom: 1.0, dur: 0 });
    c.expr('smile');
    s1.play('crouch', { dur: 2.0 });
    c.sfx('click', { volume: 0.4 }); // lace pull
    await c.wait(2.0);
    // 2: they walk calmly, around the wet patch, then back to the right side.
    s1.play('idle');
    c.expr('happy');
    c.status('walking');
    c.robot.place(c.at(15.0, -1.8), W); // behind the camera
    c.actor('cleaner').place(c.at(7.6, -2.05), 0); // mops nearer the wall, so his mop stays clear of the boys passing
    await shots.wide(c, c.at(7.6, 0.3), LOOK_WEST, { dur: 0, zoom: 0.85, height: 1.7 });
    c.sfx('footsteps', { loop: true, volume: 0.4 });
    // single file through the gap between the sign (z -0.05) and the mopping cleaner (z -2.05), S1 leading
    await Promise.all([
      s1.walkTo([c.at(5.4, -0.6), c.at(9.0, -0.6), c.at(10.2, 1.3)], { speed: 1.2 }),
      (async () => {
        await c.wait(1.3);
        await s2.walkTo([c.at(4.6, 0.2), c.at(5.4, -0.6), c.at(9.0, -0.6), c.at(9.6, 0.4)], { speed: 1.2 });
      })(),
    ]);
    c.stopSfx('footsteps');
    // 3: at their classroom door they wave to Alrashed.
    c.robot.place(c.at(22.0, 0.6), E);
    s1.place(c.at(24.0, 1.6), W);
    s2.place(c.at(24.8, 1.6), W);
    // side-on from the north wall, the classroom door behind them
    await shots.two(c, c.robot, [s1, s2], { heading: Math.PI, zoom: 1.0, dur: 0 });
    c.sfx('click', { volume: 0.5 });
    c.expr('hearts');
    s1.play('wave');
    s2.play('wave');
    await c.robot.play('wave', { dur: 2.2 });
  }),
];
