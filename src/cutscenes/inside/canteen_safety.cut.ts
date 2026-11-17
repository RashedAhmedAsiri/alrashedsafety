import { cutscene } from '../api';
import { shots } from '../framing';
import type { BoySpec, Vec3 } from '../../core/types';
import { bg } from './halls.util';

// canteen_safety: canteen local origin (-19,0,-45). Hand-wash basins on the north wall (z -5.7) at x 0.2 / 1.1 / 2.0, stand at z -4.9
// facing north. Table (-1.5,-2.2) with four stools at radius 0.8. Door in the north wall at x -3.
// Rotations: PI/2 faces +X, -PI/2 west, 0 south, PI north. Cameras stay on the south side of the action.
const SPEC: Record<string, Partial<BoySpec>> = {
  s1: { shirt: '#F5C518', striped: false, height: 'medium', skin: 2, hair: 'black', backpack: null },
  s2: { shirt: '#E5484D', striped: true, height: 'small', skin: 3, hair: 'brown', backpack: null },
  s3: { shirt: '#7CC4FA', striped: false, height: 'tall', skin: 1, hair: 'black', backpack: null },
  s4: { shirt: '#3DBE6E', striped: false, height: 'medium', skin: 4, hair: 'black', backpack: null },
};
const W = -Math.PI / 2;
const N = Math.PI;
const TABLE: [number, number] = [-1.5, -2.2];
/** Table top surface (the set's round table: top 0.64). */
const TABLE_Y = 0.645;
/** The set's stools of this table (canteen.tsx tableSet, seed 3: table turned 0.4 rad): world angle of stool i, radius 0.8. */
const stool = (i: number): { x: number; z: number; rotY: number; dx: number; dz: number } => {
  const a = (i / 4) * Math.PI * 2 + Math.PI / 4 + 0.4;
  const dx = Math.sin(a), dz = Math.cos(a);
  return { x: TABLE[0] + dx * 0.8, z: TABLE[1] + dz * 0.8, rotY: a + Math.PI, dx, dz };
};
/** A point on the table top `r` m from the centre toward stool i. */
const onTable = (i: number, r: number): [number, number] => [TABLE[0] + stool(i).dx * r, TABLE[1] + stool(i).dz * r];

