import { cutscene } from '../api';
import { headingTo, shots } from '../framing';
import type { BoySpec } from '../../core/types';

/**
 * fire_extinguisher (corridor_ground, docs/plan/Inside_scenarios.md section 2). Only Alrashed uses the extinguisher;
 * the boys stay behind a floor line (red-white tape) and a teacher arrives at the end.
 * Corridor local: x along the corridor (east = +x), north wall z = -2.5, south wall z = +2.5; the red cabinet is on the
 * north wall at x 13.4, the paper bin by the south wall at x 17.6.
 * Camera rule: from the west end looking east (the boys in the foreground, the fire beyond); the close shots of the
 * fight look at Alrashed's front from the north-east.
 */

const SPEC: Record<string, Partial<BoySpec>> = {
  s1: { shirt: '#FF8A3D', striped: false, height: 'medium', skin: 2, hair: 'black', backpack: null },
  s2: { shirt: '#7CC4FA', striped: true, height: 'small', skin: 1, hair: 'brown', backpack: null },
  s3: { shirt: '#F5C518', striped: false, height: 'tall', skin: 3, hair: 'black', backpack: null },
  s4: { shirt: '#3DBE6E', striped: true, height: 'medium', skin: 0, hair: 'brown', backpack: null },
  s5: { shirt: '#FF6FA8', striped: false, height: 'small', skin: 2, hair: 'black', backpack: null },
};
const IDS = ['s1', 's2', 's3', 's4', 's5'];
const BIN: [number, number] = [17.6, 2.18];
/** Where Alrashed stands to fight the fire (1.9 m from the bin), his heading toward it. */
const FIGHT: [number, number] = [15.9, 1.4];
const heading = (from: [number, number], to: [number, number]) => Math.atan2(to[0] - from[0], to[1] - from[1]);
const LOOK_EAST = Math.PI / 2 - 0.2;
/** Behind the tape line (x 9.4), facing the fire. */
const BEHIND: Record<string, [number, number]> = { s1: [7.6, -1.2], s2: [8.5, 1.3], s3: [8.0, 0.2], s4: [6.9, 1.0], s5: [6.8, -0.6] };

