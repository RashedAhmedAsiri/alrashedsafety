import { cutscene } from '../api';
import { headingTo, shots } from '../framing';
import type { BoySpec, Vec3 } from '../../core/types';

/**
 * power_outage: classroom -> corridor_ground, afternoon (docs/plan/Inside_scenarios.md section 13).
 * The room goes dark but never black: the engine's `lights: 'off'` flag, `exitGlow` for the green emergency strips and
 * Alrashed's `glow` face as the key light. Cameras: from the south-west of the class looking toward the door (north-east);
 * in the corridor from the west end looking east as the line comes toward the elevator.
 */

const SPEC: Record<string, Partial<BoySpec>> = {
  s1: { shirt: '#E5484D', striped: false, height: 'medium', skin: 1, hair: 'black', backpack: null },
  s2: { shirt: '#FFFFFF', striped: true, height: 'small', skin: 2, hair: 'brown', backpack: null },
  s3: { shirt: '#FF8A3D', striped: false, height: 'tall', skin: 3, hair: 'black', backpack: null },
  s4: { shirt: '#9B6BF2', striped: false, height: 'medium', skin: 0, hair: 'brown', backpack: null },
  s5: { shirt: '#3DBE6E', striped: true, height: 'small', skin: 2, hair: 'black', backpack: null },
};
const IDS = ['s1', 's2', 's3', 's4', 's5'];
const NORTH = Math.PI;
/** Seats (classroom local [x, z]) near the east side so the line toward the door is short. */
const SEAT: Record<string, [number, number]> = {
  s1: [3.65, -0.09],
  s2: [4.25, -0.09],
  s3: [3.65, 1.41],
  s4: [4.25, 1.41],
  s5: [4.25, 2.91],
};
/** Which aisle each boy uses: the west seat of a desk pair leaves by x 2.65, the east seat by x 5.2. */
const AISLE: Record<string, number> = { s1: 2.65, s2: 5.2, s3: 2.65, s4: 5.2, s5: 5.2 };

