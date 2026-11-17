import { cutscene } from '../api';
import { shots } from '../framing';
import { wp, go } from './streetKit';

// Roadworks, south sidewalk (y 0.15). Layout (src/world/outside/neighborhood/layout.ts WORKS): trench x -29.6..-26 /
// z 4.4..5.4 inside a fenced zone x -34..-23.5 (cones + tape on the street side z 4.05, barricade line on the walkway
// side z 5.85, feet to 6.1), spoil heap west, pipes east, warning sign at the west end (-35.4, 4.5).
// The safe pedestrian path is the green strip z 6.3..7.4 (centre 6.85); east of x -23.5 the sidewalk is open.
// Nobody steps inside the zone, nobody leaves the path or the open east end.
const HOLE: [number, number] = [-27.8, 4.9];
const PATH_Z = 6.85;
const S1 = { shirt: '#3DBE6E', height: 'medium' as const }; // green shirt
/** Every shot is taken from the road side (north), looking south at the sidewalk and the park wall. */
const SOUTH = Math.PI;
/** High enough to look over the 1 m barricade line at the people standing behind it. */
const H = 2.6;

export default [
  cutscene('open_sewer', 'before', async (c) => {
    c.setFlag('traffic', 'off'); // cameras stand on the road
    const s1 = c.spawn('s1', 'boy', { pos: wp(c, -18.4, PATH_Z), rotY: -Math.PI / 2, spec: S1 });
    s1.flag('lookDown', true);
    c.robot.place(wp(c, -29.0, 6.95), Math.PI / 2);
    c.robot.hold(null);
    c.expr('idle');
    // Puddles off the safe path and outside the fence: one west of the sign, one at the east end.
    c.prop('pud1', 'puddle', { pos: wp(c, -37.2, 6.0), params: { radius: 0.5 } });
    c.prop('pud2', 'puddle', { pos: wp(c, -20.2, 4.9), params: { radius: 0.6 } });

    // Before 1 (0-4): wide along the wet sidewalk. S1 walks head-down along the safe path toward the works; Alrashed watches.
    c.sfx('footsteps', { loop: true });
    // stops on the open east end of the sidewalk, still short of the fence
    const walk = s1.walkTo([wp(c, -20.0, 6.8), wp(c, -21.4, 6.6)], { speed: 0.8, clip: 'walkDistracted' });
    c.robot.lookAt(wp(c, -20, PATH_Z, 1.0));
    const fol = shots.follow(c, s1, c.wait(4), { heading: SOUTH, zoom: 1.2, height: H });
    await c.wait(3.2);
    c.robot.lookAt(s1.pos());
    c.expr('surprised');
    await fol;

    // Before 2 (4-5): quick cut to medium on Alrashed and S1 with the open trench between them, firm fast stop signal.
    c.robot.face(wp(c, -21.4, 6.6));
    await shots.two(c, c.robot, s1, { heading: SOUTH, zoom: 0.8, height: H, dur: 0 });
    c.expr('warning');
    c.sfx('beep');
    go(c.robot.play('stopHand', { dur: 1.6 }));
    await c.wait(1.0);

    // Before 3 (5-7): S1 and the open trench in one frame: he stops, steps back, looks up.
    await shots.two(c, s1, wp(c, HOLE[0], HOLE[1]), { heading: SOUTH, zoom: 0.75, height: H, dur: 0 });
    c.robot.face(wp(c, HOLE[0], HOLE[1]));
    go(c.robot.play('point', { dur: 1.8 }));
    await walk;
    c.stopSfx('footsteps');
    c.sfx('pop');
    s1.flag('lookDown', false);
    s1.face(wp(c, HOLE[0], HOLE[1]));
    await s1.play('stopStepBack', { dur: 1.2 });

    // Speech start: Alrashed walks east along the safe path, round the end of the fence, and crouches beside S1.
    c.status('walking');
    await shots.follow(c, c.robot, c.robot.walkTo([wp(c, -25.5, 6.95), wp(c, -22.9, 6.95), wp(c, -22.4, 5.7)], { speed: 1.3 }), { heading: SOUTH, zoom: 1.2, height: H, dur: 0.6 });
    c.status('explaining');
    // half toward the boy, half toward the camera (north of them): he kneels and explains for the whole
    // speech, so he must not do it with his back to the student
    c.robot.face(wp(c, -21.4, 4.8));
    s1.face(wp(c, -22.4, 5.7));
    s1.lookAt(wp(c, -22.4, 5.7, 1.0));
    c.expr('warning');
    await shots.two(c, c.robot, s1, { heading: SOUTH, zoom: 1.0, height: 1.7, dur: 0.6 });
    await c.robot.play('kneel');
    await c.wait(1.2);
  }),

  cutscene('open_sewer', 'during', async (c) => {
    // He gestures with his eyes at the trench, the cover, the heap, the pipes and the fence while he explains.
    const looks: [number, number][] = [HOLE, [-30.45, 4.9], [-32.6, 4.85], HOLE, [-24.8, 4.7], [-27.44, 4.05]];
    for (const [x, z] of looks) {
      c.robot.lookAt(wp(c, x, z, 0.3));
      await c.wait(2.4);
    }
  }),

  cutscene('open_sewer', 'after', async (c) => {
    const s1 = c.actor('s1');
    c.robot.lookAt(null);
    // After 1 (0-2): he points, with a flowing hand, along the safe path away from the trench.
    await shots.two(c, c.robot, s1, { heading: SOUTH, zoom: 1.0, height: 1.7, dur: 0 });
    c.robot.face(wp(c, -30, PATH_Z));
    c.expr('smile');
    c.sfx('whoosh');
    go(c.robot.play('point', { dur: 1.8 }));
    s1.lookAt(wp(c, -30, PATH_Z, 1.0));
    await c.wait(2.0);

    // After 2 (2-7): high angle; S1 walks west along the green path behind the barricades, clear of the trench.
    c.expr('happy');
    s1.lookAt(null);
    c.sfx('footsteps', { loop: true });
    const safe = s1.walkTo([wp(c, -23.2, PATH_Z), wp(c, -28.6, PATH_Z)], { speed: 1.25 });
    await shots.follow(c, s1, safe, { heading: SOUTH, zoom: 1.3, height: H, dur: 0.6 });
    c.stopSfx('footsteps');

    // After 3 (7-9): medium on Alrashed, thumbs up toward S1 (west along the path).
    c.robot.face(wp(c, -28.6, PATH_Z, 1));
    await shots.two(c, c.robot, s1, { heading: SOUTH, zoom: 0.85, height: 2.2, dur: 0 });
    c.expr('proud');
    c.sfx('chime');
    await c.robot.play('thumbsUp', { dur: 1.8 });
    await c.wait(0.4);
  }),
];
