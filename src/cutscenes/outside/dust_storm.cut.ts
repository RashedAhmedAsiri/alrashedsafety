import { cutscene, type CutsceneCtx } from '../api';
import { shots } from '../framing';
import type { BoySpec, Vec3 } from '../../core/types';

// dust_storm (yard): before (dust arrives), speak (during: collars up), after (yard -> lobby glass doors -> corridor sink).
const SPECS: Record<string, Partial<BoySpec>> = {
  s1: { shirt: '#E5484D', striped: false, height: 'medium', backpack: null, pants: 'blue', hair: 'black', skin: 2 },
  s2: { shirt: '#F5C518', striped: true, height: 'small', backpack: null, pants: 'black', hair: 'brown', skin: 3 },
  s3: { shirt: '#7CC4FA', striped: false, height: 'tall', backpack: null, pants: 'blue', hair: 'black', skin: 1 },
  s4: { shirt: '#3DBE6E', striped: false, height: 'medium', backpack: null, pants: 'blue', hair: 'brown', skin: 4 },
  s5: { shirt: '#9B6BF2', striped: true, height: 'tall', backpack: null, pants: 'black', hair: 'black', skin: 2 },
};
const IDS = ['s1', 's2', 's3', 's4', 's5'];
const W = (c: CutsceneCtx, x: number, z: number, dy = 0): Vec3 => c.at(x - c.loc.origin[0], z - c.loc.origin[2], dy);
// Open part of the yard east of the walkway (clear of the canopy posts and the palm planters at x 4.4).
// The boys gather in an arc on both sides of Alrashed so the camera (always south of them, looking north at the
// building) sees every face.
const ROBOT = { x: 9.5, z: -24.5 };
// (spread in x too, so from the camera nobody stands right behind another boy)
const GATHER: [number, number][] = [[7.3, -24.7], [7.95, -24.0], [8.6, -23.4], [10.45, -23.5], [11.2, -24.2]];
/** Camera heading: looking north (toward the building), from the south side of the yard. */
const NORTH = 0;
const DOOR = { x: -3, z: -36.2 }; // main entrance stand point (doors at z -38.3)

