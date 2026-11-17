import { cutscene, type CutsceneCtx, type PropHandle } from '../api';
import type { Vec3 } from '../../core/types';
import { shots } from '../framing';
import { at, FACE_EAST, FACE_NORTH, FACE_SOUTH, together } from './crossing-common';

/**
 * traffic_light: signal_crossing. The pedestrian crossing is x -66.5..-62.5 (centre -64.5) across the main street.
 * School (north) side: Alrashed and S1 wait at the corner by the push button (button x -61.72, z -3.95, faces west).
 * The pedestrian head they watch is on the south pole (-61.6, 3.95), facing north. S3 waits on the far corner.
 * West-bound cars (come from the east, our LEFT) stop at the line x -61.5; an east-bound car stops at x -76.5.
 * Stage flags used: pedLight red|green|greenFlash, carLight green|yellow|red, pedWait.
 * Camera rule: from the north-west corner looking south-east (heading H): the boys, the waiting cars and the
 * pedestrian light are all in one frame. The green man only lights once every car has fully stopped.
 */
const S1 = { shirt: '#3DBE6E', striped: true, height: 'medium', skin: 2 } as const;
const S3 = { shirt: '#7CC4FA', striped: false, height: 'tall', skin: 3 } as const;
const WB_Z = -1.75; // west-bound lane (cars from the east)
const EB_Z = 1.75; // east-bound lane
const STOP_W = -59.2; // west-bound car centre when stopped at its line (nose west)
const STOP_E = -78.8; // east-bound car centre when stopped (nose east)
const H = 2.5; // camera heading: looking south-east
const PASS = 8.5; // m/s, ordinary town speed for passing cars

/** Drive at town speed, slow down over the last 9 m and stop at `stopX`. */
async function approach(c: CutsceneCtx, car: PropHandle, z: number, fromX: number, stopX: number) {
  const w = at(c);
  const dir = Math.sign(stopX - fromX);
  const slowX = stopX - dir * 9;
  const brakeX = stopX - dir * 3;
  await car.drive([w(fromX, z), w(slowX, z)], 6.5);
  car.set({ params: { lights: 'brake' } });
  await car.drive([w(slowX, z), w(brakeX, z)], 3.2);
  await car.drive([w(brakeX, z), w(stopX, z)], 1.4);
}

const place = (c: CutsceneCtx) => {
  const w = at(c);
  c.robot.place(w(-62.85, -4.25), FACE_SOUTH);
  c.actor('s1').place(w(-62.2, -4.25), FACE_SOUTH);
};

