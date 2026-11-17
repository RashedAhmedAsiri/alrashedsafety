// OWNER: robot worker. Keep the export and props exactly.
/**
 * Alrashed, the school safety robot (1.45 m). Reads his actor from the stage store every frame and
 * animates the procedural rig in ./robot (clips, overlays for flags, face screen, antenna light).
 * See docs/robot.md for clips, flags and socket positions.
 */
import { useEffect, useMemo } from 'react';
import { createPortal, useFrame } from '@react-three/fiber';
import { useStage } from '../core/stage';
import { useApp } from '../core/store';
import { STATUS_COLORS } from '../core/theme';
import { HoldItemMesh } from '../props/holdItems';
import { RobotModel } from './robot/model';
import * as THREE from 'three';

const camPos = new THREE.Vector3();

export function Robot({ actorId = 'alrashed' }: { actorId?: string }) {
  const model = useMemo(() => new RobotModel(), []);
  useEffect(() => () => model.dispose(), [model]);
  const hold = useStage((s) => s.actors[actorId]?.hold ?? null);
  const holdLeft = useStage((s) => s.actors[actorId]?.holdLeft ?? null);

  useFrame((state) => {
    const a = useStage.getState().actors[actorId];
    if (!a) {
      model.root.visible = false;
      return;
    }
    const app = useApp.getState();
    state.camera.getWorldPosition(camPos);
    model.update(
      a,
      performance.now(),
      { expr: app.expression, mouth: app.mouth, viseme: app.viseme },
      STATUS_COLORS[app.status] ?? STATUS_COLORS.ready,
      camPos,
    );
  });

  return (
    <>
      <primitive object={model.root} />
      {hold && hold !== 'phoneless' ? createPortal(<HoldItemMesh item={hold} />, model.socket('r')) : null}
      {holdLeft && holdLeft !== 'phoneless' ? createPortal(<HoldItemMesh item={holdLeft} />, model.socket('l')) : null}
    </>
  );
}
