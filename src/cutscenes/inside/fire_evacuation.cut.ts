import { cutscene } from '../api';
import { headingTo, shots } from '../framing';
import type { BoySpec, Vec3 } from '../../core/types';
import { stairFollow } from './halls.util';

/**
 * fire_evacuation: classroom -> corridor_ground -> stairs -> yard (docs/plan/Inside_scenarios.md section 1).
 * Five boys S1..S5 and a teacher (who closes the line). All coordinates are LOCAL to the active room (c.at).
 * Cameras come from src/cutscenes/framing.ts; the stairs use the shared stair camera (up and from the side).
 */

const SPEC: Record<string, Partial<BoySpec>> = {
  s1: { shirt: '#F5C518', striped: false, height: 'medium', skin: 1, hair: 'black', backpack: null },
  s2: { shirt: '#E5484D', striped: true, height: 'tall', skin: 2, hair: 'brown', backpack: null },
  s3: { shirt: '#7CC4FA', striped: false, height: 'small', skin: 3, hair: 'black', backpack: null },
  s4: { shirt: '#3DBE6E', striped: false, height: 'medium', skin: 0, hair: 'brown', backpack: null },
  s5: { shirt: '#9B6BF2', striped: true, height: 'small', skin: 2, hair: 'black', backpack: null },
};
const IDS = ['s1', 's2', 's3', 's4', 's5'];
const NORTH = Math.PI; // actor facing -Z

/** Seat centres (classroom local [x, z], facing the board = north). */
const SEAT: Record<string, [number, number]> = {
  s1: [1.05, 1.41],
  s2: [1.65, -0.09],
  s3: [-1.05, 1.41],
  s4: [3.65, 1.41],
  s5: [4.25, 2.91],
};
/** Standing spot beside the desk, in the aisle (x) he leaves by. */
const STAND: Record<string, { p: [number, number]; aisle: number }> = {
  s1: { p: [0.5, 1.15], aisle: 0 },
  s2: { p: [2.2, -0.35], aisle: 2.65 },
  s3: { p: [-1.6, 1.15], aisle: -2.65 },
  s4: { p: [3.1, 1.15], aisle: 2.65 },
  s5: { p: [4.8, 2.65], aisle: 5.2 },
};
/**
 * Line behind Alrashed at the classroom door, bending west along the open front of the room (desks start at z -2), and
 * the teacher closing it. Each boy takes the place on the side he comes from (S5 from the east aisle nearest the door,
 * S3 from the west aisle at the far end), so nobody walks through someone already standing in the line; the teacher
 * comes last behind S3. [x, z, facing]
 */
const SLOT: Record<string, [number, number, number]> = {
  s5: [4.85, -3.4, NORTH],
  s2: [4.45, -2.75, NORTH - 0.6],
  s4: [3.85, -2.45, Math.PI / 2 + 0.3],
  s1: [3.15, -2.4, Math.PI / 2 + 0.15],
  s3: [2.45, -2.4, Math.PI / 2 + 0.1],
};
const TEACHER_SLOT: [number, number] = [1.75, -2.45];

