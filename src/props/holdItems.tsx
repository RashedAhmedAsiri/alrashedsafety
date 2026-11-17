// OWNER: props worker. Keep the export exactly. A hand-held item mesh, origin at the grip point, ~real size.
// Grip convention (docs/props.md): origin at the centre of the closed fist, +Y up through the fist, +Z forward from
// the knuckles. Items hang below the grip (bucket-like carry) or point forward (nozzle, blades, pencil).
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { HoldItem } from '../core/types';
import { LGEO, trs } from './geo';
import * as I from './items';
import { basketballTexture, footballTexture } from './textures';
import { mat } from '../world/kit';
import { vcMat } from './geo';

const glass = new THREE.MeshStandardMaterial({ color: '#CFEFFF', roughness: 0.1, transparent: true, opacity: 0.4, depthWrite: false });

function V({ g, rough = 0.6, p, r, s }: { g: THREE.BufferGeometry; rough?: number; p?: [number, number, number]; r?: [number, number, number]; s?: number }) {
  return <mesh geometry={g} material={vcMat(rough)} castShadow position={p} rotation={r} scale={s} />;
}

function HeldBall() {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ map: footballTexture(), roughness: 0.55 }), []);
  useEffect(() => () => m.dispose(), [m]);
  return <mesh geometry={LGEO.sphere} material={m} scale={0.22} position={[0, 0.07, 0.015]} castShadow />;
}

export function HoldItemMesh({ item }: { item: HoldItem }) {
  switch (item) {
    case 'umbrella':
      // open: pole through the fist, handle below it, canopy above
      return <V g={I.umbrellaGeo('#2D8CFF', '#FFFFFF', -0.12, 0.92, 0.72, 0.5, true)} rough={0.7} />;
    case 'umbrellaClosed':
      return <V g={I.umbrellaClosedGeo()} rough={0.7} />;
    case 'extinguisher':
      return <V g={I.extinguisherGeo()} rough={0.45} />;
    case 'bandage':
      return <V g={I.bandageGeo()} rough={0.8} p={[0, 0.02, 0.03]} r={[Math.PI / 2, 0, 0]} />;
    case 'gauze':
      return <V g={I.gauzeGeo()} rough={0.9} p={[0, 0.0, 0.03]} r={[Math.PI / 2 - 0.2, 0, 0]} />;
    case 'ball':
      return <HeldBall />;
    case 'scissors':
      // blades forward (+Z), round tips, handle rings in the fist
      return <V g={I.scissorsFlatGeo()} rough={0.4} p={[0, 0, 0.06]} r={[0, 0, Math.PI / 2]} />;
    case 'waterBottle':
      return <V g={I.waterBottleGeo()} rough={0.35} p={[0, -0.07, 0]} />;
    case 'sodaCan':
      return <V g={I.sodaCanGeo()} rough={0.3} p={[0, -0.05, 0]} />;
    case 'clipboard':
      return <V g={I.clipboardGeo()} rough={0.6} />;
    case 'mask':
      return <V g={I.maskGeo()} rough={0.9} p={[0, 0.0, 0.04]} r={[0, 0, 0]} />;
    case 'backpack':
      return <V g={I.backpackGeo()} rough={0.8} />;
    case 'pencil':
      return <V g={I.pencilGeo()} rough={0.5} p={[0, 0, 0.03]} r={[0.45, 0, 0]} />;
    case 'brush':
      return <V g={I.brushGeo()} rough={0.5} p={[0, 0, 0.04]} r={[0.45, 0, 0]} />;
    case 'sandwich':
      return <V g={I.sandwichGeo()} rough={0.8} p={[0, -0.03, 0.01]} r={[0.25, 0, 0]} />;
    case 'mop':
      return <V g={I.mopGeo()} rough={0.7} />;
    default:
      return null;
  }
}

void basketballTexture;
void mat;
void glass;
void trs;
