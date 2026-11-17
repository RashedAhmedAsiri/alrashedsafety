import { cutscene } from '../api';
import { shots, headingTo } from '../framing';
import { wp, go } from './streetKit';

// parking (origin 68, -20). School fence x 56, walkway x 56.2..59.4, bays: west row nose -X (cars x 60.3..64.2),
// aisle x 64.8..71.6, exit south to the main street. Free bay W3 (62.25, -20.95) holds the white SUV (its rear faces
// +X, toward the aisle). The gap between the SUV and the grey car north of it (z -19.9..-19.2) leads to the aisle.
// Camera rule: from the south (aisle / walkway end) looking north-west over the bays.
const S1 = { shirt: '#F5C518', height: 'medium' as const }; // yellow shirt
const SUV: [number, number] = [62.25, -20.95];
const GAP_Z = -19.55;
const BALL_AT: [number, number] = [66.1, -20.6]; // in the aisle, just behind the SUV
const H = headingTo([68.6, 0, -13.5], [62.5, 0, -20.5]); // from the aisle, looking north-west
const R_TALK: [number, number] = [57.7, -15.6];
const S_TALK: [number, number] = [58.6, -15.6];
const WALK_H = headingTo([58.4, 0, -11.0], [62.0, 0, -19.5]); // from the walkway end, looking north-east