export default [
  cutscene('power_outage', 'setup', async (c) => {
    c.setFlag('lights', 'on');
    c.robot.place(c.at(0.15, -2.75), 0.5);
    c.robot.show(true);
    c.expr('smile');
    for (const id of IDS) c.spawn(id, 'boy', { pos: c.at(SEAT[id][0], SEAT[id][1]), rotY: NORTH, clip: 'sitDesk', spec: SPEC[id] });
    c.spawn('t1', 'teacher', { pos: c.at(-2.3, -4.35), rotY: NORTH, clip: 'point' });
    await shots.wide(c, c.at(1.2, -1.4), 0.15, { dur: 0, zoom: 0.85 });
  }),

  cutscene('power_outage', 'before', async (c) => {
    const H = headingTo(c.at(-1.6, 3.6), c.at(2.2, -1.0));
    // 1: a normal lesson; the teacher writes on the board.
    c.sfx('click', { volume: 0.2 });
    await c.wait(2.0);

    // 2: power drops; green emergency lights flick on; Alrashed's face glows.
    c.sfx('powerDown');
    c.setFlag('lights', 'off');
    c.setFlag('exitGlow', true);
    c.expr('surprised');
    c.sfx('thud', { volume: 0.5 });
    await c.wait(0.9);
    c.expr('glow');
    await c.wait(0.6);

    // 3: two boys jump up startled; he raises a calm palm and they sit back down.
    await shots.two(c, c.robot, [c.actor('s1'), c.actor('s3')], { heading: H, zoom: 0.85, height: 1.5, dur: 0 });
    c.shake(0.03, 2.0);
    for (const id of ['s1', 's3']) {
      const a = c.actor(id);
      // up into the aisle beside the chair, clear of the desk corner (desk x >= 3.35, z <= -0.3) and the chair
      a.place(c.at(SEAT[id][0] - 0.7, SEAT[id][1] + 0.02), NORTH);
      a.play('lookUpSurprised', { dur: 1.2 });
    }
    c.sfx('murmur', { volume: 0.4 });
    await c.wait(0.9);
    c.robot.face(c.at(3.0, 0.6));
    await c.robot.play('stopHand', { dur: 1.6 });
    for (const id of ['s1', 's3']) {
      const a = c.actor(id);
      a.place(c.at(SEAT[id][0], SEAT[id][1]), NORTH);
      a.play('sitDesk');
    }
    c.expr('glow');
    await c.wait(0.6);
  }),

  cutscene('power_outage', 'during', async (c) => {
    // His glowing face lights the boys; he points to the wall, the green lights and the door.
    const H = headingTo(c.at(-1.6, 3.6), c.at(2.2, -1.0));
    c.robot.face(c.at(3.0, 0.6));
    c.expr('glow');
    await shots.two(c, c.robot, [c.actor('s1'), c.actor('s4')], { heading: H, zoom: 0.9, height: 1.5, dur: 1.0 });
    const targets = [c.at(5.9, -2.0, 2.4), c.at(4.85, -5, 1.2)]; // green lights, door
    for (let i = 0; ; i++) {
      c.robot.lookAt(targets[i % 2]);
      await c.robot.play('point', { dur: 1.8 });
      c.robot.lookAt(null);
      await c.robot.play('explain1', { dur: 3.0 });
    }
  }),

  cutscene('power_outage', 'after', async (c) => {
    const column = () => [c.robot, ...IDS.map((id) => c.actor(id)), c.actor('t1')];
    c.robot.lookAt(null);
    c.robot.play('idle');
    c.expr('glow');

    // 1: on the teacher's signal the boys walk in a line, one hand on the wall, to the green exit sign.
    c.setFlag('door', 'open');
    c.actor('t1').play('point', { dur: 1.2 });
    await shots.wide(c, c.at(3.8, -2.4), headingTo(c.at(0.5, 1.5), c.at(4.6, -3.0)), { dur: 0, zoom: 0.75 });
    for (const id of IDS) {
      const a = c.actor(id);
      a.place(c.at(AISLE[id], SEAT[id][1]), NORTH);
      a.play('idle');
    }
    c.status('walking');
    c.sfx('footsteps', { volume: 0.4 });
    // Alrashed leads: the boys set off once he is ahead of them, so nobody walks into him; he steps out of sight
    // through the door before the first boy reaches it.
    const line: Promise<void>[] = [
      (async () => {
        await c.robot.walkTo([c.at(4.85, -2.6), c.at(4.85, -5.6)], { speed: 1.4 });
        c.robot.show(false);
      })(),
    ];
    IDS.forEach((id, i) => {
      line.push(
        (async () => {
          await c.wait(0.5 * i + 1.8);
          const a = c.actor(id);
          await a.walkTo([c.at(AISLE[id], -2.0), c.at(4.85, -3.0), c.at(4.85, -5.6)], { speed: 1.4 });
          a.show(false);
        })(),
      );
    });
    line.push(
      (async () => {
        await c.wait(3.2);
        await c.actor('t1').walkTo([c.at(-2.3, -2.0), c.at(4.4, -2.4), c.at(4.85, -5.6)], { speed: 1.6 });
        c.actor('t1').show(false);
      })(),
    );
    await Promise.all(line);
    c.stopSfx('footsteps');

    // 2: the corridor: the line comes toward the elevator; he points at it and a red cross appears on its door.
    await c.go('corridor_ground');
    c.expr('glow');
    for (const a of column()) a.show(false);
    const LOOK_EAST = Math.PI / 2 - 0.2;
    await shots.wide(c, c.at(19.6, -0.6), LOOK_EAST, { dur: 0, zoom: 0.8, height: 1.7 });
    c.sfx('footsteps', { volume: 0.4 });
    const going = column().map(async (a, i) => {
      await c.wait(0.7 * i);
      a.place(c.at(24.85, 2.2), NORTH);
      a.show(true);
      const stop: Vec3 = i === 0 ? c.at(16.9, -1.6) : c.at(17.6 + 0.8 * i, -1.1);
      await a.walkTo([c.at(23.6, -1.1), stop], { speed: 1.1 });
      a.face(-Math.PI / 2);
    });
    await going[0];
    c.robot.face(c.at(16.75, -2.5));
    c.expr('warning');
    c.robot.play('point', { dur: 1.2 });
    c.sfx('click');
    await c.wait(0.4);
    c.prop('cross', 'speechBubbleIcon', { pos: c.at(16.75, -2.3, 2.1), params: { icon: 'cross' } });
    c.setFlag('elevatorCross', true);
    c.sfx('beep', { volume: 0.4 });
    await Promise.all(going);
    c.stopSfx('footsteps');

    // 3: the lights return; the boys smile and clap; power-up whoosh.
    c.robot.face(c.at(20, -1.1));
    await shots.two(c, c.robot, [c.actor('s2'), c.actor('s4')], { heading: LOOK_EAST, zoom: 0.9, height: 1.6, dur: 0.8 });
    c.setFlag('lights', 'on');
    c.setFlag('exitGlow', false);
    c.sfx('powerUp');
    c.sfx('whoosh', { volume: 0.4 });
    c.expr('happy');
    await c.wait(0.4);
    c.sfx('clap');
    for (const a of column()) {
      if (a.id !== 'alrashed') a.play('clap');
    }
    c.robot.play('clap');
    c.sfx('cheer', { volume: 0.4 });
    await c.wait(2.2);
  }),
];
