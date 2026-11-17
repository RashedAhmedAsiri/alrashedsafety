import { cutscene } from '../api';
import { shots } from '../framing';
import { slideTo } from './halls.util';
import type { BoySpec } from '../../core/types';

// art_room, local coordinates. Hero table centre (0,-0.5), 2.6 x 1.3, top 0.64. S1..S3 sit on stools on its north side
// facing south; Alrashed stands at the south-east corner. Camera rule: always from the south (front of the boys),
// slightly east, so the boys' faces and Alrashed read.
const N = Math.PI;
const FRONT = -0.25; // camera heading: looking north, a little west
const S1_SPEC: Partial<BoySpec> = { shirt: '#9B6BF2', striped: false, height: 'medium', skin: 2 };
const S2_SPEC: Partial<BoySpec> = { shirt: '#F5C518', striped: true, height: 'small', skin: 0 };
const S3_SPEC: Partial<BoySpec> = { shirt: '#E5484D', striped: false, height: 'tall', skin: 3 };

export default [
  cutscene('sharp_tools', 'setup', async (c) => {
    // Speaking setup: at the art table, round-tip scissors closed, blades pointing down. Boys on the stools.
    c.setFlag('stars', false);
    const s1 = c.spawn('s1', 'boy', { pos: c.at(-0.8, -1.42), rotY: 0, spec: S1_SPEC, clip: 'sitDesk' });
    const s2 = c.spawn('s2', 'boy', { pos: c.at(0, -1.42), rotY: 0, spec: S2_SPEC, clip: 'sitDesk' });
    const s3 = c.spawn('s3', 'boy', { pos: c.at(0.8, -1.42), rotY: 0, spec: S3_SPEC, clip: 'sitDesk' });
    for (const s of [s1, s2, s3]) s.flag('seated', true);
    c.robot.place(c.at(1.2, 0.5), N - 0.5);
    c.robot.flag('turnToCamera', true);
    c.robot.hold('scissors', 'right');
    c.expr('explaining');
    await shots.two(c, c.robot, [s1, s3], { heading: FRONT, zoom: 0.75, height: 1.55, dur: 0 });
  }),

  cutscene('sharp_tools', 'during', async (c) => {
    // He turns the closed scissors in his hand while explaining. Pencil scratches, soft music.
    for (let i = 0; ; i++) {
      await c.robot.play(['explain1', 'explain2', 'explain3'][i % 3] as 'explain1', { dur: 2.6 });
    }
  }),

  cutscene('sharp_tools', 'after', async (c) => {
    const s1 = c.actor('s1');
    const s2 = c.actor('s2');
    const s3 = c.actor('s3');
    c.robot.flag('turnToCamera', false);
    // 1: S1 cuts a paper star, blades moving away from his fingers.
    c.expr('smile');
    c.robot.hold(null);
    c.robot.face(s1.pos());
    await shots.close(c, s1, 0, { side: -1, zoom: 0.85, height: 1.3, dur: 0 });
    s1.hold('scissors', 'right');
    s1.play('cut');
    c.sfx('snip', { loop: true, volume: 0.5 });
    await c.wait(2.2);
    c.stopSfx('snip');
    c.prop('star1', 'paperStar', { pos: c.at(-0.8, -0.9, 0.65), rotY: 0, scale: 1 });
    s1.play('sitDesk');
    await c.wait(0.6);
    // 2: S1 passes the closed scissors handle-first to S2; Alrashed nods.
    c.expr('proud');
    await shots.two(c, s1, s2, { heading: FRONT, zoom: 0.8, height: 1.35, dur: 0 });
    s1.face(c.at(0, -1.0));
    s2.face(c.at(-0.8, -1.0));
    await c.wait(0.8);
    s1.hold(null);
    s2.hold('scissors', 'left');
    c.sfx('ding');
    await c.wait(0.6);
    c.robot.face(s2.pos());
    await c.robot.play('nod', { dur: 1.2 });
    s2.hold(null);
    s1.face(0);
    s2.face(0);
    // 3: S3 stands up waving open scissors; Alrashed points to the stool; S3 sits back down.
    c.expr('warning');
    s3.flag('seated', false);
    s3.hold('scissors', 'right');
    s3.place(c.at(1.1, -1.8), 0);
    s3.play('wave');
    // east of the table end, clear of the end stool (1.72, -0.5), facing S3
    c.robot.place(c.at(2.05, -1.35), -Math.PI / 2 - 0.45);
    await shots.two(c, c.robot, s3, { heading: FRONT, zoom: 0.8, height: 1.45, dur: 0 });
    await c.wait(0.6);
    c.sfx('click');
    s3.play('idle');
    await c.robot.play('point', { dur: 1.2 });
    c.expr('gentle');
    s3.flag('seated', true);
    s3.play('sitDesk');
    await slideTo(c, s3, c.at(1.1, -1.8), c.at(0.8, -1.42), 0.35, 0);
    await c.wait(0.6);
    // 4: tools in the box, the table is clean, paper stars on a string; thumbs up.
    c.expr('happy');
    s3.hold(null);
    c.sfx('click');
    c.sfx('chime');
    c.setFlag('stars', true);
    c.robot.place(c.at(1.2, 0.5), N - 0.5);
    c.robot.flag('turnToCamera', true);
    await shots.two(c, c.robot, [s1, s3], { heading: FRONT, zoom: 0.8, height: 1.7, dur: 0 });
    await c.robot.play('thumbsUp', { dur: 1.8 });
    await c.wait(1.0);
  }),
];