export default [
  cutscene('parked_cars', 'before', async (c) => {
    const s1 = c.spawn('s1', 'boy', { pos: wp(c, 57.7, -20.4), rotY: -Math.PI / 2, spec: S1 });
    c.robot.place(wp(c, 67.6, -12.5), Math.PI);
    c.robot.hold(null);
    c.expr('idle');
    const suv = c.prop('suv', 'car', { pos: wp(c, SUV[0], SUV[1]), rotY: Math.PI, params: { color: '#F2F2F2', lights: 'off', body: 'suv' } });
    const ball = c.prop('ball', 'ball', { pos: wp(c, 58.4, -20.4, 0), params: { kind: 'football', color: '#FFFFFF' } });

    // Before 1 (0-3): wide over the bays; S1 kicks the ball at the fence, it bounces back and rolls between the cars.
    await shots.wide(c, wp(c, 60.5, -19.8), H, { dur: 0, zoom: 1.25, height: 3.4 });
    go(s1.play('kick', { dur: 0.9 }));
    await c.wait(0.4);
    c.sfx('bounce');
    await ball.moveTo(wp(c, 56.4, -20.4, 0), 0.4, 'out');
    c.sfx('bounce');
    c.expr('surprised');
    await ball.moveTo(wp(c, 59.2, GAP_Z, 0), 0.5, 'linear');
    go(ball.moveTo(wp(c, BALL_AT[0], BALL_AT[1], 0), 1.8, 'out'));
    c.sfx('laugh', { volume: 0.4 });
    await s1.walkTo([wp(c, 59.4, GAP_Z), wp(c, 64.9, GAP_Z), wp(c, 65.5, -20.1)], { speed: 3.0, clip: 'run' });

    // Before 2 (3-5): S1 crouches for the ball right behind the SUV; its white reversing lights come on.
    await shots.two(c, s1, wp(c, 64.6, SUV[1]), { heading: H, zoom: 0.9, dur: 0 });
    s1.face(wp(c, BALL_AT[0], BALL_AT[1]));
    go(s1.play('crouch', { dur: 0.9 }));
    await c.wait(0.5);
    c.expr('warning');
    suv.set({ params: { lights: 'reverse', body: 'suv' } });
    c.sfx('busEngine');
    c.sfx('beep');
    go(suv.moveTo(wp(c, SUV[0] + 0.3, SUV[1]), 1.6, 'in'));

    // Before 3 (5-8): Alrashed hurries up the aisle, stop palm at the driver; the SUV stops. He takes S1's hand.
    c.status('walking');
    const run = c.robot.walkTo(wp(c, 66.4, -19.0), { speed: 2.4, clip: 'jog' });
    await shots.follow(c, c.robot, run, { heading: H, zoom: 1.1 });
    c.robot.face(wp(c, SUV[0] + 1.0, SUV[1] - 0.6, 1.0));
    c.expr('warning');
    c.sfx('horn', { volume: 0.4 });
    suv.set({ params: { lights: 'brake', body: 'suv' } });
    await c.robot.play('stopHand', { dur: 1.6 });
    c.expr('worried');
    s1.face(c.robot.pos());
    c.robot.flag('holdHand', 'r');
    c.sfx('footsteps', { loop: true });
    c.status('walking');
    // they walk away from the cars along the aisle (the walk to the walkway is cut short)
    const lead = Promise.all([
      c.robot.walkTo(wp(c, 66.4, -15.5), { speed: 1.3, clip: 'holdHandWalk' }),
      s1.walkTo(wp(c, 67.0, -15.6), { speed: 1.3, clip: 'holdHands' }),
    ]);
    await c.wait(2.2);
    await lead;
    c.robot.flag('holdHand', 'off');
    c.stopSfx('footsteps');
    c.status('explaining');

    // Speech: on the walkway, parked cars behind; he kneels to S1's height.
    c.robot.place(wp(c, R_TALK[0], R_TALK[1]), Math.PI / 2);
    s1.place(wp(c, S_TALK[0], S_TALK[1]), -Math.PI / 2);
    await shots.two(c, c.robot, s1, { side: -1, zoom: 0.9, dur: 0 });
    await c.robot.play('kneel');
    s1.lookAt(wp(c, R_TALK[0], R_TALK[1], 0.9));
    c.expr('explaining');
    await c.wait(0.8);
  }),

  cutscene('parked_cars', 'during', async (c) => {
    // He looks toward the SUV's white reverse lights while he explains.
    for (const [x, z] of [[64.8, -20.9], [60, -17], [64.8, -20.9]] as [number, number][]) {
      c.robot.lookAt(wp(c, x, z, 0.6));
      await c.wait(3);
    }
  }),

  cutscene('parked_cars', 'after', async (c) => {
    const s1 = c.actor('s1');
    const suv = c.prop('suv', 'car', { pos: wp(c, SUV[0] + 0.3, SUV[1]), rotY: Math.PI, params: { lights: 'reverse', body: 'suv' } });
    const ball = c.prop('ball', 'ball', { pos: wp(c, BALL_AT[0], BALL_AT[1], 0) });
    c.robot.lookAt(null);
    s1.lookAt(null);
    c.robot.place(wp(c, R_TALK[0], R_TALK[1]), Math.PI / 2);
    s1.place(wp(c, S_TALK[0], S_TALK[1]), -Math.PI / 2);
    c.robot.play('idle');

    // After 1 (0-4): from the walkway; both watch the SUV back out slowly and drive away down the aisle.
    await shots.wide(c, wp(c, 60.5, -17.5), WALK_H, { dur: 0, zoom: 0.9, height: 1.7 });
    c.expr('smile');
    c.sfx('busEngine');
    c.robot.face(wp(c, 64, -20));
    s1.face(wp(c, 64, -20));
    await suv.moveTo(wp(c, 67.9, SUV[1]), 3.0, 'inOut');
    suv.set({ params: { lights: 'off', body: 'suv' } });
    await suv.drive([wp(c, 67.9, -17.5), wp(c, 67.9, -8.5), wp(c, 66.0, -3.6), wp(c, 60, -1.75), wp(c, 30, -1.75)], 4.0);

    // After 2 (4-7): the aisle is clear; Alrashed fetches the ball from behind the bays.
    c.robot.place(wp(c, 66.4, -16.8), Math.PI);
    c.status('walking');
    await shots.follow(c, c.robot, c.robot.walkTo(wp(c, BALL_AT[0] + 0.4, BALL_AT[1] + 0.3), { speed: 1.4 }), { heading: H, zoom: 0.9 });
    c.robot.face(wp(c, BALL_AT[0], BALL_AT[1]));
    await c.robot.play('crouch', { dur: 0.9 });
    ball.remove();
    c.robot.hold('ball', 'right');
    c.robot.play('idle');

    // After 3 (7-10): back on the walkway he hands it over; they head for the football field.
    c.robot.place(wp(c, R_TALK[0], R_TALK[1] + 1.4), Math.PI);
    await shots.two(c, c.robot, s1, { side: -1, zoom: 0.9, dur: 0 });
    await c.robot.walkTo(wp(c, R_TALK[0], R_TALK[1] + 0.2), { speed: 1.2 });
    c.robot.face(s1.pos());
    c.robot.hold(null);
    s1.hold('ball', 'right');
    c.expr('hearts');
    c.sfx('birds');
    await c.wait(0.8);

    // After 4 (10-13): on the football field.
    await c.go('football_field');
    c.robot.place(wp(c, 24.4, -20.4), Math.PI / 2);
    s1.place(wp(c, 23.8, -19.6), Math.PI / 2);
    const both = Promise.all([s1.walkTo(wp(c, 29.5, -19.8), { speed: 1.2 }), c.robot.walkTo(wp(c, 29.2, -20.6), { speed: 1.2 })]);
    await shots.follow(c, c.robot, both, { heading: -Math.PI / 2 + 0.25, with: [s1], zoom: 1.2 });
  }),
];
