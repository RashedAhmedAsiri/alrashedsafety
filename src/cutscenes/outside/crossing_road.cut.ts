import { cutscene } from '../api';
import { shots } from '../framing';
import { at, FACE_NORTH, FACE_SOUTH, WHITE_CAR } from './crossing-common';

/**
 * crossing_road: Alrashed crosses the gate zebra to the park side. West-bound white car (from his LEFT).
 * World: crossing centre x 0, school curb z -3.5, far curb z +3.5, near lane z -1.75.
 * Camera rule: always on the WEST side of the crossing looking east, so the car comes from the background.
 */
const EAST = Math.PI / 2; // camera heading: looking toward +X
const CAR = { color: WHITE_CAR, lights: 'off', driver: true, seed: 2 };

export default [
  cutscene('crossing_road', 'setup', async (c) => {
    const w = at(c);
    c.setFlag('traffic', 'off');
    c.robot.place(w(0, -4.6), FACE_NORTH);
    c.expr('smile');
    c.prop('car1', 'car', { pos: w(60, -1.75), rotY: Math.PI, params: CAR });
    await shots.close(c, c.robot, FACE_NORTH, { dur: 0 });
  }),

  cutscene('crossing_road', 'after', async (c) => {
    const w = at(c);
    const car = c.prop('car1', 'car', { pos: w(60, -1.75), rotY: Math.PI, params: CAR });

    // 1: from the side he steps to the curb and stops behind the line.
    c.status('walking');
    c.expr('smile');
    c.sfx('footsteps', { volume: 0.5 });
    c.robot.face(FACE_SOUTH);
    await shots.follow(c, c.robot, c.robot.walkTo(w(0, -3.8), { speed: 1.0 }), { heading: EAST, zoom: 0.7 });
    c.stopSfx('footsteps');
    c.robot.play('idle');

    // 2: close on him: left, right, left. The white car approaches.
    c.sfx('carPass', { volume: 0.35 });
    c.expr('lookLRL');
    await shots.close(c, c.robot, FACE_SOUTH, { dur: 0 });
    car.set({ pos: w(24, -1.75) });
    const stop = car.drive([w(24, -1.75), w(7.0, -1.75)], 6.5);
    await c.robot.play('lookLRL', { dur: 2.5 });

    // 3: him and the car in one frame: it stops before the crossing, he nods to the driver.
    await shots.two(c, c.robot, w(7.0, -1.75), { heading: EAST + 0.5, zoom: 0.65, dur: 0 });
    await stop;
    c.sfx('screech', { volume: 0.12 });
    c.robot.face(w(7.0, -1.75));
    c.expr('happy');
    await c.robot.play('nod', { dur: 1.2 });

    // 4: side tracking; he crosses straight inside the stripes.
    c.status('walking');
    c.expr('smile');
    c.sfx('footsteps', { volume: 0.5 });
    c.robot.face(FACE_SOUTH);
    await shots.follow(c, c.robot, c.robot.walkTo(w(0, 4.6), { speed: 1.5 }), { heading: EAST, zoom: 0.8 });
    c.stopSfx('footsteps');

    // 5: on the far sidewalk he waves thanks to the driver, the car drives on.
    c.sfx('birds', { volume: 0.4 });
    c.robot.face(w(5, 0));
    await shots.close(c, c.robot, Math.atan2(5, -4.6), { dur: 0 });
    c.expr('hearts');
    void car.drive([w(7.0, -1.75), w(-60, -1.75)], 5.0);
    await c.robot.play('wave', { dur: 2.2 });
    await c.wait(0.8);
  }),
];