export default [
  cutscene('canteen_safety', 'setup', async (c) => {
    // Alrashed beside the hand-wash sinks at the entrance, boys queue behind him along the north wall.
    c.robot.place(c.at(2.9, -4.7), 0);
    c.expr('explaining');
    c.spawn('s1', 'boy', { pos: c.at(3.9, -4.8), rotY: W, spec: SPEC.s1 });
    c.spawn('s2', 'boy', { pos: c.at(4.7, -4.8), rotY: W, spec: SPEC.s2 });
    c.spawn('s3', 'boy', { pos: c.at(5.5, -4.8), rotY: W, spec: SPEC.s3 });
    c.spawn('s4', 'boy', { pos: c.at(6.3, -4.8), rotY: W, spec: SPEC.s4 });
    await shots.two(c, c.robot, c.actor('s3'), { side: -1, zoom: 0.9, dur: 0 });
  }),

  cutscene('canteen_safety', 'during', async (c) => {
    // He mimes hand-washing and slow chewing beside the sinks; the boys watch.
    c.setFlag('tap', true);
    c.sfx('tap', { loop: true, volume: 0.3 });
    await shots.close(c, c.robot, 0, { dur: 1.2, zoom: 1.2 });
    bg(async () => {
      for (;;) {
        await c.robot.play('washHands', { dur: 3 });
        await c.robot.play('nod', { dur: 1.2 });
        await c.robot.play('explain2', { dur: 2.8 });
      }
    });
    for (;;) await c.wait(5);
  }),

  cutscene('canteen_safety', 'after', async (c) => {
    const [s1, s2, s3, s4] = ['s1', 's2', 's3', 's4'].map((id) => c.actor(id));
    c.robot.play('idle');
    // 1: S1 washes with soap at the basin, Alrashed beside him.
    c.setFlag('tap', 1);
    c.sfx('tap', { loop: true, volume: 0.4 });
    s1.place(c.at(1.1, -4.9), N);
    s2.place(c.at(3.6, -4.2), W);
    c.robot.place(c.at(2.3, -4.5), W);
    await shots.two(c, s1, c.robot, { side: -1, zoom: 0.75, dur: 0 });
    c.expr('happy');
    s1.play('washHands');
    await c.wait(3.0);
    c.stopSfx('tap');
    c.setFlag('tap', false);

    // 2: at the table the boys sit and eat; S2 laughs with food in his mouth and starts coughing.
    // on the set's stools: s1 west (2), s2 east (0), s3 south (3), s4 north (1)
    const seats: [typeof s1, number][] = [
      [s1, 2],
      [s2, 0],
      [s3, 3],
      [s4, 1],
    ];
    for (const [a, i] of seats) {
      const st = stool(i);
      a.place(c.at(st.x, st.z), st.rotY);
      a.flag('seatH', 0.45);
      a.flag('seated', true);
      a.hold('sandwich');
      a.play('eat');
    }
    c.robot.place(c.at(0.45, -3.75), -1.05);
    c.prop('trayA', 'tray', { pos: c.at(...onTable(2, 0.33), TABLE_Y), rotY: stool(2).rotY });
    c.prop('trayB', 'tray', { pos: c.at(...onTable(0, 0.33), TABLE_Y), rotY: stool(0).rotY });
    await shots.two(c, s1, s2, { heading: -0.75, zoom: 0.85, height: 1.9, dur: 0 });
    c.expr('smile');
    c.status('explaining');
    await c.wait(1.2);
    s2.play('laugh');
    await c.wait(0.9);
    c.expr('surprised');
    s2.play('cough');
    s2.hold(null);
    c.sfx('cough', { volume: 0.4 });
    await c.wait(1.0);

    // 3: S1 raises his hand, the teacher comes in from the door; S2 coughs it out and gives a thumbs-up.
    c.expr('worried');
    const teacher = c.spawn('teacher', 'teacher', { pos: c.at(-3.0, -5.3), rotY: 0 });
    s1.play('raiseHand');
    await shots.two(c, s2, teacher, { heading: -0.75, zoom: 0.75, height: 1.9, dur: 0 });
    await teacher.walkTo(c.at(-2.6, -3.3), { speed: 2.0 });
    teacher.face(s2.pos());
    s1.play('eat');
    s2.play('thumbsUp', { dur: 1.6 });
    c.sfx('chime', { volume: 0.25 }); // relieved sigh
    c.expr('smile');
    await c.wait(1.6);

    // 4: the lunchbox: S3 reads the allergy sticker and politely hands the peanut snack back.
    s2.hold('sandwich');
    s3.hold(null);
    s4.hold(null);
    s2.play('eat');
    teacher.remove();
    c.prop('trayA', 'tray', { pos: c.at(...onTable(2, 0.33), TABLE_Y) }).remove();
    c.prop('trayB', 'tray', { pos: c.at(...onTable(0, 0.33), TABLE_Y) }).remove();
    c.prop('lunch', 'lunchbox', { pos: c.at(...onTable(3, 0.36), TABLE_Y), rotY: stool(3).rotY });
    const snack = c.prop('snack', 'peanutSnack', { pos: c.at(...onTable(1, 0.3), TABLE_Y), rotY: stool(1).rotY });
    await shots.two(c, s3, s4, { heading: -0.75, zoom: 0.65, height: 1.85, dur: 0 });
    c.expr('focused');
    s4.play('talk');
    await snack.moveTo(c.at(...onTable(3, 0.1), TABLE_Y) as Vec3, 0.7, 'inOut');
    s3.flag('lookDown', true);
    c.sfx('click', { volume: 0.4 }); // paper rustle
    c.prop('icon', 'speechBubbleIcon', { pos: c.at(...onTable(3, 0.1), 1.1), params: { icon: 'question' } });
    await c.wait(0.9);
    s3.flag('lookDown', false);
    s3.play('headShake', { dur: 1.2 });
    c.prop('icon', 'speechBubbleIcon', { pos: c.at(...onTable(3, 0.1), 1.1), params: { icon: 'cross' } });
    await snack.moveTo(c.at(...onTable(1, 0.3), TABLE_Y) as Vec3, 0.7, 'inOut');
    c.prop('icon', 'speechBubbleIcon', { pos: c.at(...onTable(3, 0.36), 1.0), params: { icon: 'check' } });
    c.sfx('chime', { volume: 0.5 }); // soft ding
    c.expr('proud');
    s4.play('nod', { dur: 1.2 });
    await c.wait(0.9);
  }),
];
