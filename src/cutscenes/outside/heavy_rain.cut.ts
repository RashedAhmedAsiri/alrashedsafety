import { cutscene } from '../api';
import { shots, headingTo } from '../framing';
import { wp, go } from './streetKit';

// gate (rain -> wet) -> crosswalk_main -> houses. Landmarks: canopy spot (-1.6, -9), gate opening x -4..4 at z -7.5,
// sidewalk y 0.15, raised zebra x -2.5..2.5, Alrashed's house gate (20, 10).
// Camera rule at the gate: from inside the school / the east side of the opening, looking south-west toward the street.
const SOUTH = Math.PI; // camera heading: looking toward +Z (the street)
const SIDE = -Math.PI / 2 - 0.35; // camera heading: looking west-south-west (camera east of him)

export default [
  cutscene('heavy_rain', 'before', async (c) => {
    c.setFlag('gateOpen', true);
    c.robot.place(wp(c, -1.6, -9.0), Math.PI);
    c.robot.hold('umbrella', 'right');
    c.robot.flag('umbrellaOpen', true);
    c.expr('smile');
    c.prop('pud_gate', 'puddle', { pos: wp(c, 0.6, -5.4), params: { radius: 0.75, splash: true } });
    c.prop('pud_road', 'puddle', { pos: wp(c, 1.2, -1.6), params: { radius: 0.9, splash: true } });

    // Before 1 (0-3): wide of the gate in the rain, Alrashed waiting under the canopy.
    await shots.wide(c, c.robot, SOUTH + 0.25, { dur: 0, zoom: 0.8, height: 2.2 });
    c.sfx('thunder', { volume: 0.4 });
    await c.wait(3);

    // Before 2 (3-6): slow push in; the rain stops, weather blends to wet, drips and birds.
    go(shots.wide(c, c.robot, SOUTH + 0.25, { dur: 3, zoom: 0.5, height: 1.6 }));
    c.weather('wet');
    c.expr('happy');
    c.sfx('drips');
    c.sfx('birds');
    await c.wait(3);

    // Speech: Alrashed facing us under the canopy, the wet street behind him.
    await shots.close(c, c.robot, Math.PI, { dur: 1.5, zoom: 1.2 });
  }),

  cutscene('heavy_rain', 'after', async (c) => {
    c.setFlag('gateOpen', true);
    // After 1 (0-2): close; he shakes off the umbrella and closes it.
    await shots.close(c, c.robot, Math.PI, { dur: 0.6, zoom: 1.0 });
    c.expr('smile');
    c.sfx('click');
    go(c.robot.play('closeUmbrella', { dur: 2.6 }));
    c.robot.flag('umbrellaOpen', false);
    c.robot.hold('umbrellaClosed', 'right');
    await c.wait(2.2);

    // After 2 (2-5): from the side; out through the gate to the curb, past the big puddle, not through it.
    c.expr('happy');
    c.status('walking');
    c.sfx('footsteps', { loop: true });
    c.robot.face(0);
    await shots.follow(c, c.robot, c.robot.walkTo([wp(c, -1.6, -7.9), wp(c, -1.4, -4.0)], { speed: 1.2 }), { heading: SIDE, zoom: 1.0 });
    c.stopSfx('footsteps');

    // After 3 (5-8): him and the near lane; look left, right, left; a car splashes by.
    c.setFlag('traffic', 'off');
    c.robot.face(0);
    // camera ahead of him on the sidewalk (east side); the car passes behind him
    await shots.close(c, c.robot, Math.atan2(0.94, -0.34), { dur: 0, zoom: 1.15 });
    c.expr('lookLRL');
    go(c.robot.play('lookLRL', { dur: 2.5 }));
    const car = c.prop('rain_car', 'car', { pos: wp(c, 18, -1.75), rotY: Math.PI, params: { color: '#C9D6E2', wipers: false } });
    go(car.drive([wp(c, 18, -1.75), wp(c, -24, -1.75)], 6));
    await c.wait(1.6);
    c.sfx('carPass');
    await c.wait(0.5);
    c.sfx('splash');
    await c.wait(1.4);
    c.status('walking');

    // After 4 (8-12): tracking from the same side; straight across inside the stripes on the wet asphalt.
    c.expr('smile');
    c.sfx('footsteps', { loop: true });
    await shots.follow(c, c.robot, c.robot.walkTo(wp(c, -1.4, 4.4), { speed: 1.5 }), { heading: SIDE, zoom: 0.85 });
    c.stopSfx('footsteps');
    car.remove();

    // After 5 (12-16): at the houses; he walks to his gate, waves back and goes in.
    c.setFlag('traffic', 'on');
    await c.go('houses');
    c.robot.place(wp(c, 16.5, 5.4), Math.PI / 2);
    // from the street side ahead of him (east): from the west the sidewalk palm at (19, 6.55) hides him at his gate
    const H = headingTo([24.5, 0, 3.4], [20, 0, 8.0]);
    c.expr('happy');
    c.sfx('footsteps', { loop: true });
    await shots.follow(c, c.robot, c.robot.walkTo([wp(c, 20.2, 5.4), wp(c, 20.2, 8.4)], { speed: 1.4 }), { heading: H, zoom: 0.9 });
    c.stopSfx('footsteps');
    c.status('waving');
    c.robot.face(Math.PI + 0.3);
    await shots.close(c, c.robot, Math.PI + 0.3, { dur: 0, zoom: 1.2 });
    c.expr('hearts');
    await c.robot.play('wave', { dur: 2.2 });
    // the villa gate is part of the static front wall (it does not open), so he does not walk through it:
    // he steps up to it and rings the bell
    c.status('walking');
    await c.robot.walkTo(wp(c, 20, 9.2), { speed: 1.0 });
    c.robot.face(0);
    c.robot.play('idle');
    c.sfx('ding');
    await c.wait(1.4);
  }),
];
