/**
 * The engine's time source (ms). Same base as ActorState.clipStart (performance.now()).
 * Tests replace `clock.now` with a fake clock.
 */
export const clock = {
  now: (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
};
