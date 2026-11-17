import { cutscene } from '../api';
import { shots } from '../framing';
import { CLASSROOM } from '../../world/inside/core/landmarks';
import type { BoySpec } from '../../core/types';

// nosebleed: classroom (local coordinates, boards on the north wall z = -5), then the clinic.
// Camera rule (classroom): from the east / front of S1's desk, so his face and Alrashed (in the aisle west of him) read.
const N = Math.PI; // facing north (-Z)
const E = Math.PI / 2;
const S1_SPEC: Partial<BoySpec> = { shirt: '#F5C518', striped: false, height: 'medium', skin: 1, hair: 'black' };
const S2_SPEC: Partial<BoySpec> = { shirt: '#E5484D', striped: true, height: 'small', skin: 3, hair: 'brown' };
const S3_SPEC: Partial<BoySpec> = { shirt: '#7CC4FA', striped: false, height: 'tall', skin: 2, hair: 'black' };
// S1 sits at row 2, left seat of the second pair from the east (x 1.05); the aisle x = 0 runs beside him.
const SEAT_S1: [number, number] = [1.05, 1.41];
const BESIDE: [number, number] = [0.15, 1.3];

export default [
  cutscene('nosebleed', 'setup', async (c) => {
    // Three boys at their desks, Alrashed by the board.
    const seat = (id: string, x: number, z: number, spec: Partial<BoySpec>) => {
      const b = c.spawn(id, 'boy', { pos: c.at(x, z), rotY: N, spec, clip: 'sitDesk' });
      b.flag('seated', true);
      return b;
    };
    const s1 = seat('s1', SEAT_S1[0], SEAT_S1[1], S1_SPEC);
    seat('s2', -1.65, -0.09, S2_SPEC);
    seat('s3', 1.65, 2.91, S3_SPEC);
    c.robot.place(c.at(CLASSROOM.robotSpot[0], CLASSROOM.robotSpot[2]), 0.3);
    c.expr('smile');
    await shots.two(c, c.robot, s1, { side: 1, zoom: 0.9, height: 1.5, dur: 0 });
  }),

  cutscene('nosebleed', 'before', async (c) => {
    const s1 = c.actor('s1');
    // 1: S1 touches his nose, sees two small red drops and tilts his head back (the wrong way).
    c.expr('worried');
    c.robot.lookAt(s1.pos());
    await c.wait(0.5);
    s1.flag('nosebleed', true);
    c.sfx('pop', { volume: 0.3 }); // gasp
    await shots.close(c, s1, N, { dur: 0, zoom: 0.9 });
    await s1.play('noseTiltBack', { dur: 1.6 });
    s1.play('noseTiltBack');
    // 2: Alrashed walks down the aisle to him, hands him a tissue and levels his head slightly forward.
    c.expr('gentle');
    c.robot.lookAt(null);
    await shots.follow(c, c.robot, c.robot.walkTo([c.at(0.0, -1.9), c.at(BESIDE[0], BESIDE[1])], { speed: 1.6 }), {
      heading: -Math.PI / 2 - 0.35,
      with: [s1],
      zoom: 0.9,
    });
    c.robot.face(s1.pos());
    await shots.two(c, c.robot, s1, { side: 1, zoom: 0.7, height: 1.4, dur: 0 });
    c.robot.hold('gauze', 'right');
    c.sfx('slide', { volume: 0.4 }); // tissue pull
    await c.robot.play('nod', { dur: 1.0 });
    s1.play('noseLeanForward');
    c.robot.hold(null);
    await c.wait(0.8);
  }),

  cutscene('nosebleed', 'after', async (c) => {
    const s1 = c.actor('s1');
    // 1: S1 pinches his nose, Alrashed's face shows the ten-minute timer, ticking in a time-lapse.
    c.robot.flag('timerSecs', 3);
    c.expr('timer');
    c.sfx('click', { loop: true, volume: 0.35 });
    await shots.two(c, c.robot, s1, { side: 1, zoom: 0.6, height: 1.35, dur: 0.6 });
    await c.wait(3.0);
    c.stopSfx('click');
    // 2: the timer completes; S1 lets go; no more drops.
    c.sfx('chime');
    c.expr('happy');
    s1.flag('nosebleed', false);
    s1.play('sitDesk');
    await c.robot.play('thumbsUp', { dur: 1.8 });
    // 3: the clinic: Alrashed walks S1 in; the counselor checks him and gives a thumbs up.
    c.sfx('doorHiss', { volume: 0.4 });
    await c.go('clinic');
    s1.flag('seated', false);
    c.robot.flag('turnToCamera', false);
    const doc = c.spawn('counselor', 'counselor', { pos: c.at(-0.4, -1.4), rotY: E });
    // they come in through the door (x 2.5, north wall): S1 just inside, Alrashed behind him in the doorway
    c.robot.place(c.at(2.45, -3.9), -0.6);
    s1.place(c.at(2.5, -3.25), -0.72);
    s1.play('idle');
    c.expr('smile');
    await shots.two(c, s1, doc, { heading: -0.1, zoom: 1.0, height: 1.45, dur: 0 });
    c.sfx('footsteps', { loop: true, volume: 0.4 });
    void c.robot.walkTo(c.at(1.3, -2.1), { speed: 1.2 });
    await s1.walkTo(c.at(0.7, -1.2), { speed: 1.2 });
    c.stopSfx('footsteps');
    s1.face(doc.pos());
    c.robot.face(doc.pos());
    doc.face(s1.pos());
    await doc.play('thumbsUp', { dur: 1.6 });
    c.expr('hearts');
    c.prop('heart', 'speechBubbleIcon', { pos: c.at(0.7, -1.2, 1.65), params: { icon: 'heart' } });
    await c.wait(1.4);
  }),
];
