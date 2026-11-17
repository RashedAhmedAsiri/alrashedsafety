import { useFrame } from '@react-three/fiber';
import { advanceStage } from './driver';
import { clock } from './clock';
import { rig } from './rig';

/**
 * Inside the Canvas: advances actors' moves, one-shot clips, engine turns, prop animations and the
 * shake once per frame (see ./driver.ts). Renders nothing.
 */
export function StageDriver() {
  useFrame((_, dt) => {
    rig.frame++;
    advanceStage(dt, clock.now());
  });
  return null;
}