export default [
  cutscene('fire_extinguisher', 'setup', async (c) => {
    c.robot.place(c.at(10.3, 0.2), -Math.PI / 2);
    c.robot.show(true);
    c.expr('smile');
    c.spawn('s1', 'boy', { pos: c.at(8.6, -0.5), rotY: 1.2, spec: SPEC.s1 });
    c.spawn('s2', 'boy', { pos: c.at(12.2, 1.4), rotY: -1.5, spec: SPEC.s2, clip: 'talk' });
    c.spawn('s3', 'boy', { pos: c.at(11.4, 1.7), rotY: 1.6, spec: SPEC.s3, clip: 'talk' });
    c.spawn('s4', 'boy', { pos: c.at(7.4, 1.0), rotY: 1.4, spec: SPEC.s4 });
    c.spawn('s5', 'boy', { pos: c.at(7.9, -1.1), rotY: 1.0, spec: SPEC.s5 });
    c.prop('bin-smoke', 'smoke', { pos: c.at(BIN[0], BIN[1], 0.42), params: { density: 0 } });
    await shots.wide(c, c.at(12.8, 0.4), LOOK_EAST, { dur: 0, zoom: 1.1, height: 1.9 });
  }),

  cutscene('fire_extinguisher', 'before', async (c) => {
    const s2 = c.actor('s2');
    const s3 = c.actor('s3');
    // 1: the bin smokes, then a small flame; two boys notice, S2 runs to Alrashed and points.
    c.sfx('confetti', { loop: true, volume: 0.12 }); // low crackle
    c.prop('bin-smoke', 'smoke', { pos: c.at(BIN[0], BIN[1], 0.45), params: { density: 0.35 } });
    c.expr('surprised');
    s3.face(c.at(BIN[0], BIN[1]));
    s3.play('lookUpSurprised', { dur: 1.6 });
    await c.wait(1.3);
    c.prop('bin-fire', 'fire', { pos: c.at(BIN[0], BIN[1], 0.4), params: { size: 0.35 } });
    s2.face(c.at(BIN[0], BIN[1]));
    await s2.play('lookUpSurprised', { dur: 1.0 });
    c.robot.face(s2.pos());
    c.sfx('footsteps', { volume: 0.5 });
    await s2.walkTo(c.at(11.1, 0.5), { clip: 'run', speed: 3.0 });
    await shots.two(c, s2, c.robot, { heading: LOOK_EAST, zoom: 0.75, dur: 0 });
    s2.face(c.robot.pos());
    s2.play('point', { dur: 1.2 });
    c.robot.lookAt(c.at(BIN[0], BIN[1], 0.6));
    c.stopSfx('footsteps');
    await c.wait(1.0);

    // 2: he sends the boys back behind him, takes the extinguisher out of the red cabinet.
    c.expr('warning');
    c.robot.lookAt(null);
    c.robot.face(c.at(7, 0.2));
    await c.robot.play('stopHand', { dur: 1.2 });
    for (const id of IDS) {
      const [x, z] = BEHIND[id];
      c.actor(id).place(c.at(x, z), Math.PI / 2);
    }
    c.robot.place(c.at(13.4, -1.6), Math.PI);
    await shots.two(c, c.robot, c.at(13.4, -2.4), { heading: Math.PI / 2 + 0.35, zoom: 0.7, height: 1.5, dur: 0 });
    c.sfx('click');
    c.setFlag('extinguisherGone', true); // the cabinet is empty now
    await c.robot.play('catch', { dur: 1.0 });
    c.robot.hold('extinguisher');
    // 3 (speech): the floor line, the boys behind it, Alrashed with the extinguisher facing them.
    c.prop('line', 'barrierTape', { pos: c.at(9.4, 0), rotY: Math.PI / 2, params: { length: 4.6 } });
    c.robot.place(c.at(11.4, 0.3), -Math.PI / 2);
    await shots.two(c, c.robot, [c.actor('s3'), c.actor('s2')], { heading: LOOK_EAST, zoom: 0.9, height: 1.75, dur: 0 });
  }),

  // No `during`: the engine's default gestures hold him explaining while he holds the extinguisher.
  cutscene('fire_extinguisher', 'after', async (c) => {
    const toBin = heading(FIGHT, BIN);
    const FRONT = headingTo(c.at(18.6, -1.9), c.at(16.4, 1.5));
    // 1: he walks to 2 m from the bin and pulls the pin.
    c.status('walking');
    c.expr('explaining');
    c.sfx('footsteps', { volume: 0.5 });
    await shots.follow(c, c.robot, c.robot.walkTo(c.at(FIGHT[0], FIGHT[1]), { speed: 1.4 }), { heading: Math.PI - 0.5, zoom: 0.9 });
    c.stopSfx('footsteps');
    c.robot.face(toBin);
    await shots.two(c, c.robot, c.at(BIN[0], BIN[1]), { heading: FRONT, zoom: 0.8, height: 1.4, dur: 0 });
    c.robot.play('extinguisher', { speed: 0.5 });
    c.expr('proud');
    c.sfx('click', { volume: 0.9 }); // pin clink
    c.sfx('ding', { volume: 0.5 });
    await c.wait(2.0);

    // 2: he aims the hose at the base of the flame and squeezes; white powder sprays.
    c.expr('focused');
    await c.wait(1.0);
    c.expr('explaining');
    const spray = c.prop('spray', 'extinguisherSpray', { pos: c.at(FIGHT[0] + 0.6 * Math.sin(toBin), FIGHT[1] + 0.6 * Math.cos(toBin), 0.6), rotY: toBin }); // from the nozzle in his hand
    c.sfx('spray', { loop: true, volume: 0.6 });
    await c.wait(2.0);

    // 3: he sweeps left and right; the flame goes out under the powder cloud.
    c.expr('proud');
    spray.set({ rotY: toBin + 0.22 });
    await c.wait(0.7);
    spray.set({ rotY: toBin - 0.22 });
    await c.wait(0.7);
    c.prop('bin-fire', 'fire', { pos: c.at(BIN[0], BIN[1], 0.4), params: { size: 0.35, out: true } });
    c.sfx('spray', { volume: 0.3 });
    await c.wait(0.6);
    c.stopSfx('spray');
    c.stopSfx('confetti');
    spray.remove();
    c.prop('powder', 'dustCloud', { pos: c.at(BIN[0] - 0.2, BIN[1] - 0.2, 0.6), params: { color: '#FFFFFF', radius: 0.6 } });

    // 4: wide from the west: he puts the extinguisher down, thumbs up to the boys; they clap; a teacher arrives.
    c.expr('hearts');
    c.robot.play('idle');
    await c.robot.play('crouch', { dur: 1.0 });
    c.robot.hold(null);
    // the extinguisher stays on the floor where he set it down (beside his right foot, nozzle toward the bin)
    c.prop('extDown', 'extinguisher', {
      pos: c.at(FIGHT[0] - 0.32 * Math.cos(toBin) + 0.22 * Math.sin(toBin), FIGHT[1] + 0.32 * Math.sin(toBin) + 0.22 * Math.cos(toBin)),
      rotY: toBin,
    });
    const teacher = c.spawn('t1', 'teacher', { pos: c.at(4.6, -2.0), rotY: Math.PI / 2, clip: 'walk' });
    c.robot.place(c.at(12.6, 0.4), -Math.PI / 2);
    await shots.two(c, c.robot, [c.actor('s3'), c.actor('s2')], { heading: LOOK_EAST, zoom: 0.9, height: 1.9, dur: 0 });
    void teacher.walkTo(c.at(8.8, -2.0), { speed: 1.4 });
    c.sfx('clap');
    for (const id of IDS) {
      c.actor(id).play('clap');
      c.actor(id).lookAt(c.robot.pos());
    }
    await c.robot.play('thumbsUp', { dur: 1.8 });
    c.sfx('cheer', { volume: 0.4 });
    await c.wait(1.2);
  }),
];
