import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useStage } from '../core/stage';
import { advanceStage, facingAngle, turnActor, vehicleAngle, wrapAngle } from './driver';

const st = () => useStage.getState();

function stepFor(seconds: number, now0: number, dt = 1 / 30) {
  let now = now0;
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) {
    now += dt * 1000;
    advanceStage(dt, now);
  }
  return now;
}

beforeEach(() => {
  st().clearScene();
  st().patchActor('alrashed', { pos: [0, 0, 0], rotY: 0, move: undefined, clip: 'idle', clipDuration: 0 });
});

describe('advanceStage: actors', () => {
  it('walks along waypoints at speed with y interpolated, then calls onArrive once', () => {
    const onArrive = vi.fn();
    st().upsertActor({ id: 'b1', kind: 'boy', pos: [0, 0, 0], move: { path: [[2, 0, 0], [2, 0.3, 2]], speed: 1, clip: 'walk', onArrive } });
    let now = stepFor(1, 0);
    expect(st().actors.b1.pos[0]).toBeCloseTo(1, 1);
    now = stepFor(1.5, now);
    const p = st().actors.b1.pos;
    expect(p[0]).toBeCloseTo(2, 3);
    expect(p[2]).toBeCloseTo(0.5, 1);
    expect(p[1]).toBeCloseTo(0.075, 2); // a quarter of the way up the second segment
    expect(st().actors.b1.move).toBeDefined();
    now = stepFor(2, now);
    expect(st().actors.b1.pos).toEqual([2, 0.3, 2]);
    expect(st().actors.b1.move).toBeUndefined();
    expect(onArrive).toHaveBeenCalledTimes(1);
    stepFor(1, now);
    expect(onArrive).toHaveBeenCalledTimes(1);
  });

  it('turns to face the travel direction', () => {
    st().upsertActor({ id: 'b2', kind: 'boy', pos: [0, 0, 0], rotY: 0, move: { path: [[5, 0, 0]], speed: 1.3, clip: 'walk' } });
    stepFor(1, 0);
    expect(st().actors.b2.rotY).toBeCloseTo(Math.PI / 2, 2); // facing +X
  });

  it('returns one-shot clips to idle after clipDuration seconds', () => {
    st().patchActor('alrashed', { clip: 'wave', clipStart: 1000, clipDuration: 2, clipSpeed: 1 });
    advanceStage(0.016, 2999);
    expect(st().actors.alrashed.clip).toBe('wave');
    advanceStage(0.016, 3001);
    expect(st().actors.alrashed.clip).toBe('idle');
    expect(st().actors.alrashed.clipDuration).toBe(0);
  });

  it('engine turns rotate smoothly and stop at the target', () => {
    turnActor('alrashed', 1.2);
    advanceStage(0.05, 50);
    const mid = st().actors.alrashed.rotY;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1.2);
    stepFor(2, 50);
    expect(st().actors.alrashed.rotY).toBeCloseTo(1.2, 3);
  });

  it('does not write the store when nothing moves', () => {
    const before = st().actors;
    expect(advanceStage(0.016, 10)).toBe(false);
    expect(st().actors).toBe(before);
  });
});

describe('advanceStage: props', () => {
  it('tweens from → to over dur with the ease, then onDone', () => {
    const onDone = vi.fn();
    st().upsertProp({ id: 'ball', kind: 'ball', pos: [0, 0, 0], anim: { path: [], from: [0, 0, 0], to: [10, 2, 0], dur: 2, t: 0, ease: 'linear', onDone } });
    let now = stepFor(1, 0, 0.05);
    expect(st().props.ball.pos[0]).toBeCloseTo(5, 3);
    expect(st().props.ball.pos[1]).toBeCloseTo(1, 3);
    now = stepFor(1.05, now, 0.05);
    expect(st().props.ball.pos).toEqual([10, 2, 0]);
    expect(st().props.ball.anim).toBeUndefined();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('drives along a path, faces travel (vehicle +X forward), brakes into the end', () => {
    const onDone = vi.fn();
    st().upsertProp({ id: 'car', kind: 'car', pos: [0, 0, 1.75], rotY: 0, anim: { path: [[0, 0, -10]], speed: 8, faceTravel: true, onDone } });
    stepFor(0.5, 0);
    const p = st().props.car;
    expect(p.pos[2]).toBeCloseTo(1.75 - 4, 0); // full speed at first
    expect(wrapAngle(p.rotY - vehicleAngle(0, -1))).toBeLessThan(0.2); // turning smoothly toward north (-Z)
    stepFor(4, 500);
    expect(wrapAngle(st().props.car.rotY - vehicleAngle(0, -1))).toBeCloseTo(0, 2);
    expect(st().props.car.pos[2]).toBeCloseTo(-10, 5);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('angles', () => {
  it('facingAngle: 0 faces +Z, π/2 faces +X', () => {
    expect(facingAngle([0, 0, 0], [0, 0, 5])).toBeCloseTo(0);
    expect(facingAngle([0, 0, 0], [5, 0, 0])).toBeCloseTo(Math.PI / 2);
  });
  it('vehicleAngle: 0 drives +X, π/2 drives -Z', () => {
    expect(vehicleAngle(1, 0)).toBeCloseTo(0);
    expect(vehicleAngle(0, -1)).toBeCloseTo(Math.PI / 2);
  });
  it('shake expires', () => {
    useStage.setState({ shake: { strength: 0.1, until: 100 } });
    advanceStage(0.016, 50);
    expect(st().shake).not.toBeNull();
    advanceStage(0.016, 101);
    expect(st().shake).toBeNull();
  });
});
