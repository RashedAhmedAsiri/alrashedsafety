import { cutscene } from '../api';
import { headingTo, shots } from '../framing';
import type { BoySpec, Vec3 } from '../../core/types';

// friend_fainted: yard, morning assembly. WORLD coordinates via W(): the yard origin is z = -22.
const N = Math.PI;
const E = Math.PI / 2;
const S1_SPEC: Partial<BoySpec> = { shirt: '#3DBE6E', striped: false, height: 'medium', skin: 2, hair: 'black' };
const SPECS: Partial<BoySpec>[] = [
  { shirt: '#E5484D', striped: false, height: 'small', skin: 1, hair: 'black' },
  { shirt: '#FFFFFF', striped: true, height: 'tall', skin: 3, hair: 'brown' },
  { shirt: '#FF8A3D', striped: false, height: 'medium', skin: 0, hair: 'black' },
  { shirt: '#9B6BF2', striped: true, height: 'small', skin: 2, hair: 'brown' },
  { shirt: '#7CC4FA', striped: false, height: 'tall', skin: 4, hair: 'black' },
  { shirt: '#FF6FA8', striped: false, height: 'medium', skin: 1, hair: 'brown' },
  { shirt: '#F5C518', striped: true, height: 'medium', skin: 3, hair: 'black' },
  { shirt: '#E5484D', striped: true, height: 'tall', skin: 2, hair: 'black' },
];
// Camera rule: from the north-west of the lines (the boys face north), looking south-east.
const camH = (W: (x: number, z: number) => Vec3) => headingTo(W(1.0, -34.5), W(8, -28.6));
// Lines at x = 6, 8, 10; spots z -29.4, -28.6, -27.8 (facing north). S1 is x 8, z -28.6.
const SPOTS: [number, number][] = [
  [6, -29.4], [6, -28.6], [6, -27.8],
  [8, -29.4], /* s1 */ [8, -27.8],
  [10, -29.4], [10, -28.6], [10, -27.8],
];
const CENTRE: [number, number] = [8, -28.6];