export default [
  cutscene('dust_storm', 'setup', async (c) => {
    c.setFlag('schoolPeople', false);
    c.robot.place(W(c, ROBOT.x, ROBOT.z), 0.9);
    await shots.wide(c, W(c, 10, -24), NORTH, { zoom: 1.2, dur: 0 });
    c.expr('smile');
  }),

  cutscene('dust_storm', 'before', async (c) => {
    // ---- Before 1 (0-3 s): wide of the yard at break time, boys play ball in the sun ----
    c.sfx('birds', { loop: true, volume: 0.4 });
    c.sfx('murmur', { volume: 0.4 });
    IDS.forEach((id, i) => c.spawn(id, 'boy', { pos: W(c, 8.5 + (i % 3) * 2.6, -21.5 - Math.floor(i / 3) * 3), rotY: i * 1.3, spec: SPECS[id], clip: 'idle' }));
    const ball = c.prop('ball', 'ball', { pos: W(c, 11.5, -22, 0), params: { kind: 'football' } });
    c.expr('smile');
    await shots.wide(c, W(c, 10.5, -23), NORTH, { zoom: 1.2, dur: 0 });
    c.actor('s1').face(W(c, 9.2, -23.8));
    c.actor('s1').play('kick', { dur: 0.9 });
    ball.moveTo(W(c, 9.2, -23.8, 0), 0.9);
    c.actor('s2').walkTo(W(c, 9.4, -23.2), { speed: 2.2, clip: 'run' });
    c.actor('s4').play('cheer');
    await c.wait(3);
    // ---- Before 2 (3-7 s): slow pan up to the sky, a wall of dust rolls in ----
    c.expr('surprised');
    c.weather('dust');
    c.sfx('wind', { loop: true, volume: 0.35 });
    c.actor('s4').play('idle');
    c.actor('s5').play('lookUpSurprised', { dur: 1.6 });
    c.prop('dust_wall', 'dustCloud', { pos: W(c, 0, -80, 0), scale: 6, params: {} });
    // the camera tilts up from the boys to the sky over the school: the wall of dust rolls in
    c.cam({ pos: W(c, 10, -15, 1.6), look: W(c, 4, -80, 14), fov: 60, dur: 4, ease: 'inOut' });
    await c.wait(4);
    // ---- Before 3 (7-9 s): covers the lower half of his face screen, then waves the boys over ----
    c.robot.face(0);
    await shots.close(c, c.robot, 0, { dur: 0 });
    c.sfx('beep');
    c.expr('warning');
    c.robot.play('coverFace', { dur: 1.2 });
    await c.wait(1.2);
    c.status('waving');
    c.robot.play('wave');
    const come = IDS.map((id, i) => c.actor(id).walkTo(W(c, GATHER[i][0], GATHER[i][1]), { speed: 1.8 }));
    await shots.two(c, c.robot, W(c, ROBOT.x + 2.5, ROBOT.z + 1), { heading: NORTH, dur: 0.8 });
    await Promise.race([Promise.all(come), c.wait(2.4)]);
    IDS.forEach((id) => c.actor(id).face(W(c, ROBOT.x, ROBOT.z)));
    c.robot.play('idle');
    c.status('explaining');
  }),

  cutscene('dust_storm', 'during', async (c) => {
    // Speech: medium, dust blowing past, boys gathered around Alrashed, collars up over their noses
    c.sfx('wind', { loop: true, volume: 0.2 });
    await shots.two(c, c.robot, IDS.map((id) => c.actor(id)), { heading: NORTH, dur: 1.0 });
    IDS.forEach((id) => {
      const a = c.actor(id);
      a.face(W(c, ROBOT.x, ROBOT.z));
      a.flag('collarUp', true);
      a.play('coverNose');
    });
    c.robot.face(0);
    await c.wait(1);
  }),

  cutscene('dust_storm', 'after', async (c) => {
    // ---- After 1 (0-4 s): tracking behind the group, calmly (not running) to the nearest door ----
    c.status('walking');
    c.expr('smile');
    c.sfx('footsteps', { loop: true, volume: 0.5 });
    c.robot.flag('turnToCamera', false);
    // a short walk each to the door, calmly
    const moves = [c.robot.walkTo([W(c, 3.5, -31), W(c, DOOR.x, DOOR.z)], { speed: 1.3 })];
    IDS.forEach((id, i) => {
      moves.push(c.actor(id).walkTo([W(c, 4.3 + (i - 2) * 0.6, -30.2 + (i % 2) * 0.6), W(c, DOOR.x + (i - 2) * 0.6, DOOR.z + 1.3 + (i % 2) * 0.6)], { speed: 1.3 }));
    });
    // seen from beside the entrance as they come calmly toward the door (the palm planter at x 4.4 stays left of them)
    await c.cam({ pos: W(c, -1.0, -33.8, 1.4), look: W(c, 6.0, -28.0, 1.0), fov: 58, dur: 0 });
    void c.cam({ pos: W(c, -1.0, -33.8, 1.4), look: W(c, 2.5, -32.0, 1.0), fov: 58, dur: 4.5 });
    // the whole walk is ~13 s: cut inside once they have come most of the way toward the camera (the lobby shot
    // places them just inside the doors, which cancels the rest of the walk)
    await Promise.race([Promise.all(moves), c.wait(5.0)]);
    c.stopSfx('footsteps');
    // ---- After 2 (4-6 s): inside, looking at the glass door; the last boy enters, door closes ----
    await c.go('lobby');
    const lobbyDoors: Vec3 = W(c, -3, -39.0, 0); // lobby main glass doors (south wall)
    // Alrashed to one side (so no boy is hidden behind him); the boys come in through the doors and walk a few steps in
    c.robot.place(W(c, -4.6, -42.4), Math.PI);
    IDS.forEach((id, i) => {
      const a = c.actor(id);
      a.flag('collarUp', true);
      const x = -3.95 + i * 0.55;
      a.place(W(c, x, -39.6 - (i % 2) * 0.45), Math.PI);
      void a.walkTo(W(c, x, -41.3 - (i % 2) * 0.55), { speed: 1.0 });
    });
    c.cam({ pos: W(c, -3, -46.2, 1.5), look: lobbyDoors, fov: 55, dur: 0 });
    c.setFlag('door', 'closed');
    await c.wait(0.8);
    c.sfx('doorHiss');
    c.robot.face(lobbyDoors);
    c.robot.play('stopHand', { dur: 1.2 });
    c.sfx('wind', { volume: 0.12 });
    c.stopSfx('wind');
    c.expr('happy');
    c.status('explaining');
    await c.wait(1.6);
    // ---- After 3 (6-10 s): corridor, one boy at a time washes at the hand sink; one rubs his eye ----
    // Ground corridor: drinking fountain (9.75, 2.5) and hand sink (10.45, 2.5) on the south wall. S2 washes at the
    // sink, the others wait their turn along the wall (east of it); S1 waits on the west side rubbing his eye.
    await c.go('corridor_ground');
    IDS.forEach((id) => c.actor(id).flag('collarUp', false));
    const base = (x: number, z: number, dy = 0): Vec3 => c.at(x, z, dy);
    const SINK = base(10.45, 1.8);
    c.actor('s2').place(SINK, 0);
    c.actor('s3').place(base(11.2, 1.85), -Math.PI / 2);
    c.actor('s4').place(base(11.85, 1.9), -Math.PI / 2);
    c.actor('s5').place(base(12.5, 1.85), -Math.PI / 2);
    c.actor('s1').place(base(9.1, 1.7), Math.PI / 2 - 0.5);
    c.robot.place(base(7.9, 0.2), 0.3);
    c.cam({ pos: base(9.9, -1.7, 1.35), look: base(9.9, 2.5, 1.0), fov: 55, dur: 0 });
    c.sfx('tap', { loop: true, volume: 0.5 });
    c.actor('s2').play('washHands');
    for (const id of ['s3', 's4', 's5']) c.actor(id).play('idle');
    c.actor('s1').play('wipeForehead');
    c.expr('gentle');
    await c.wait(1.5);
    c.robot.walkTo(base(8.6, 0.8), { speed: 0.9 });
    await c.wait(1.0);
    c.robot.face(c.actor('s1').pos());
    c.robot.play('point', { dur: 1.2 });
    await c.wait(1.0);
    // S2 is done and steps back; S1 takes the sink (passing in front of the fountain) and washes
    const s2 = c.actor('s2');
    s2.play('idle');
    void s2.walkTo(base(10.9, 0.9), { speed: 0.9 }).then(() => s2.face(base(10.45, 2.5)));
    await c.actor('s1').walkTo([base(9.75, 1.5), SINK], { speed: 0.9 });
    c.actor('s1').face(0);
    c.actor('s1').play('washHands');
    c.expr('hearts');
    await c.wait(1.8);
    c.stopSfx('tap');
  }),
];
