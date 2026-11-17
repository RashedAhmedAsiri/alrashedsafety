import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../audio/sfx', () => ({
  unlockAudio: vi.fn(),
  playSfx: vi.fn(),
  stopSfx: vi.fn(),
  stopAllSfx: vi.fn(),
  setMusic: vi.fn(),
}));

import { useStage } from '../core/stage';
import { useApp } from '../core/store';
import { locAt } from '../core/locations';
import { createCutsceneCtx, offsetPoint, runCutscene } from '../cutscenes/engine';
import { cutscene } from '../cutscenes/api';
import { playSfx, stopSfx } from '../audio/sfx';
import { advanceStage } from './driver';
import { clock } from './clock';
import { stopCutsceneSounds } from '../cutscenes/engine';

/**
 * Cutscene runtime with a fake clock: timers are faked, the StageDriver is stepped by hand
 * (`frames(seconds)` advances both the timers and the stage).
 */

const st = () => useStage.getState();
let now = 0;
const realNow = clock.now;

async function frames(seconds: number, dt = 1 / 30) {
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) {
    await vi.advanceTimersByTimeAsync(dt * 1000);
    now += dt * 1000;
    advanceStage(dt, now);
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  now = 0;
  clock.now = () => now;
  st().clearScene();
  st().patchActor('alrashed', { pos: locAt('classroom', 0, -2.6), rotY: 0, move: undefined, clip: 'idle', clipDuration: 0, visible: true });
  useApp.getState().set({ location: 'classroom', status: 'ready', expression: 'smile' });
});

afterEach(() => {
  vi.useRealTimers();
  clock.now = realNow;
});