export default [
  cutscene('friend_fainted', 'setup', async (c) => {
    const W = (x: number, z: number, y = 0): Vec3 => c.at(x, z + 22, y);
    c.setFlag('schoolPeople', false);
    SPOTS.forEach(([x, z], i) => c.spawn(`b${i + 1}`, 'boy', { pos: W(x, z), rotY: N, spec: SPECS[i], clip: 'idle' }));
    c.spawn('s1', 'boy', { pos: W(8, -28.6), rotY: N, spec: S1_SPEC, clip: 'idle' });
    c.robot.place(W(8, -31.1), 0);
    c.expr('worried');
    await shots.wide(c, W(7.6, -29.4), camH(W), { dur: 0, zoom: 1.1, height: 2.2 });
  }),

  cutscene('friend_fainted', 'before', async (c) => {
    const W = (x: number, z: number, y = 0): Vec3 => c.at(x, z + 22, y);
    const s1 = c.actor('s1');
    const boys = SPOTS.map((_, i) => c.actor(`b${i + 1}`));
    // Before 1 (0-3 s): wide of the lines in the sun; S1 sways, droops and sinks slowly to the ground.
    c.sfx('murmur', { loop: true, volume: 0.25 });
    c.robot.lookAt(W(8, -28.6, 1.0));
    await c.wait(0.4);
    s1.play('faint', { dur: 3.6 });
    void shots.wide(c, W(8, -29.0), camH(W), { dur: 3, zoom: 0.8, height: 2.0 });
    await c.wait(2.6);
    c.sfx('thud', { volume: 0.4 });
    await c.wait(0.8);
    s1.play('lieDown');
    // Before 2 (3-5 s): boys crowd in a tight circle; Alrashed arrives and spreads his arms to widen it.
    await shots.two(c, c.robot, s1, { heading: camH(W), zoom: 1.2, height: 1.8, dur: 0 });
    const ring = (r: number, i: number): Vec3 => {
      // angle 0 = north
      // boys on the north, east and south; the gap from south through west to north-north-west faces the camera
      // (north-west) and the way the adults come in (west)
      const a = -0.45 + ((i + 0.5) / boys.length) * 3.6;
      return W(CENTRE[0] + Math.sin(a) * r, CENTRE[1] - Math.cos(a) * r);
    };
    c.expr('worried');
    boys.forEach((b, i) => {
      b.lookAt(null);
      void b.walkTo(ring(1.35, i), { speed: 2.0 }).then(() => b.face(W(CENTRE[0], CENTRE[1])));
    });
    c.robot.lookAt(null);
    await c.robot.walkTo(W(8, -30.45), { speed: 1.8 }); // just behind the tight crowd
    c.robot.face(W(8, -28.6));
    c.expr('warning');
    c.sfx('whistle', { volume: 0.25 });
    c.robot.play('warnRaise', { dur: 1.6 });
    await c.wait(0.4);
    boys.forEach((b, i) => {
      void b.walkTo(ring(2.7, i), { speed: 1.4 }).then(() => b.face(W(CENTRE[0], CENTRE[1])));
    });
    await c.wait(1.6);
    // Speaking arrangement: Alrashed kneels beside S1, boys standing back.
    c.stopSfx('murmur');
    c.sfx('murmur', { loop: true, volume: 0.15 });
    await c.robot.walkTo(W(8.95, -28.1), { speed: 1.4 });
    c.robot.face(W(8, -28.6));
    c.robot.play('kneel');
    c.expr('worried');
    await shots.two(c, c.robot, s1, { heading: camH(W), zoom: 0.75, height: 1.4, dur: 1.0 });
  }),

  cutscene('friend_fainted', 'after', async (c) => {
    const W = (x: number, z: number, y = 0): Vec3 => c.at(x, z + 22, y);
    const s1 = c.actor('s1');
    c.stopSfx('murmur');
    // After 1 (0-3 s): wide; a teacher and the counselor hurry over with water and an umbrella for shade.
    const teacher = c.spawn('teacher', 'teacher', { pos: W(-2.5, -25.2), rotY: E });
    const doc = c.spawn('counselor', 'counselor', { pos: W(-2.5, -27.0), rotY: E });
    teacher.hold('umbrella', 'right');
    doc.hold('waterBottle', 'right');
    c.expr('worried');
    await shots.wide(c, W(6.0, -27.6), camH(W), { dur: 0, zoom: 0.9, height: 2.2 });
    c.sfx('footsteps', { loop: true, volume: 0.5 });
    const t = teacher.walkTo([W(5.6, -26.2), W(9.3, -27.2)], { speed: 3.0 });
    void doc.walkTo([W(5.6, -27.0), W(7.4, -28.0)], { speed: 3.0 });
    await t;
    c.stopSfx('footsteps');
    teacher.face(W(8, -28.6));
    doc.face(W(8, -28.6));
    // After 2 (3-6 s): the counselor checks S1, who opens his eyes; they help him sit up in the shade.
    c.expr('gentle');
    await shots.two(c, doc, s1, { heading: camH(W), zoom: 0.8, height: 1.4, dur: 0 });
    doc.play('crouch');
    teacher.hold(null);
    c.prop('shade', 'umbrella', { pos: W(8.3, -28.0), rotY: 0, scale: 1.6 }); // canopy r 0.9 at 1.9 m, over S1's head
    c.sfx('murmur', { volume: 0.15 });
    await c.wait(1.2);
    s1.flag('awake', true);
    await c.wait(1.0);
    s1.flag('seated', true);
    s1.flag('seatH', 0.1);
    s1.play('sit');
    s1.flag('face', 'calm');
    await c.wait(1.2);
    // After 3 (6-9 s): small sips of water, then they walk him to the clinic.
    doc.play('idle');
    doc.face(s1.pos());
    c.expr('hearts');
    await s1.play('drink', { dur: 2.0 });
    s1.flag('seated', false);
    s1.flag('seatH', 0.42);
    s1.flag('awake', false);
    s1.play('idle');
    c.sfx('footsteps', { loop: true, volume: 0.4 });
    // out through the open (west) side of the circle, then north toward the clinic
    void doc.walkTo([W(7.3, -27.6), W(5.0, -28.9), W(4.8, -33.5)], { speed: 1.0 });
    await shots.follow(c, s1, s1.walkTo([W(5.6, -29.5), W(5.4, -33.5)], { speed: 1.0 }), { heading: camH(W) - 0.6, with: [doc], zoom: 0.9, height: 2.2 });
    c.stopSfx('footsteps');
  }),
];