export default [
  cutscene('fire_evacuation', 'setup', async (c) => {
    c.robot.place(c.at(0.15, -2.75), 0);
    c.robot.show(true);
    c.expr('smile');
    for (const id of IDS) {
      const s = SEAT[id];
      c.spawn(id, 'boy', { pos: c.at(s[0], s[1]), rotY: NORTH, clip: 'sitDesk', spec: SPEC[id] });
    }
    c.spawn('t1', 'teacher', { pos: c.at(-2.3, -4.35), rotY: NORTH, clip: 'idle' });
    // wide from the back of the class: boys at their desks, Alrashed at the front
    await shots.wide(c, c.at(1.0, -1.2), 0, { dur: 0, zoom: 0.85 });
  }),

  cutscene('fire_evacuation', 'before', async (c) => {
    // 1: the alarm rings, the red light flashes, a thin haze under the door. Everyone looks at the door.
    c.setFlag('alarm', true);
    c.expr('surprised');
    c.sfx('fireAlarm', { loop: true, volume: 0.6 });
    c.prop('haze1', 'smoke', { pos: c.at(4.85, -4.55, 0.1), params: { density: 0.25 } });
    c.prop('haze2', 'smoke', { pos: c.at(4.3, -4.5, 0.1), params: { density: 0.18 } });
    for (const id of [...IDS, 't1']) c.actor(id).lookAt(c.at(4.85, -5, 1.2));
    await c.wait(2);

    // 2: close on Alrashed: calm palm; the boys stand up beside their desks, two reach for their bags; he shakes his head.
    c.stopSfx('fireAlarm');
    c.sfx('fireAlarm', { loop: true, volume: 0.25 });
    c.expr('warning');
    for (const id of [...IDS, 't1']) c.actor(id).lookAt(null);
    for (const id of IDS) {
      c.actor(id).place(c.at(STAND[id].p[0], STAND[id].p[1]), NORTH);
      c.actor(id).play('idle'); // stood up: off the sitDesk pose
    }
    c.actor('s2').hold('backpack');
    c.actor('s4').hold('backpack');
    await shots.close(c, c.robot, 0, { dur: 0 });
    await c.robot.play('stopHand', { dur: 1.4 });
    await c.robot.play('headShake', { dur: 1.2 });
    c.actor('s2').hold(null);
    c.actor('s4').hold(null);
    // 3 (speech): from the west side of the room, Alrashed at the front and the boys standing by their desks
    await shots.two(c, c.robot, [c.actor('s1'), c.actor('s4')], { heading: headingTo(c.at(-5.2, -3.8), c.at(1.6, 0.0)), zoom: 1.0, height: 1.6, dur: 1.0 });
  }),

  // No `during`: the alarm keeps pulsing quietly while the engine plays the speech parts with default gestures.
  cutscene('fire_evacuation', 'after', async (c) => {
    const column = [c.robot, ...IDS.map((id) => c.actor(id)), c.actor('t1')];
    c.stopSfx('fireAlarm');
    c.sfx('fireAlarm', { loop: true, volume: 0.3 });

    // 1: the boys leave everything and line up behind Alrashed at the door (seen from inside the room toward the door).
    c.setFlag('door', 'open');
    c.expr('smile');
    await shots.wide(c, c.at(3.6, -2.4), headingTo(c.at(0.5, 1.5), c.at(4.6, -3.0)), { dur: 0, zoom: 0.75 });
    c.sfx('footsteps', { volume: 0.5 });
    // Alrashed first, along the board (north of where the line forms) to the door
    const walks: Promise<void>[] = [c.robot.walkTo([c.at(3.8, -3.35), c.at(4.85, -4.1)], { speed: 2.0 })];
    const delay: Record<string, number> = { s2: 0.25, s1: 0, s3: 0.5, s4: 0.75, s5: 1.0 };
    IDS.forEach((id) => {
      const s = STAND[id];
      const slot = SLOT[id];
      walks.push(
        (async () => {
          await c.wait(delay[id]);
          await c.actor(id).walkTo([c.at(s.aisle, -1.9), c.at(slot[0], slot[1])], { speed: 1.6 });
          c.actor(id).face(slot[2]);
        })(),
      );
    });
    walks.push(
      (async () => {
        await c.wait(3.0); // the teacher waits until the boys are past, then closes the line
        await c.actor('t1').walkTo([c.at(-1.9, -2.65), c.at(TEACHER_SLOT[0], TEACHER_SLOT[1])], { speed: 1.7 });
        c.actor('t1').face(Math.PI / 2);
      })(),
    );
    await Promise.all(walks);
    c.robot.face(NORTH);
    c.stopSfx('footsteps');
    c.prop('haze1', 'smoke', { pos: c.at(0, 0) }).remove();
    c.prop('haze2', 'smoke', { pos: c.at(0, 0) }).remove();

    // 2: corridor: the line walks toward the camera, bent low, collars over noses, thin smoke under the ceiling.
    await c.go('corridor_ground');
    c.setFlag('exitGlow', true);
    c.expr('explaining');
    const smoke1 = c.prop('cs1', 'smoke', { pos: c.at(22.5, -0.4, 3.1), params: { density: 0.3 } });
    const smoke2 = c.prop('cs2', 'smoke', { pos: c.at(19.5, 0.3, 3.15), params: { density: 0.25 } });
    for (const a of column) a.show(false);
    for (const id of [...IDS, 't1']) {
      c.actor(id).flag('collarUp', true);
      c.actor(id).flag('lookDown', true);
    }
    await shots.wide(c, c.at(21.8, -0.6), Math.PI / 2 + 0.12, { dur: 0, zoom: 0.8, height: 1.7 });
    c.sfx('footsteps', { volume: 0.5 });
    const lane: Vec3[] = [c.at(24.85, 0.6), c.at(23.6, -1.1), c.at(20.9, -1.1), c.at(20.9, -2.3)];
    const out = column.map(async (a, i) => {
      await c.wait(0.65 * i);
      a.place(c.at(24.85, 2.2), NORTH);
      a.show(true);
      await a.walkTo(lane, { speed: 1.5 });
      a.show(false);
    });
    await Promise.all(out);
    c.stopSfx('footsteps');
    smoke1.remove();
    smoke2.remove();

    // 3: the stairs, up and from the side: past the elevator (red cross), down flight 1 keeping right, hand on the rail.
    await c.go('stairs');
    c.expr('warning');
    c.setFlag('exitGlow', true);
    c.setFlag('elevatorCross', true);
    for (const id of [...IDS, 't1']) {
      c.actor(id).flag('collarUp', false);
      c.actor(id).flag('lookDown', false);
    }
    const route: Vec3[] = [c.at(-3.3, -3.45, 2), c.at(-3.3, 0.35, 0), c.at(-3.0, 1.4, 0), c.at(-2.0, 2.6, 0)];
    c.sfx('footsteps', { volume: 0.5 });
    const down = column.map(async (a, i) => {
      a.show(false);
      await c.wait(0.75 * i);
      a.place(c.at(-1.6, -4.3, 2), -Math.PI / 2);
      a.show(true);
      await a.walkTo(route, { speed: 1.3 });
      a.show(false); // on toward the door, out of the shot
    });
    await stairFollow(c, c.actor('s2'), Promise.all(down), { with: [c.robot], zoom: 1.05 });
    c.stopSfx('footsteps');

    // 4: the yard. A: they come out of the main doors.
    await c.go('yard');
    c.expr('happy');
    c.stopSfx('fireAlarm');
    c.sfx('fireAlarm', { loop: true, volume: 0.08 });
    c.sfx('birds', { volume: 0.3 });
    for (const a of column) a.show(false);
    await shots.wide(c, c.at(-2.0, -13.6), -0.15, { dur: 0, zoom: 0.9 });
    const door = c.at(-3, -16.3);
    column.forEach((a, i) => {
      void (async () => {
        await c.wait(0.4 * i);
        a.place(door, 0);
        a.show(true);
        await a.walkTo(c.at(-2.2 + 0.3 * i, -11.5), { speed: 1.6 });
      })();
    });
    await c.wait(2.8);

    // B: the assembly point: they walk in straight and stand in a row facing Alrashed.
    const target: Record<string, [number, number]> = {
      alrashed: [18.0, 7.0],
      s1: [15.9, 9.6],
      s2: [16.8, 9.6],
      s3: [17.7, 9.6],
      s4: [18.6, 9.6],
      s5: [19.5, 9.6],
      t1: [20.4, 9.6],
    };
    // from the south-west, raised so Alrashed (north of the row, facing it) reads over the boys' heads
    const view = headingTo(c.at(13.0, 14.0), c.at(18.0, 8.2));
    column.forEach((a) => {
      const t = target[a.id];
      a.place(c.at(t[0] - 4.0, t[1]), Math.PI / 2);
      a.show(true);
    });
    await shots.two(c, c.at(18.0, 7.0), c.at(18.0, 9.6), { heading: view, zoom: 1.25, height: 2.6, dur: 0 });
    const arrive = column.map(async (a) => {
      const t = target[a.id];
      await a.walkTo(c.at(t[0], t[1]), { speed: 1.7 });
      a.face(a.id === 'alrashed' ? 0 : NORTH);
    });
    await Promise.all(arrive);

    // 5: closer: Alrashed counts the line, a check mark, thumbs up.
    await shots.two(c, c.robot, [c.actor('s3'), c.actor('s5')], { heading: view, zoom: 0.85, height: 2.4, dur: 1.0 });
    c.robot.flag('countTo', 5);
    c.robot.flag('countStep', 0.5);
    c.expr('counting');
    for (let i = 0; i < 5; i++) {
      c.sfx('beep', { volume: 0.5 });
      await c.wait(0.5);
    }
    c.sfx('chime');
    await c.wait(0.5);
    c.expr('proud');
    await c.robot.play('thumbsUp', { dur: 1.8 });
  }),
];
