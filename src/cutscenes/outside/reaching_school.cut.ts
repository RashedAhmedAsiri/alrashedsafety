import { cutscene } from '../api';
import { shots } from '../framing';
import { at, FACE_NORTH, FACE_EAST, FACE_SOUTH } from './crossing-common';

/**
 * reaching_school: Alrashed starts on the far (south) sidewalk and crosses north to the gate.
 * Facing north his LEFT is west, so the pickup truck comes along the east-bound lane (z +1.75) from the west.
 * World: crossing centre x 0, far curb z +3.5, gate opening x -4..4 at z -7.5, organizer inside at (1.2, -8.3).
 * Camera rule: always on the EAST side looking west / north-west, so the truck comes from the background.
 */
const H = -Math.PI / 2 - 0.55; // looking west-south-west: camera ahead of him and to his right
const TRUCK = { color: '#5B6470', seed: 5 };
const SPEC_A = { shirt: '#FF8A3D', height: 'medium', skin: 2 } as const;
const SPEC_B = { shirt: '#9B6BF2', striped: true, height: 'small', skin: 1 } as const;

export default [
  cutscene('reaching_school', 'setup', async (c) => {
    const w = at(c);
    c.setFlag('traffic', 'off');
    c.expr('smile');
    c.robot.place(w(-4.2, 5.2), FACE_NORTH);
    c.robot.hold('backpack', 'left');
    // the traffic organizer waits inside the gate
    const org = c.spawn('org', 'organizer', { pos: w(1.2, -8.3), rotY: FACE_SOUTH });
    org.face(w(0.8, -7.2));
    c.prop('truck', 'car', { pos: w(-60, 1.75), rotY: 0, params: { ...TRUCK, lights: 'off' } });
    // two boys walk past along the sidewalk toward the school side
    const a = c.spawn('s1', 'boy', { pos: w(-15, 4.3), rotY: FACE_EAST, spec: SPEC_A, clip: 'walk' });
    const b = c.spawn('s2', 'boy', { pos: w(-16.4, 4.5), rotY: FACE_EAST, spec: SPEC_B, clip: 'walk' });
    void a.walkTo(w(26, 4.3), { speed: 1.05 });
    void b.walkTo(w(26, 4.5), { speed: 1.05 });
    await shots.close(c, c.robot, FACE_NORTH, { dur: 0, zoom: 1.2 });
  }),

  cutscene('reaching_school', 'after', async (c) => {
    const w = at(c);
    const truck = c.prop('truck', 'car', { pos: w(-60, 1.75), rotY: 0, params: { ...TRUCK, lights: 'off' } });
    // the two boys from the setup have walked on by now: well east of the crossing, out of his way and the camera's
    for (const [id, x, z] of [['s1', 9.5, 4.3], ['s2', 8.1, 4.5]] as const) {
      const b = c.actor(id);
      b.place(w(x, z), FACE_EAST);
      void b.walkTo(w(30, z), { speed: 1.05 });
    }

    // After 1 (0-2): he walks to the curb and stands still, feet together.
    c.status('walking');
    c.sfx('footsteps', { volume: 0.5 });
    await shots.follow(c, c.robot, c.robot.walkTo(w(-1.0, 3.85), { speed: 1.4 }), { heading: H, zoom: 0.9 });
    c.stopSfx('footsteps');
    c.robot.face(FACE_NORTH);
    c.robot.play('idle');
    c.expr('smile');

    // After 2 (2-6): him and the lane on his left: a slow truck passes from the west; he waits, then looks again.
    c.expr('lookLRL');
    // camera on the far sidewalk east of him (not across the lane), so the truck never drives through the view
    await shots.two(c, c.robot, w(-8, 1.75), { heading: -1.25, zoom: 0.8, dur: 0 });
    truck.set({ pos: w(-14, 1.75) });
    c.sfx('carPass', { volume: 0.4 });
    const pass = truck.drive([w(-14, 1.75), w(40, 1.75)], 5.5);
    await c.robot.play('lookLeft', { dur: 1.6 });
    await c.wait(1.0);
    await c.robot.play('lookLRL', { dur: 2.0 });
    c.stopSfx('carPass');

    // After 3 (6-10): tracking; he crosses calmly inside the stripes.
    c.status('walking');
    c.expr('happy');
    c.sfx('footsteps', { volume: 0.5 });
    await shots.follow(c, c.robot, c.robot.walkTo(w(-1.0, -4.4), { speed: 1.5 }), { heading: H, zoom: 1.0 });
    c.stopSfx('footsteps');
    void pass.then(() => truck.remove());

    // After 4 (10-14): at the gate; the organizer high-fives him; he walks in as the bell rings.
    c.setFlag('gateOpen', true);
    const org = c.actor('org');
    await c.robot.walkTo(w(0.75, -7.5), { speed: 1.2 }); // close enough for the high five
    c.robot.face(org.pos());
    org.face(c.robot.pos());
    await shots.two(c, c.robot, org, { side: -1, zoom: 0.9, dur: 0 });
    c.expr('proud');
    org.play('raiseHand');
    await c.wait(0.3);
    c.sfx('clap');
    await c.robot.play('wave', { dur: 1.0 });
    org.play('idle');
    c.sfx('bell');
    c.status('walking');
    await c.robot.walkTo([w(0, -9.0), w(-0.5, -12)], { speed: 1.3 });
  }),
];
