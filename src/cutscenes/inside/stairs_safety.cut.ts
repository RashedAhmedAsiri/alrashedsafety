import { cutscene } from '../api';
import { shots } from '../framing';
import type { BoySpec } from '../../core/types';
import { stairCam, stairFollow } from './halls.util';

// stairs_safety: stairs room, local origin (14,0,-65). Flight 1 climbs north (x -3.9..-1.3, z 0.1 -> -3.2, y 0 -> 2).
// Inner handrail at x -1.32 (rail top is 0.75 above the step), wall rail at x -3.86.
// Camera rule: always up and to the side of the bottom of flight 1 (south-east, under the first-floor slab), looking up
// the flight; flight 2 is a solid block east of it, so the camera never goes there.
const S1: Partial<BoySpec> = { shirt: '#FF8A3D', striped: false, height: 'medium', skin: 2, hair: 'black', backpack: '#2D78C8' };
const N = Math.PI;
const stepY = (z: number) => Math.max(0, Math.min(2, (0.1 - z) * 0.606)); // surface height of flight 1 at local z
const railY = (z: number) => stepY(z) + 0.75; // top of the inner handrail

export default [
  cutscene('stairs_safety', 'setup', async (c) => {
    // S1 at the top of flight 1, Alrashed at the bottom looking up at him.
    c.spawn('s1', 'boy', { pos: c.at(-1.8, -3.0, stepY(-3.0)), rotY: 0, spec: S1 });
    c.robot.place(c.at(-2.4, 1.0), N);
    c.expr('surprised');
    // up the flight from the floor south of it, west of the flight-2 block face (x -1.3) so the boy on the inner rail
    // is not cut by that block; Alrashed at the bottom in the lower half of the frame
    await c.cam({ pos: c.at(-1.75, 4.3, 2.4), look: c.at(-1.9, -1.0, 1.35), fov: 50, dur: 0, ease: 'linear' });
  }),

  cutscene('stairs_safety', 'before', async (c) => {
    const s1 = c.actor('s1');
    // 1: wide, up from the side: S1 sits on the handrail to slide down.
    c.sfx('chime', { volume: 0.15 });
    await c.wait(0.5);
    s1.flag('face', 'laugh');
    s1.place(c.at(-1.32, -2.9, railY(-2.9)), 0);
    s1.play('slideRail');
    c.sfx('slide', { volume: 0.4 });
    await s1.walkTo([c.at(-1.32, -2.4, railY(-2.4))], { speed: 0.35, clip: 'slideRail' });
    // 2: Alrashed at the bottom, palm up: stop. S1 freezes on the rail.
    c.expr('warning');
    c.sfx('chime', { volume: 0.5 });
    await c.robot.play('stopHand', { dur: 1.6 });
  }),

  cutscene('stairs_safety', 'during', async (c) => {
    // Pointing at the yellow step edges and at the handrail, over and over.
    const edge = c.at(-2.6, 0.1, 0.1);
    const rail = c.at(-3.86, -1.0, 1.2);
    for (;;) {
      c.robot.face(edge);
      await c.robot.play('point', { dur: 1.8 });
      await c.robot.play('explain1', { dur: 2.6 });
      c.robot.face(rail);
      await c.robot.play('point', { dur: 1.8 });
      await c.robot.play('explain2', { dur: 2.8 });
    }
  }),

  cutscene('stairs_safety', 'after', async (c) => {
    const s1 = c.actor('s1');
    // 1: S1 gets off the rail onto the step.
    c.expr('smile');
    s1.flag('face', 'smile');
    s1.place(c.at(-2.0, -2.4, stepY(-2.4)), 0);
    s1.play('idle');
    c.robot.place(c.at(0.7, 1.9), -Math.PI / 2 - 0.4); // beside the camera, out of the shot
    await stairCam(c, [s1.pos()], { dur: 0 });
    c.sfx('footsteps', { volume: 0.4 });
    await c.wait(0.8);
    // 2: he walks down on his right (the wall side), one step at a time, hand on the wall rail. Camera up and to the side.
    c.expr('happy');
    c.status('walking');
    c.sfx('footsteps', { loop: true, volume: 0.4 });
    const walk = s1.walkTo([c.at(-3.3, -2.0, stepY(-2.0)), c.at(-3.3, 0.35, 0), c.at(-3.0, 1.3)], { speed: 0.65, clip: 'walk' });
    await stairFollow(c, s1, walk);
    c.stopSfx('footsteps');
    // 3: at the bottom, high five with Alrashed.
    c.robot.place(c.at(-2.0, 1.6), -Math.PI / 2 - 0.3);
    s1.face(c.robot.pos());
    c.robot.face(s1.pos());
    await shots.two(c, s1, c.robot, { side: -1, dur: 0, zoom: 0.9, height: 1.6 });
    c.expr('proud');
    s1.play('raiseHand');
    await c.robot.play('wave', { dur: 1.2 });
    c.sfx('pop', { volume: 0.6 });
    await c.wait(1.6);
  }),
];
