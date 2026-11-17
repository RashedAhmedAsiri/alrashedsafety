import { cutscene } from '../api';
import { shots } from '../framing';
import type { Vec3 } from '../../core/types';
import { wp, go } from './streetKit';

// flood_dip (origin -14, 20): water across x -17.6..-10.4, z 16.4..23.6 (flows +X); park-side strip x -20.8..-17.65;
// park east gate (-21.5, 12).
const S1 = { shirt: '#3DBE6E', height: 'medium' as const }; // green shirt
/** Shots are taken from the north (dry road), looking south: the flowing water is always behind them. */
const SOUTH = Math.PI;

export default [
  cutscene('flood_safety', 'before', async (c) => {
    c.setFlag('floodWater', true);
    const s1 = c.spawn('s1', 'boy', { pos: wp(c, -14.2, 15.4), rotY: 0, spec: S1 });
    c.robot.place(wp(c, -19.3, 12.8), Math.PI / 2);
    c.robot.hold(null);
    c.expr('idle');
    c.sfx('whoosh', { volume: 0.25 });

    // Before 1 (0-3): wide of the dip by the park; S1 stands at the water's edge looking at the park.
    await shots.wide(c, wp(c, -15.5, 17.5), SOUTH, { zoom: 0.9, dur: 0 });
    s1.lookAt(wp(c, -24, 23, 1.2));
    await c.wait(3);

    // Before 2 (3-5): closer on S1 and the water: he steps toward it.
    await shots.two(c, s1, wp(c, -14.2, 18.2), { heading: SOUTH, dur: 0 });
    c.expr('surprised');
    s1.lookAt(null);
    go(s1.walkTo(wp(c, -14.2, 16.2), { speed: 0.45 }));
    await c.wait(2);

    // Before 3 (5-7): Alrashed reaches him, open palm as a barrier, and S1 steps back up the slope.
    c.expr('warning');
    c.status('walking');
    c.sfx('servo');
    await shots.follow(c, c.robot, c.robot.walkTo(wp(c, -15.3, 15.0), { speed: 2.4 }), { heading: SOUTH, with: [s1], dur: 0 });
    c.robot.face(s1.pos());
    c.status('explaining');
    go(c.robot.play('stopHand', { dur: 1.6 }));
    await s1.walkTo(wp(c, -14.2, 14.4), { speed: 0.5, clip: 'stopStepBack' });

    // Speech setup: both on the raised side facing the camera (north), the water behind them.
    s1.place(s1.pos(), SOUTH - 0.4);
    c.robot.place(wp(c, -15.4, 14.4), SOUTH + 0.3);
    c.expr('worried');
    await shots.two(c, c.robot, s1, { heading: SOUTH, dur: 1.0 });
  }),

  cutscene('flood_safety', 'after', async (c) => {
    const s1 = c.actor('s1');
    // After 1 (0-2): Alrashed and the water behind him; a branch is swept away fast.
    c.expr('surprised');
    // floating on the water surface (y -0.14; the dip floor under it is 0.35 down, so a ground offset would sink it)
    const onWater = (x: number, z: number): Vec3 => {
      const p = wp(c, x, z);
      return [p[0], -0.07, p[2]];
    };
    const branch = c.prop('branch', 'leaf', { pos: onWater(-17.0, 20), rotY: 1.2, scale: 4.5 });
    await shots.two(c, c.robot, wp(c, -14.5, 20), { heading: SOUTH, dur: 0.6 });
    c.sfx('whoosh');
    await branch.moveTo(onWater(-10.0, 20.4), 1.3, 'in');
    await c.wait(0.3);

    // After 2 (2-8): they walk the raised dry route along the strip to the park side.
    c.expr('smile');
    c.status('walking');
    c.sfx('footsteps', { loop: true });
    go(s1.walkTo([wp(c, -18.6, 13.9), wp(c, -19.4, 11.6)], { speed: 1.15 }));
    const walk = c.robot.walkTo([wp(c, -18.8, 13.1), wp(c, -19.6, 10.8)], { speed: 1.15 });
    await shots.follow(c, c.robot, walk, { heading: SOUTH + 0.5, with: [s1], dur: 0.6 });
    c.stopSfx('footsteps');

    // After 3 (8-10): at the park gate, seen from the road; they go into the park safely from the dry side.
    await shots.two(c, c.robot, s1, { heading: -Math.PI / 2, dur: 0 });
    c.status('explaining');
    c.expr('hearts');
    c.sfx('birds');
    // side by side through the 2.4 m east gate (posts at z 10.4..10.9 and 13.1..13.6), clear of both posts
    go(s1.walkTo([wp(c, -20.9, 12.45), wp(c, -22.7, 12.45)], { speed: 1.1 }));
    await c.robot.walkTo([wp(c, -20.7, 11.45), wp(c, -22.5, 11.45)], { speed: 1.1 });
    await c.wait(1.2);
  }),
];
