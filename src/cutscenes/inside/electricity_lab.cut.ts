import { cutscene } from '../api';
import { headingTo, shots } from '../framing';
import { slideTo } from './halls.util';
import type { BoySpec } from '../../core/types';

// computer_lab, local coordinates (room centre, floor 0). West wall is x = -7; boys at the west desks face west.
// Camera rule: always from the south-east of the west desks looking north-west, so the boys are seen in profile.
const W = -Math.PI / 2;
const S1_SPEC: Partial<BoySpec> = { shirt: '#7CC4FA', striped: false, height: 'medium', skin: 2 };
const S2_SPEC: Partial<BoySpec> = { shirt: '#FF8A3D', striped: true, height: 'small', skin: 1 };

export default [
  cutscene('electricity_lab', 'setup', async (c) => {
    // S1 types at W5 with juice by the keyboard, S2 kneels at the uncovered socket.
    c.setFlag('juice', 'desk');
    c.setFlag('socketCover', false);
    const s1 = c.spawn('s1', 'boy', { pos: c.at(-5.88, 1.25), rotY: W, spec: S1_SPEC, clip: 'sitDesk' });
    s1.flag('seated', true);
    const s2 = c.spawn('s2', 'boy', { pos: c.at(-6.45, 2.4), rotY: W, spec: S2_SPEC, clip: 'crouch', hold: 'pencil' });
    s2.lookAt(c.at(-6.99, 2.4, 0.38));
    c.robot.place(c.at(-3.6, 2.2), W);
    c.expr('smile');
    const H = headingTo(c.at(-2.4, 4.6), c.at(-5.6, 1.6));
    await shots.two(c, c.robot, [s1, s2], { heading: H, zoom: 0.85, height: 1.6, dur: 0 });
  }),

  cutscene('electricity_lab', 'before', async (c) => {
    const s2 = c.actor('s2');
    const s1 = c.actor('s1');
    const H = headingTo(c.at(-2.4, 4.6), c.at(-5.6, 1.6));
    // 1: wide: keyboard clicks, juice by the keyboard, S2 poking the socket with a pencil. Alrashed notices.
    c.sfx('click', { loop: true, volume: 0.3 });
    c.sfx('servo', { loop: true, volume: 0.15 });
    c.expr('surprised');
    c.robot.face(c.at(-6.4, 2.4));
    await c.robot.play('lookLeft', { dur: 1.6 });
    // 2: he walks over, takes the pencil; the juice box goes to the shelf, S2 goes back to his own desk.
    c.stopSfx('click');
    c.sfx('beep');
    c.expr('warning');
    await shots.two(c, c.robot, s2, { heading: H, zoom: 0.8, height: 1.5, dur: 0 });
    await c.robot.walkTo(c.at(-5.45, 2.6), { speed: 1.3 });
    c.robot.face(s2.pos());
    c.robot.hold('pencil', 'right');
    s2.hold(null);
    await c.robot.play('point', { dur: 0.9 });
    c.robot.hold(null);
    c.setFlag('juice', 'shelf');
    s1.lookAt(null);
    // round S1's chair (seat -5.88, 1.25) on its east side, then in beside the W4 chair and onto its seat
    s2.play('idle');
    await s2.walkTo([c.at(-5.75, 2.05), c.at(-5.15, 1.55), c.at(-5.2, 0.7), c.at(-5.88, 0.68)], { speed: 1.3 });
    s2.flag('seated', true);
    s2.play('sitDesk');
    await slideTo(c, s2, c.at(-5.88, 0.68), c.at(-5.88, 0.15), 0.35, W);
    // 3 (speech): Alrashed beside the socket, both boys at their desks.
    c.robot.place(c.at(-5.3, 2.5), Math.PI / 2 + 0.55);
    await shots.two(c, c.robot, [s1, s2], { heading: H, zoom: 0.8, height: 1.5, dur: 0.9 });
  }),

  cutscene('electricity_lab', 'during', async (c) => {
    // He explains, pointing at the socket, the keyboard and the cable tray. Hum.
    c.sfx('servo', { loop: true, volume: 0.15 });
    const spots = [c.at(-6.99, 2.4, 0.38), c.at(-6.5, 1.25, 0.7), c.at(-6.9, 0.2, 0.98)];
    for (let i = 0; ; i++) {
      c.robot.face(spots[i % 3]);
      c.expr(i % 3 === 0 ? 'warning' : 'explaining');
      await c.robot.play('point', { dur: 1.8 });
      c.robot.face(c.at(-2, 3));
      await c.robot.play(i % 2 ? 'explain2' : 'explain1', { dur: 2.2 });
    }
  }),

  cutscene('electricity_lab', 'after', async (c) => {
    const s1 = c.actor('s1');
    const s2 = c.actor('s2');
    const H = headingTo(c.at(-2.4, 4.6), c.at(-5.6, 1.6));
    c.stopSfx('servo');
    // 1: Alrashed snaps the cover onto the socket.
    c.robot.place(c.at(-5.6, 2.6), W);
    c.expr('smile');
    await shots.two(c, c.robot, c.at(-6.9, 2.4), { heading: H, zoom: 0.6, height: 1.3, dur: 0 });
    await c.robot.play('point', { dur: 1.0 });
    c.setFlag('socketCover', true);
    c.sfx('click');
    await c.wait(0.8);
    // 2: S1 dries his hands on a tissue and sits upright.
    c.expr('happy');
    s1.flag('seated', false);
    // he stands beside his chair (south of it, clear of the chair base), facing the tissues on the desk end
    s1.place(c.at(-5.85, 1.85), W);
    s1.play('idle');
    await shots.two(c, s1, c.robot, { heading: H, zoom: 0.75, height: 1.4, dur: 0 });
    await s1.play('washHands', { dur: 1.3 });
    s1.flag('seated', true);
    s1.play('sitDesk');
    await slideTo(c, s1, c.at(-5.85, 1.85), c.at(-5.88, 1.25), 0.4, W);
    c.sfx('slide', { volume: 0.4 });
    await c.wait(0.6);
    // 3: wide, both boys work calmly, thumbs up.
    c.sfx('click', { loop: true, volume: 0.3 });
    c.expr('proud');
    c.robot.face(c.at(-2, 4));
    await shots.two(c, c.robot, [s1, s2], { heading: H, zoom: 1.1, height: 1.6, dur: 1.0 });
    await c.robot.play('thumbsUp', { dur: 1.8 });
    await c.wait(1.0);
    c.stopSfx('click');
  }),
];