export default [
  cutscene('traffic_light', 'setup', async (c) => {
    const w = at(c);
    c.setFlag('traffic', 'off');
    c.setFlag('carLight', 'green');
    c.setFlag('pedLight', 'red');
    c.setFlag('pedWait', false);
    c.expr('smile');
    c.robot.place(w(-62.85, -4.25), FACE_SOUTH);
    c.spawn('s1', 'boy', { pos: w(-62.2, -4.45), rotY: FACE_SOUTH, spec: S1 });
    c.spawn('s3', 'boy', { pos: w(-62.4, 4.5), rotY: FACE_NORTH, spec: S3 });
    await shots.two(c, c.robot, c.actor('s1'), { heading: H, dur: 0 });
  }),

  cutscene('traffic_light', 'before', async (c) => {
    const w = at(c);
    const s1 = c.actor('s1');
    const carA = c.prop('carA', 'car', { pos: w(-40, WB_Z), rotY: Math.PI, params: { color: '#F4F4F0', lights: 'off', seed: 1 } });
    const carB = c.prop('carB', 'car', { pos: w(-25, WB_Z), rotY: Math.PI, params: { color: '#2F5E8E', lights: 'off', seed: 6 } });
    const carC = c.prop('carC', 'car', { pos: w(-100, EB_Z), rotY: 0, params: { color: '#C8B89A', lights: 'off', seed: 3 } });

    // 1: wide of the corner, the red man lit; cars pass; S1 sees a gap and steps to the very edge of the curb.
    await shots.wide(c, w(-62.6, -3.2), H, { dur: 0, zoom: 0.8 });
    c.sfx('carPass', { volume: 0.35 });
    void carA.drive([w(-40, WB_Z), w(-110, WB_Z)], PASS);
    void carC.drive([w(-100, EB_Z), w(-30, EB_Z)], PASS);
    await c.wait(1.6);
    c.expr('surprised');
    c.sfx('footsteps', { volume: 0.4 });
    await s1.walkTo(w(-62.2, -3.75), { speed: 0.9 });
    c.stopSfx('footsteps');
    s1.play('idle');

    // 2: the two of them; he puts a hand on S1's shoulder, S1 steps back, Alrashed points up at the red man.
    void carB.drive([w(-25, WB_Z), w(-110, WB_Z)], PASS);
    await shots.two(c, c.robot, s1, { heading: H, zoom: 0.8, dur: 0 });
    c.expr('warning');
    c.sfx('beep', { volume: 0.4 });
    c.robot.flag('handOnShoulder', 'l');
    await s1.play('stopStepBack', { dur: 1.2 });
    place(c);
    c.robot.face(w(-61.6, 3.95));
    await c.robot.play('point', { dur: 1.8 });
    c.robot.flag('handOnShoulder', false);
    c.robot.face(FACE_SOUTH);
    carA.remove();
    carB.remove();
    carC.remove();
  }),

  // Speech: the two of them with the pedestrian light across the street; a car passes now and then.
  cutscene('traffic_light', 'during', async (c) => {
    const w = at(c);
    const s1 = c.actor('s1');
    s1.face(c.robot.pos());
    await shots.two(c, c.robot, s1, { heading: H + 0.15, zoom: 0.9, dur: 1.2 });
    const bg = c.prop('bgCar', 'car', { pos: w(-35, WB_Z), rotY: Math.PI, params: { color: '#8E2E2E', lights: 'off', seed: 7 } });
    void (async () => {
      for (;;) {
        bg.set({ pos: w(-30, WB_Z) });
        void bg.drive([w(-30, WB_Z), w(-110, WB_Z)], PASS);
        await c.wait(10);
      }
    })();
    for (;;) {
      c.robot.face(w(-61.72, -3.95));
      await c.robot.play('point', { dur: 1.8 }); // the button
      c.robot.face(FACE_SOUTH);
      await c.robot.play('explain2', { dur: 2.8 });
      c.robot.face(w(-61.6, 3.95));
      await c.robot.play('point', { dur: 1.8 }); // the light
      c.robot.face(FACE_SOUTH);
      await c.robot.play('explain3', { dur: 3.2 });
      c.robot.face(w(-64.5, 0));
      await c.robot.play('point', { dur: 1.8 }); // the stripes
      c.robot.face(FACE_SOUTH);
      await c.robot.play('talk', { dur: 2.4 });
    }
  }),

  cutscene('traffic_light', 'after', async (c) => {
    const w = at(c);
    const s1 = c.actor('s1');
    const s3 = c.actor('s3');
    c.robot.flag('handOnShoulder', false);
    c.setFlag('carLight', 'green');
    c.setFlag('pedLight', 'red');
    place(c);
    s3.place(w(-62.4, 4.5), FACE_NORTH);
    const carW = c.prop('carW', 'car', { pos: w(-25, WB_Z), rotY: Math.PI, params: { color: '#F4F4F0', lights: 'off', seed: 1 } });
    const carE = c.prop('carE', 'car', { pos: w(-104, EB_Z), rotY: 0, params: { color: '#2F5E8E', lights: 'off', seed: 6 } });
    c.prop('bgCar', 'car', { pos: w(-200, WB_Z), rotY: Math.PI, params: {} }).remove();

    // 1: S1 steps up to the button box and presses it; the wait lamp lights.
    c.expr('smile');
    s1.place(w(-62.15, -3.95), FACE_EAST); // arm's length from the button (x -61.72)
    await shots.two(c, s1, w(-61.72, -3.95), { side: 1, zoom: 0.7, dur: 0 });
    await s1.play('pushButton', { dur: 1.5 });
    c.sfx('click');
    c.setFlag('pedWait', true);
    c.sfx('beep', { volume: 0.3 });
    await c.wait(0.4);

    // 2: the car signal turns yellow, then red (insert: only a placed camera can see the car heads).
    c.expr('happy');
    await c.cam({ pos: w(-56.5, -3.6, 2.2), look: w(-61.6, -1.7, 4.2), fov: 50, dur: 0 });
    c.setFlag('carLight', 'yellow');
    await c.wait(1.0);
    c.setFlag('carLight', 'red');
    c.sfx('chime', { volume: 0.5 });
    await c.wait(0.6);

    // 3: back at the corner: the cars slow down and stop at their lines; only then the green man lights up.
    await shots.wide(c, w(-62.6, -2.5), H, { dur: 0, zoom: 0.9 });
    await together(approach(c, carW, WB_Z, -25, STOP_W), approach(c, carE, EB_Z, -104, STOP_E));
    await c.wait(0.8);
    c.setFlag('pedWait', false);
    c.setFlag('pedLight', 'green');
    c.sfx('chime');
    await c.wait(0.8);

    // (same shot) both look left, right, left; every car is stopped.
    c.expr('lookLRL');
    s1.face(FACE_SOUTH);
    void s1.play('lookLRL', { dur: 2.3 });
    await c.robot.play('lookLRL', { dur: 2.3 });
    c.sfx('murmur', { volume: 0.15 });
    c.expr('smile');

    // 4: side tracking; they cross straight inside the white stripes.
    c.status('walking');
    c.sfx('footsteps', { volume: 0.5 });
    const cross = together(c.robot.walkTo([w(-64.9, -3.6), w(-64.9, 4.5)], { speed: 1.5 }), s1.walkTo([w(-64.0, -3.6), w(-64.0, 4.6)], { speed: 1.5 }));
    await shots.follow(c, c.robot, cross, { heading: Math.PI / 2, with: [s1], zoom: 0.9 });
    c.stopSfx('footsteps');

    // 5: on the far corner; the green man starts flashing; thumbs up to S3 who waits his turn.
    c.setFlag('pedLight', 'greenFlash');
    c.sfx('beep', { volume: 0.25 });
    c.robot.face(s3.pos());
    s1.face(s3.pos());
    s3.face(c.robot.pos());
    await shots.two(c, c.robot, s3, { side: 1, zoom: 0.85, dur: 0 });
    c.expr('proud');
    await c.robot.play('thumbsUp', { dur: 1.8 });
    c.sfx('click', { volume: 0.3 });
    await c.wait(0.3);
  }),
];