describe('cutscene ctx', () => {
  it('at() is relative to the location origin; offset() rotates like three.js', () => {
    const c = createCutsceneCtx('classroom', new AbortController().signal);
    expect(c.at(1, 2, 0.5)).toEqual([15, 0.5, -43]);
    expect(c.loc.id).toBe('classroom');
    const p = offsetPoint([10, 0, 0], Math.PI / 2, [2, 1, 0]); // vehicle forward (+X) turned to -Z
    expect(p[0]).toBeCloseTo(10);
    expect(p[1]).toBeCloseTo(1);
    expect(p[2]).toBeCloseTo(-2);
  });

  it('walkTo resolves on arrival (driven by the StageDriver) and the robot shows walking', async () => {
    const c = createCutsceneCtx('classroom', new AbortController().signal);
    const target = c.at(0, 0);
    let done = false;
    const p = c.robot.walkTo(target).then(() => (done = true));
    expect(st().actors.alrashed.move?.speed).toBe(1.2);
    expect(st().actors.alrashed.move?.clip).toBe('walk');
    expect(useApp.getState().status).toBe('walking');
    await frames(1);
    expect(done).toBe(false);
    await frames(1.4); // 2.6 m at 1.2 m/s ≈ 2.17 s
    await p;
    expect(done).toBe(true);
    expect(st().actors.alrashed.pos[2]).toBeCloseTo(target[2], 5);
    expect(st().actors.alrashed.move).toBeUndefined();
    expect(useApp.getState().status).toBe('explaining'); // back to the scenario base status
  });

  it('spawned people walk at their kind speed; run is 3.2', async () => {
    const c = createCutsceneCtx('yard', new AbortController().signal);
    const s1 = c.spawn('s1', 'boy', { pos: c.at(0, 0) });
    const t1 = c.spawn('t1', 'teacher', { pos: c.at(2, 0) });
    void s1.walkTo(c.at(0, 5));
    void t1.walkTo(c.at(2, 5), { clip: 'run' });
    expect(st().actors.s1.move?.speed).toBe(1.3);
    expect(st().actors.t1.move?.speed).toBe(3.2);
    await frames(5);
  });

  it('abort rejects pending waits with AbortError and freezes movers in place', async () => {
    const ac = new AbortController();
    const c = createCutsceneCtx('yard', ac.signal);
    const s1 = c.spawn('s1', 'boy', { pos: c.at(0, 0) });
    const walk = s1.walkTo(c.at(0, 10));
    const w = c.wait(30);
    const car = c.prop('car1', 'car', { pos: c.at(-10, 10) });
    const drive = car.drive([c.at(10, 10)], 5);
    await frames(1);
    const mid = s1.pos();
    expect(mid[2]).toBeGreaterThan(-22 + 1);
    ac.abort();
    await expect(walk).rejects.toMatchObject({ name: 'AbortError' });
    await expect(w).rejects.toMatchObject({ name: 'AbortError' });
    await expect(drive).rejects.toMatchObject({ name: 'AbortError' });
    expect(st().actors.s1.move).toBeUndefined();
    expect(st().props.car1.anim).toBeUndefined();
    const frozen = s1.pos();
    const carAt = car.pos();
    await frames(1);
    expect(s1.pos()).toEqual(frozen);
    expect(car.pos()).toEqual(carAt);
    await expect(c.wait(1)).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('play with dur resolves after dur and the driver returns the clip to idle', async () => {
    const c = createCutsceneCtx('classroom', new AbortController().signal);
    let done = false;
    const p = c.robot.play('wave', { dur: 1.5 }).then(() => (done = true));
    expect(st().actors.alrashed.clip).toBe('wave');
    expect(useApp.getState().status).toBe('waving');
    await frames(1);
    expect(done).toBe(false);
    await frames(0.6);
    await p;
    expect(st().actors.alrashed.clip).toBe('idle');
    // play without dur loops and resolves immediately
    await c.robot.play('talk');
    expect(st().actors.alrashed.clipDuration).toBe(0);
  });

  it('cam sets a stage shot and resolves when the rig reports done', async () => {
    const c = createCutsceneCtx('classroom', new AbortController().signal);
    let done = false;
    const p = c.cam({ pos: c.at(0, 4, 1.6), look: c.at(0, 0, 1), dur: 0.5 }).then(() => (done = true));
    const shot = st().shot!;
    expect(shot.dur).toBe(0.5);
    expect(shot.fov).toBe(50);
    expect(st().cameraMode).toBe('shot');
    await frames(0.2);
    expect(done).toBe(false);
    shot.onDone?.();
    await p;
    expect(done).toBe(true);
  });

  it('prop moveTo tweens and resolves; set() merges params', async () => {
    const c = createCutsceneCtx('classroom', new AbortController().signal);
    const b = c.prop('ball', 'ball', { pos: c.at(0, 0), params: { color: '#f00', kind: 'football' } });
    b.set({ params: { color: '#00f' } });
    expect(st().props.ball.params).toEqual({ color: '#00f', kind: 'football' });
    const p = b.moveTo(c.at(2, 0, 1), 1, 'linear');
    await frames(1.1);
    await p;
    expect(b.pos()[0]).toBeCloseTo(16, 4);
    expect(b.pos()[1]).toBeCloseTo(1, 4);
  });

  it('runCutscene swallows AbortError only', async () => {
    const ac = new AbortController();
    const slow = cutscene('t', 'after', async (c) => {
      await c.wait(10);
    });
    const run = runCutscene(slow, 'classroom', ac.signal);
    await frames(0.1);
    ac.abort();
    await expect(run).resolves.toBeUndefined();
    const broken = cutscene('t', 'after', async () => {
      throw new Error('boom');
    });
    await expect(runCutscene(broken, 'classroom', new AbortController().signal)).rejects.toThrow('boom');
  });

  it('looping sounds started by a cutscene stop with the scene', () => {
    const c = createCutsceneCtx('yard', new AbortController().signal);
    c.sfx('rain', { loop: true });
    c.sfx('pop');
    expect(playSfx).toHaveBeenCalledWith('rain', { loop: true });
    stopCutsceneSounds();
    expect(stopSfx).toHaveBeenCalledWith('rain');
    expect(stopSfx).not.toHaveBeenCalledWith('pop');
  });

  it('a replaced walk resolves the earlier promise', async () => {
    const c = createCutsceneCtx('yard', new AbortController().signal);
    const s = c.spawn('s2', 'boy', { pos: c.at(0, 0) });
    const first = s.walkTo(c.at(0, 10));
    const second = s.walkTo(c.at(3, 0));
    await expect(first).resolves.toBeUndefined();
    await frames(3);
    await expect(second).resolves.toBeUndefined();
  });
  it('go() without fade switches the location at once; at() follows the new place; actors stay', async () => {
    const c = createCutsceneCtx('classroom', new AbortController().signal);
    const s = c.spawn('g1', 'boy', { pos: c.at(1, 1) });
    const before = s.pos();
    await c.go('yard', { fade: false });
    expect(useApp.getState().location).toBe('yard');
    expect(c.loc.id).toBe('yard');
    expect(c.at(0, 0)).toEqual(locAt('yard', 0, 0));
    expect(s.pos()).toEqual(before);
  });

  it('go() with fade dips to paper, switches under cover, resolves covered, then fades back in', async () => {
    useApp.getState().set({ fade: 0 });
    const c = createCutsceneCtx('classroom', new AbortController().signal);
    let done = false;
    const p = c.go('clinic').then(() => (done = true));
    await frames(0.15);
    expect(useApp.getState().location).toBe('classroom'); // still fading out
    expect(useApp.getState().fade).toBeGreaterThan(0.2);
    await frames(2);
    await p;
    expect(done).toBe(true);
    expect(useApp.getState().location).toBe('clinic');
    expect(c.loc.id).toBe('clinic');
    expect(st().shot?.dur).toBe(0); // camera cut to the clinic's default view
    await frames(1.5);
    expect(useApp.getState().fade).toBe(0);
  });

  it('go() rejects with AbortError when aborted during the fade', async () => {
    useApp.getState().set({ fade: 0 });
    const ac = new AbortController();
    const c = createCutsceneCtx('classroom', ac.signal);
    const p = c.go('clinic');
    await frames(0.1);
    ac.abort();
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
    expect(c.loc.id).toBe('classroom');
    await expect(c.go('yard')).rejects.toMatchObject({ name: 'AbortError' });
    useApp.getState().set({ fade: 0 });
  });
});
