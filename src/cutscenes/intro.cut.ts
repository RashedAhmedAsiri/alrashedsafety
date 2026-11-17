import { cutscene } from './api';
import { estimateDuration } from '../voice/speech';
import { INTRO } from '../content';
import type { CutsceneCtx } from './api';
import type { Vec3 } from '../core/types';

/**
 * intro «مَنْ هُوَ الرَّاشِدُ؟» (classroom). docs/plan/Outside_scenarios.md section 0.
 * Local classroom coordinates: Alrashed's desk (-1.2, -3.55), smartboard centre (1.75, 1.6, -4.96).
 */

/** The spoken body, as the share of its letters spoken before each topic word (diacritics ignored). */
const TOPIC_CUES: { at: number; image: 'flame' | 'bulbOff' | 'rain' | 'extinguisher' | 'firstAid' | 'logo' }[] = [
  { at: 0.424, image: 'flame' }, // الْحَرَائِقِ
  { at: 0.442, image: 'bulbOff' }, // انْقِطَاعِ الْكَهْرَبَاءِ
  { at: 0.477, image: 'rain' }, // الْأَمْطَارِ
  { at: 0.554, image: 'extinguisher' }, // طَفَّايَةِ الْحَرِيقِ
  { at: 0.582, image: 'firstAid' }, // حَقِيبَةِ الْإِسْعَافَاتِ الْأَوَّلِيَّةِ
  { at: 0.66, image: 'logo' },
];

/** A point written as x, height, z (cameras); c.at takes (x, z, height). */
const w = (c: CutsceneCtx, x: number, y: number, z: number): Vec3 => c.at(x, z, y);

export default [
  cutscene('intro', 'setup', async (c) => {
    c.setFlag('board', 'blank');
    c.robot.place(c.at(0.15, -2.75), 0);
    c.robot.show(true);
    c.expr('smile');
    await c.cam({ pos: w(c, 1.0, 1.4, 0.2), look: w(c, 0.15, 1.05, -2.75), fov: 45, dur: 0 });
  }),

  cutscene('intro', 'before', async (c) => {
    // Before 1 (0-1.5): medium shot by his desk, big wave, chime.
    c.expr('happy');
    c.sfx('chime');
    c.robot.play('wave', { dur: 2.0 });
    await c.wait(1.5);

    // Before 2 (1.5-3): slow push in, two steps to the smartboard, which lights up with the logo.
    c.status('walking');
    c.sfx('servo');
    c.sfx('footsteps', { volume: 0.5 });
    void c.cam({ pos: w(c, 3.0, 1.45, -0.9), look: w(c, 1.0, 1.3, -4.2), fov: 42, dur: 2.8 });
    await c.robot.walkTo(c.at(0.45, -4.15), { speed: 0.95 });
    c.robot.face(c.at(1.6, -1.0)); // turns toward the room, a little toward the board
    c.setFlag('board', 'logo');
    c.sfx('powerUp', { volume: 0.7 });
    c.expr('happy');
    await c.wait(1.2);
  }),

  cutscene('intro', 'during', async (c) => {
    // Alrashed half-turned toward the smartboard; slow orbit between him and the board; a picture per topic.
    // Cue times scale with the estimated length of the spoken body (real recordings run close to it).
    const dur = estimateDuration(INTRO.body ?? '');
    c.robot.face(c.at(1.1, -3.4));
    c.expr('talking');

    // Camera: slow orbit, alternating between a view from the left of him and one from the right of the board.
    void (async () => {
      const views = [
        { pos: w(c, -0.9, 1.5, -0.4), look: w(c, 1.1, 1.35, -4.4) },
        { pos: w(c, 3.4, 1.5, -0.9), look: w(c, 0.9, 1.35, -4.4) },
      ];
      let i = 0;
      for (;;) {
        await c.cam({ ...views[i % 2], fov: 42, dur: 9, ease: 'inOut' });
        i++;
      }
    })();

    // Gestures keyed to the topic cues; talking/explaining in between.
    c.robot.play('explain1');
    let t = 0;
    let k = 0;
    for (const cue of TOPIC_CUES) {
      const when = Math.max(0, cue.at * dur - 0.15);
      if (when > t) {
        // between cues keep explaining
        k++;
        c.robot.play(k % 2 ? 'explain2' : 'talk');
        await c.wait(when - t);
        t = when;
      }
      c.setFlag('board', cue.image);
      if (cue.image === 'logo') {
        c.expr('talking');
        c.robot.play('explain3');
      } else {
        c.expr('explaining');
        void c.robot.play('point', { dur: 1.2, speed: 1.4 });
        c.sfx('pop', { volume: 0.4 });
      }
    }
    await c.wait(60);
  }),

  cutscene('intro', 'after', async (c) => {
    // After 1 (0-2): pull back to wide, a small bow, thumbs up, soft cheer, proud.
    c.setFlag('board', 'logo');
    c.robot.face(0);
    c.expr('proud');
    void c.cam({ pos: w(c, 1.2, 1.9, 4.2), look: w(c, 0.3, 1.2, -3.2), fov: 55, dur: 2.2 });
    c.sfx('cheer', { volume: 0.5 });
    await c.robot.play('bow', { dur: 1.1 });
    await c.robot.play('thumbsUp', { dur: 1.5 });
  }),
];
