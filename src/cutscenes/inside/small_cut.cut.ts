import { cutscene } from '../api';
import { headingTo, shots } from '../framing';
import type { BoySpec } from '../../core/types';

// small_cut: before in the yard (at() = offset from the yard origin), then the clinic (local coordinates).
// Clinic: bed along the west wall (S1 sits on its edge at (-3.05,-0.3) facing east), sink on the north wall at x -1.1.
// Camera rule in the clinic: from the south-east corner looking north-west, so S1 and Alrashed face it.
const S1_SPEC: Partial<BoySpec> = { shirt: '#9B6BF2', striped: false, height: 'medium', skin: 2, hair: 'black' };
const E = Math.PI / 2; // facing +X
const N = Math.PI; // facing north (-Z)
const W = -Math.PI / 2;
const BED: [number, number] = [-3.05, -0.3];

export default [
  cutscene('small_cut', 'setup', async (c) => {
    // S1 walks across the yard, Alrashed stands nearby.
    c.setFlag('schoolPeople', false);
    const s1 = c.spawn('s1', 'boy', { pos: c.at(-3.6, 1.0), rotY: E, spec: S1_SPEC, clip: 'walk' });
    c.robot.place(c.at(0.6, 1.9), W + 0.2);
    c.expr('worried');
    await shots.two(c, s1, c.robot, { heading: 0, zoom: 1.0, dur: 0 });
  }),

  cutscene('small_cut', 'before', async (c) => {
    const s1 = c.actor('s1');
    // 1: S1 trips and lands softly on one knee; a small red scrape appears.
    c.expr('worried');
    c.robot.lookAt(s1.pos());
    await s1.walkTo(c.at(-1.6, 1.0), { speed: 1.3 });
    s1.play('trip', { dur: 1.5 });
    c.sfx('thud', { volume: 0.5 });
    await c.wait(1.1);
    s1.flag('scrape', true);
    c.sfx('cough', { volume: 0.2 }); // soft "ouch" sigh
    await c.wait(0.6);
    // 2: Alrashed comes over and kneels beside him, then helps him up.
    s1.play('idle');
    c.robot.lookAt(null);
    await c.robot.walkTo(c.at(-0.7, 1.3), { speed: 1.6 });
    c.robot.face(s1.pos());
    await shots.two(c, s1, c.robot, { heading: 0, zoom: 0.7, height: 1.3, dur: 0 });
    c.expr('worried');
    await c.robot.play('kneel', { dur: 1.6 });
    // 3: they walk together toward the building.
    c.robot.play('idle');
    c.robot.flag('handOnShoulder', 'l');
    c.expr('smile');
    c.sfx('footsteps', { loop: true, volume: 0.4 });
    s1.face(N);
    c.robot.face(N);
    const walk = Promise.all([c.robot.walkTo(c.at(-1.1, -1.4), { speed: 0.9 }), s1.walkTo(c.at(-1.6, -1.4), { speed: 0.9 })]);
    await shots.follow(c, c.robot, walk, { heading: -Math.PI / 2 - 0.3, with: [s1], zoom: 0.9 });
    await c.go('clinic');
    c.stopSfx('footsteps');
    // Speech: S1 sits on the bed edge, Alrashed beside him.
    c.robot.flag('handOnShoulder', false);
    c.robot.play('idle');
    s1.place(c.at(BED[0], BED[1]), E);
    s1.flag('seated', true);
    s1.flag('seatH', 0.74);
    s1.play('sit');
    s1.flag('scrape', true);
    c.robot.place(c.at(-1.6, -0.9), W + 0.5);
    c.robot.flag('turnToCamera', true);
    c.expr('gentle');
    await shots.two(c, c.robot, s1, { heading: headingTo(c.at(1.8, 2.6), c.at(-2.2, -0.8)), zoom: 1.0, height: 1.5, dur: 0 });
  }),

  cutscene('small_cut', 'after', async (c) => {
    const s1 = c.actor('s1');
    const H = headingTo(c.at(1.8, 2.6), c.at(-2.2, -0.8));
    c.robot.flag('turnToCamera', false);
    c.robot.flag('handOnShoulder', false);
    c.prop('kit', 'firstAidKit', { pos: c.at(-0.4, -3.8, 1.02), rotY: 0 });
    // 1: at the sink: soap, water, gloves.
    c.robot.place(c.at(-1.05, -3.05), N);
    await shots.two(c, c.robot, s1, { heading: H, zoom: 0.85, height: 1.5, dur: 0 });
    c.expr('explaining');
    c.setFlag('tap', true);
    c.sfx('tap', { loop: true, volume: 0.4 });
    await c.robot.play('washHands', { dur: 1.5 });
    c.setFlag('tap', false);
    c.stopSfx('tap');
    c.sfx('click', { volume: 0.5 }); // glove snap
    await c.robot.play('gloves', { dur: 1.5 });
    // 2: at the knee: rinse with clean water from a bottle in his hand, pat dry with gauze.
    c.expr('gentle');
    c.robot.hold('waterBottle', 'right');
    c.robot.place(c.at(-2.55, -1.05), 0.4);
    await shots.two(c, c.robot, s1, { heading: H, zoom: 0.7, height: 1.3, dur: 0 });
    c.robot.play('crouch', { dur: 0.9 });
    c.sfx('splash', { volume: 0.4 });
    await c.wait(1.1);
    c.robot.hold('gauze', 'right');
    c.robot.play('bandage', { dur: 1.6 });
    c.sfx('tap', { volume: 0.3 });
    await c.wait(1.6);
    // 3: one spray of antiseptic.
    c.expr('explaining');
    c.sfx('spray', { volume: 0.6 });
    await c.robot.play('point', { dur: 1.6 });
    // 4: a colorful bandage over it.
    c.robot.hold('bandage', 'right');
    c.sfx('slide', { volume: 0.4 });
    c.robot.play('bandage', { dur: 1.8 });
    await c.wait(1.0);
    s1.flag('bandage', true);
    s1.flag('scrape', false);
    c.sfx('click', { volume: 0.4 });
    c.expr('proud');
    await c.wait(1.0);
    c.robot.hold(null);
    // 5: S1 smiles and stands; the counselor walks over and gives him a sticker.
    const doc = c.spawn('counselor', 'counselor', { pos: c.at(1.6, -2.6), rotY: W });
    s1.flag('seated', false);
    s1.flag('seatH', 0.3);
    s1.place(c.at(-2.35, 0.35), E); // stands clear of the bed's step stool (x -3.06..-2.64, z -0.28..0.08)
    s1.play('idle');
    s1.flag('face', 'happy');
    c.robot.place(c.at(-3.3, 1.2), N - 0.5);
    await shots.two(c, s1, c.at(-1.2, -0.4), { heading: H, zoom: 0.9, height: 1.45, dur: 0 });
    await doc.walkTo(c.at(-1.3, -0.4), { speed: 1.5 });
    doc.face(s1.pos());
    const sticker = c.prop('sticker', 'paperStar', { pos: c.at(-1.6, -0.3, 1.1), scale: 0.5 });
    await sticker.moveTo(c.at(-2.2, 0.3, 1.0), 0.8);
    c.sfx('chime');
    c.expr('hearts');
    c.prop('heart', 'speechBubbleIcon', { pos: c.at(-2.35, 0.35, 1.7), params: { icon: 'heart' } });
    await s1.play('thumbsUp', { dur: 1.6 });
    await c.wait(0.6);
  }),
];
