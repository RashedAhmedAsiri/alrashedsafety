import { cutscene } from '../api';
import { shots } from '../framing';
import { at, FACE_SOUTH, together } from './crossing-common';

/**
 * crossing_with_friends: S1 (red) and S2 (yellow) run out of the gate; Alrashed stops them at the curb.
 * Boys at x -0.62 / +0.62, Alrashed at x 0, facing south. The red car comes from the LEFT (east) along the
 * near westbound lane, hugging the centre line (z -1.1): 3.2 m from the boys, never near them.
 * Camera rule: from the WEST side looking east (the car comes from the background); fronts from the road side.
 */
const EAST = Math.PI / 2;
const S1 = { shirt: '#E5484D', height: 'medium', skin: 1 } as const;
const S2 = { shirt: '#F5C518', striped: false, height: 'small', skin: 3 } as const;
const HOLD_Z = -4.15;

export default [
  cutscene('crossing_with_friends', 'setup', async (c) => {
    const w = at(c);
    c.setFlag('traffic', 'off');
    c.setFlag('gateOpen', true);
    c.expr('smile');
    c.robot.place(w(0, HOLD_Z), FACE_SOUTH);
    c.spawn('s1', 'boy', { pos: w(-0.62, -13), rotY: FACE_SOUTH, spec: S1 });
    c.spawn('s2', 'boy', { pos: w(0.62, -13.8), rotY: FACE_SOUTH, spec: S2 });
    await shots.wide(c, w(0, -5.5), -0.15, { dur: 0, zoom: 1.15 });
  }),

  cutscene('crossing_with_friends', 'before', async (c) => {
    const w = at(c);
    const s1 = c.actor('s1');
    const s2 = c.actor('s2');
    const car = c.prop('redcar', 'car', { pos: w(60, -1.1), rotY: Math.PI, params: { color: '#E5484D', lights: 'off', seed: 0 } });

    // Before 1 (0-2): wide from across the street; bell; the boys burst out of the gate and run to the street.
    await shots.wide(c, w(0, -5.5), -0.15, { dur: 0, zoom: 1.15 });
    c.sfx('bell');
    c.sfx('laugh', { volume: 0.5 });
    c.expr('surprised');
    c.robot.face(w(0, -9));
    s1.face(w(-0.62, -4.2));
    s2.face(w(0.62, -4.2));
    c.sfx('footsteps', { volume: 0.6 });
    void s1.walkTo(w(-0.62, -4.25), { speed: 3.3, clip: 'run' });
    void s2.walkTo(w(0.62, -4.25), { speed: 3.3, clip: 'run' });
    await c.wait(1.8);
    c.stopSfx('footsteps');

    // Before 2 (2-3.5): the three at the curb; he steps between them and the road and catches their hands.
    await shots.two(c, c.robot, [s1, s2], { heading: -0.35, zoom: 0.9, dur: 0 });
    c.robot.face(FACE_SOUTH);
    c.sfx('servo');
    c.expr('warning');
    s1.play('stopStepBack', { dur: 1.2 });
    s2.play('stopStepBack', { dur: 1.2 });
    c.robot.flag('holdHand', 'both');
    await c.robot.play('catch', { dur: 1.5 });
    s1.face(FACE_SOUTH);
    s2.face(FACE_SOUTH);
    s1.place(w(-0.62, HOLD_Z), FACE_SOUTH);
    s2.place(w(0.62, HOLD_Z), FACE_SOUTH);
    s1.flag('holdHand', 'left');
    s2.flag('holdHand', 'right');
    s1.play('holdHands');
    s2.play('holdHands');
    c.robot.play('holdHandWalk');

    // Before 3 (3.5-4.5): close on the three looking left; the small red car speeds in from the left.
    c.sfx('engineRoar', { volume: 0.5 });
    c.expr('surprised');
    // wider from the same side: the car comes from the far end of the street and passes in front of them
    await shots.wide(c, w(1.5, -2.8), EAST + 0.35, { dur: 0, zoom: 0.8, height: 1.8 });
    c.robot.lookAt(w(8, -1.1, 0.9));
    s1.lookAt(w(8, -1.1, 0.9));
    s2.lookAt(w(8, -1.1, 0.9));
    car.set({ pos: w(28, -1.1), params: { lights: 'head' } });
    void car.drive([w(28, -1.1), w(-30, -1.1), w(-70, -1.1)], 12.5);
    await c.wait(1.4); // the red car is seen racing in from the left before it reaches the boys

    // Before 4 (4.5-5.5): the car zooms past with a horn; camera shake; leaves and a bag swirl behind it.
    c.sfx('horn');
    c.sfx('carPass');
    await c.wait(0.25);
    c.shake(0.12, 0.4);
    await c.wait(0.2);
    const leaf = c.prop('leaf1', 'leaf', { pos: w(0.5, -1.2, 0.2) });
    const bag = c.prop('bag1', 'plasticBag', { pos: w(0, -1.2, 0.3) });
    void leaf.moveTo(w(-4.5, -3.0, 1.2), 1.1, 'out');
    void bag.moveTo(w(-6, -2.2, 1.6), 1.4, 'out');
    await c.wait(0.65);
    c.robot.lookAt(null);
    s1.lookAt(null);
    s2.lookAt(null);

    // Before 5 (5.5-7): close on the boys, wide-eyed; they look at each other, then up at Alrashed.
    c.expr('worried');
    c.sfx('heartbeat', { volume: 0.4 });
    await shots.close(c, w(0, HOLD_Z), FACE_SOUTH, { dur: 0, zoom: 1.15 });
    s1.face(s2.pos());
    s2.face(s1.pos());
    s1.lookAt(s2.pos());
    s2.lookAt(s1.pos());
    await c.wait(0.8);
    s1.face(FACE_SOUTH);
    s2.face(FACE_SOUTH);
    s1.lookAt(w(0, HOLD_Z, 1.2));
    s2.lookAt(w(0, HOLD_Z, 1.2));
    await c.wait(0.7);
    leaf.remove();
    bag.remove();
    car.remove();
  }),

  // Speech: Alrashed crouched between the boys, still holding hands; at the end he turns to the camera.
  cutscene('crossing_with_friends', 'during', async (c) => {
    const w = at(c);
    await shots.close(c, w(0, HOLD_Z), FACE_SOUTH, { dur: 1.5, zoom: 1.2, height: 1.2 });
    c.actor('s1').lookAt(w(0, HOLD_Z, 0.75));
    c.actor('s2').lookAt(w(0, HOLD_Z, 0.75));
    await c.robot.play('crouch', { dur: 2 });
    c.robot.flag('holdHand', 'both');
    c.robot.flag('holdHandY', 0.45);
    await c.wait(4.2);
    c.robot.flag('turnToCamera', true);
    c.actor('s1').lookAt(null);
    c.actor('s2').lookAt(null);
  }),

  cutscene('crossing_with_friends', 'after', async (c) => {
    const w = at(c);
    const s1 = c.actor('s1');
    const s2 = c.actor('s2');
    const car = c.prop('whitecar', 'car', { pos: w(60, -1.75), rotY: Math.PI, params: { color: '#F4F4F0', lights: 'off', driver: true, seed: 2 } });
    c.robot.flag('turnToCamera', false);
    c.robot.flag('holdHandY', 0.62);
    s1.lookAt(null);
    s2.lookAt(null);

    // After 1 (0-2): from the side; he stands up, holding both hands; they step to the curb.
    c.expr('smile');
    c.robot.face(FACE_SOUTH);
    c.robot.play('holdHandWalk');
    c.sfx('footsteps', { volume: 0.5 });
    const toCurb = together(
      c.robot.walkTo(w(0, -3.75), { speed: 0.9, clip: 'holdHandWalk' }),
      s1.walkTo(w(-0.62, -3.75), { speed: 0.9, clip: 'holdHands' }),
      s2.walkTo(w(0.62, -3.75), { speed: 0.9, clip: 'holdHands' }),
    );
    await shots.follow(c, c.robot, toCurb, { heading: EAST - 0.55, with: [s1, s2] });
    c.stopSfx('footsteps');
    s1.play('holdHands');
    s2.play('holdHands');
    c.robot.play('holdHandWalk');

    // After 2 (2-5): all look left, right, left; a car approaches slowly and stops before the zebra.
    c.expr('lookLRL');
    c.sfx('carPass', { volume: 0.35 });
    await shots.two(c, c.robot, w(7.2, -1.75), { heading: EAST + 0.5, zoom: 0.65, dur: 0 });
    car.set({ pos: w(26, -1.75), params: { lights: 'brake' } });
    void car.drive([w(26, -1.75), w(7.2, -1.75)], 6.5);
    void s1.play('lookLRL', { dur: 2.6 });
    void s2.play('lookLRL', { dur: 2.6 });
    await c.robot.play('lookLRL', { dur: 2.5 });
    c.sfx('screech', { volume: 0.12 });
    await c.wait(0.6);
    s1.play('holdHands');
    s2.play('holdHands');
    c.robot.play('holdHandWalk');

    // After 3 (5-9): tracking from the side; they cross together inside the stripes, holding hands.
    c.status('walking');
    c.expr('happy');
    c.sfx('footsteps', { volume: 0.6 });
    const crossing = together(
      c.robot.walkTo(w(0, 4.4), { speed: 1.5, clip: 'holdHandWalk' }),
      s1.walkTo(w(-0.62, 4.4), { speed: 1.5, clip: 'holdHands' }),
      s2.walkTo(w(0.62, 4.4), { speed: 1.5, clip: 'holdHands' }),
    );
    await shots.follow(c, c.robot, crossing, { heading: EAST - 0.55, with: [s1, s2], zoom: 1.1 });
    c.stopSfx('footsteps');
    car.set({ params: { lights: 'off' } });
    void car.drive([w(7.2, -1.75), w(-60, -1.75)], 5);

    // After 4 (9-12): on the far sidewalk; hands let go, high fives, the boys walk on calmly.
    c.robot.flag('holdHand', false);
    s1.flag('holdHand', false);
    s2.flag('holdHand', false);
    c.expr('hearts');
    s1.face(c.robot.pos());
    s2.face(c.robot.pos());
    c.robot.face(FACE_SOUTH + Math.PI);
    await shots.two(c, s1, s2, { side: 1, zoom: 0.9, dur: 0 });
    s1.play('raiseHand');
    s2.play('raiseHand');
    c.sfx('clap');
    await c.robot.play('wave', { dur: 1.0 });
    c.sfx('clap', { volume: 0.7 });
    await c.wait(0.3);
    // both walk off west; S2 (east of him) goes round behind Alrashed instead of through him
    void s1.walkTo([w(-1.2, 5.0), w(-6, 5.4)], { speed: 1.3 });
    void s2.walkTo([w(0.75, 5.25), w(-0.4, 5.45), w(-5, 5.5)], { speed: 1.3 });
    await c.wait(1.7);
  }),
];
