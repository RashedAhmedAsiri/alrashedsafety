import { cutscene } from '../api';
import { headingTo, shots } from '../framing';
import type { BoySpec, Vec3 } from '../../core/types';

// heat_water: yard, sunny afternoon break. WORLD coordinates via W(): the yard origin is z = -22.
const E = Math.PI / 2;
const S1_SPEC: Partial<BoySpec> = { shirt: '#7CC4FA', striped: false, height: 'medium', skin: 2, hair: 'black', backpack: '#2F6FB0' };
const S2_SPEC: Partial<BoySpec> = { shirt: '#FF8A3D', striped: true, height: 'small', skin: 1, hair: 'brown' };
const S3_SPEC: Partial<BoySpec> = { shirt: '#E5484D', striped: false, height: 'tall', skin: 3, hair: 'black' };
const S4_SPEC: Partial<BoySpec> = { shirt: '#FF6FA8', striped: false, height: 'medium', skin: 0, hair: 'black' };
const BENCH: [number, number] = [18.0, -38.7]; // arcade bench (between the columns at x 16 and 20), shaded, faces south
/** Where the other boys stop to watch once the chase ends: east of S1's walk, clear of the trailing camera. */
const WATCH: Record<string, [number, number]> = { s2: [19.6, -33.5], s3: [17.4, -29.0], s4: [18.4, -29.9] };
/** Camera headings: the chase from the south-west of the square; at the bench from the yard (south) looking north. */
const chaseH = (W: (x: number, z: number) => Vec3) => headingTo(W(8, -22), W(16.5, -31));
const BENCH_H = 0.3;
const CHASE: [number, number][] = [[13.5, -28], [18.5, -28], [18.5, -32], [13.5, -32]];

export default [
  cutscene('heat_water', 'setup', async (c) => {
    const W = (x: number, z: number, y = 0): Vec3 => c.at(x, z + 22, y);
    c.setFlag('schoolPeople', false);
    c.spawn('s1', 'boy', { pos: W(14.5, -28), rotY: 0, spec: S1_SPEC, clip: 'run' });
    c.spawn('s2', 'boy', { pos: W(16.5, -32), rotY: 0, spec: S2_SPEC, clip: 'run' });
    c.spawn('s3', 'boy', { pos: W(18.5, -30), rotY: 0, spec: S3_SPEC, clip: 'run' });
    c.spawn('s4', 'boy', { pos: W(13.5, -30), rotY: 0, spec: S4_SPEC, clip: 'run' });
    c.robot.place(W(12.2, -25.8), -E - 0.4);
    c.expr('sunDrop');
    await shots.wide(c, W(16.0, -30.0), chaseH(W), { dur: 0, zoom: 1.3, height: 2.6 });
  }),

  cutscene('heat_water', 'before', async (c) => {
    const W = (x: number, z: number, y = 0): Vec3 => c.at(x, z + 22, y);
    const s1 = c.actor('s1');
    const s2 = c.actor('s2');
    let chasing = true;
    // each boy runs round the sunny square from a different corner
    const runLoop = async (id: string, start: number, speed: number) => {
      const a = c.actor(id);
      let i = start;
      try {
        while (chasing) {
          i = (i + 1) % CHASE.length;
          const [x, z] = CHASE[i];
          await a.walkTo(W(x, z), { speed, clip: 'run' });
          if (!chasing) break;
        }
        // stop running (no run cycle on the spot): walk to a watching spot and look at S1
        if (id !== 's1') {
          await a.walkTo(W(WATCH[id][0], WATCH[id][1]), { speed: 1.2 });
          a.play('idle');
          a.face(s1.pos());
        }
      } catch {
        /* aborted */
      }
    };
    void runLoop('s1', 0, 2.6);
    void runLoop('s2', 2, 2.8);
    void runLoop('s3', 1, 2.6);
    void runLoop('s4', 3, 2.8);
    // Before 1 (0-3 s): wide, boys chase in full sun; a sun icon pulses on Alrashed's screen.
    c.sfx('birds', { loop: true, volume: 0.2 });
    c.sfx('laugh', { volume: 0.12 });
    c.robot.lookAt(W(16, -30, 1.0));
    await c.wait(3);
    // Before 2 (3-5 s): medium on S1; he slows, wipes his forehead and holds his head.
    c.expr('worried');
    chasing = false;
    c.sfx('heartbeat', { loop: true, volume: 0.3 });
    await s1.walkTo(W(15.3, -29.6), { speed: 1.0 });
    s1.face(c.robot.pos());
    await shots.close(c, s1, Math.atan2(c.robot.pos()[0] - s1.pos()[0], c.robot.pos()[2] - s1.pos()[2]), { dur: 0, zoom: 1.1 });
    s1.play('wipeForehead', { dur: 1.2 });
    await c.wait(1.2);
    s1.play('holdHead');
    await c.wait(0.8);
    c.stopSfx('heartbeat');
    // Before 3 (5-8 s): tracking; Alrashed walks S1 to the shaded bench and points to his water bottle.
    c.expr('gentle');
    c.robot.lookAt(null);
    c.sfx('footsteps', { loop: true, volume: 0.35 });
    c.robot.flag('handOnShoulder', 'l');
    c.robot.place(W(14.6, -29.9), Math.PI);
    void c.robot.walkTo(W(BENCH[0] - 1.0, BENCH[1] + 0.9), { speed: 1.5 });
    await shots.follow(c, s1, s1.walkTo(W(BENCH[0], BENCH[1] + 1.1), { speed: 1.5 }), { heading: chaseH(W), with: [c.robot], zoom: 1.0 });
    c.stopSfx('footsteps');
    c.robot.flag('handOnShoulder', false);
    s1.place(W(BENCH[0], BENCH[1]), 0);
    s1.flag('seated', true);
    s1.play('sit');
    c.robot.face(s1.pos());
    await shots.two(c, s1, c.robot, { heading: BENCH_H, zoom: 0.9, height: 1.4, dur: 0 });
    await c.robot.play('point', { dur: 1.4 });
    c.sfx('click', { volume: 0.4 }); // zipper
    s1.hold('waterBottle', 'right');
    // Before 4 (8-10 s): close on the bottle; he sips; a friend offers a soda can, he shakes his head.
    s2.play('idle');
    s2.hold('sodaCan', 'right');
    // S2 comes over from his watching spot to the front-right of the bench (clear of S1's knees, Alrashed and the column)
    void s2.walkTo(W(BENCH[0] + 0.7, BENCH[1] + 0.75), { speed: 2.2 });
    await s1.play('drink', { dur: 2.0 });
    s2.face(s1.pos());
    s1.play('headShake', { dur: 1.2 });
    c.expr('hearts');
    await c.wait(1.3);
    s1.play('sit');
    s2.hold(null);
    s2.walkTo(W(BENCH[0] - 2.2, BENCH[1] + 1.6), { speed: 1.2 });
    c.stopSfx('birds');
    // Speaking arrangement: slow push-in, Alrashed in the shade beside S1.
    c.robot.place(W(BENCH[0] - 1.1, BENCH[1] + 0.3), E * -1 + 0.2 + Math.PI);
    c.robot.flag('turnToCamera', true);
    c.expr('explaining');
    c.sfx('wind', { loop: true, volume: 0.1 });
    await shots.two(c, c.robot, s1, { heading: BENCH_H, zoom: 0.85, height: 1.4, dur: 0 });
  }),
];
