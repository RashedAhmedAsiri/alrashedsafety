/**
 * Shared furniture and fixtures for the lobby, corridors and stairs (all pushed into Batches).
 * Local frames: furniture is authored with its back toward -Z unless stated, standing on y = 0.
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { GEO, PAL, canvasTexture, mat } from '../../kit';
import { useStage } from '../../../core/stage';
import { Batch, vcMat, type V3 } from './batch';
import { drawAlarmSign, drawElevatorSign, drawExitSign, drawExtinguisherSign, drawWetFloor } from './pictos';
import { useRoomFlags, type Kit4 } from './common';

const METAL = '#8E99A8';
const STEEL = '#C9D1DA';

/** Cylinder (or tube) between two points. */
export function tube(b: Batch, a: V3, c: V3, d: number, color: string) {
  const dir = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  b.cyl([(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2], [d, len, d], color, [e.x, e.y, e.z], true);
}

/** Convert 0-9 digits to Arabic-Indic digits. */
export const arDigits = (s: string | number) => String(s).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

/* ------------------------------------------------------------------ wall fixtures */

/** Green exit sign on a wall. Local frame: on the wall face, +Z out of the wall. */
export function exitSign(k: Kit4, p: V3, rotY: number, arrowDir: -1 | 0 | 1 = 0, w = 0.62) {
  const h = w * 0.34;
  k.e.at(p, rotY, () => {
    k.e.box([0, 0, 0.02], [w + 0.04, h + 0.04, 0.04], '#128A45');
    k.e.sticker(`exit${arrowDir}`, [0, 0, 0.042], w, h, (ctx, sw, sh) => drawExitSign(ctx, sw, sh, arrowDir), 0, 560);
  });
}

/** Fire alarm call point: red box, white plate, round button, picture sign above. */
export function alarmButton(k: Kit4, p: V3, rotY: number) {
  k.s.at(p, rotY, () => {
    k.s.rbox([0, 0, 0.03], [0.14, 0.14, 0.06], PAL.safetyRed, 0.015);
    k.s.box([0, 0, 0.062], [0.09, 0.09, 0.004], '#FFFFFF');
    k.s.cyl([0, 0, 0.068], [0.04, 0.01, 0.04], '#C62828', [Math.PI / 2, 0, 0]);
    k.s.sticker('alarm-sign', [0, 0.26, 0.004], 0.16, 0.2, drawAlarmSign, 0, 600);
  });
}

/** Red fire-extinguisher cabinet (open front) mounted on a wall. The extinguisher itself is a separate toggled mesh. */
export function extinguisherCabinet(k: Kit4, p: V3, rotY: number) {
  k.s.at(p, rotY, () => {
    // p is on the floor at the wall face; back panel, then a four-bar frame, so the front is open
    k.s.box([0, 0.88, 0.03], [0.6, 1.0, 0.06], PAL.safetyRed);
    k.s.box([0, 0.88, 0.064], [0.5, 0.9, 0.012], '#EFE6D8');
    k.s.box([0, 1.36, 0.16], [0.6, 0.08, 0.2], PAL.safetyRed);
    k.s.box([0, 0.4, 0.16], [0.6, 0.08, 0.2], PAL.safetyRed);
    for (const sx of [-1, 1]) k.s.box([sx * 0.26, 0.88, 0.16], [0.08, 1.0, 0.2], PAL.safetyRed);
    k.s.sticker('ext-sign', [0, 1.62, 0.012], 0.4, 0.5, drawExtinguisherSign, 0, 420);
    k.s.box([0, 0.16, 0.012], [0.42, 0.02, 0.01], '#F7C531');
  });
}

/** The extinguisher standing in the cabinet (hide with flag `extinguisherGone`). */
export function ExtinguisherInCabinet({ p, rotY }: { p: V3; rotY: number }) {
  const gone = useStage((s) => s.flags.extinguisherGone === true || s.flags.extinguisherGone === 'true');
  return (
    <group position={p} rotation={[0, rotY, 0]} visible={!gone}>
      <mesh position={[0, 0.82, 0.15]} scale={[0.17, 0.5, 0.17]} geometry={GEO.cyl} material={mat('#E02424')} />
      <mesh position={[0, 0.76, 0.15]} scale={[0.176, 0.2, 0.176]} geometry={GEO.cyl} material={mat('#FFFFFF')} />
      <mesh position={[0, 0.56, 0.15]} scale={[0.17, 0.06, 0.17]} geometry={GEO.sphere} material={mat('#E02424')} />
      <mesh position={[0, 1.1, 0.15]} scale={[0.07, 0.1, 0.07]} geometry={GEO.cyl} material={mat('#1E2228')} />
      <mesh position={[0.05, 1.18, 0.15]} scale={[0.17, 0.03, 0.05]} geometry={GEO.box} material={mat('#1E2228')} />
      <mesh position={[0.12, 0.92, 0.23]} rotation={[0, 0, 0.1]} scale={[0.03, 0.42, 0.03]} geometry={GEO.cyl} material={mat('#1E2228')} />
      <mesh position={[0.13, 0.7, 0.23]} scale={[0.06, 0.1, 0.05]} geometry={GEO.box} material={mat('#1E2228')} />
    </group>
  );
}

/** Elevator door: steel double doors in a frame, call button, floor indicator, picture sign beside it. Local frame: floor at wall face, +Z out of the wall. */
export function elevatorDoor(k: Kit4, p: V3, rotY: number) {
  const w = 1.1;
  const h = 2.15;
  k.s.at(p, rotY, () => {
    k.s.box([-w / 2 - 0.08, h / 2 + 0.05, 0.01], [0.16, h + 0.1, 0.06], '#9AA6B2');
    k.s.box([w / 2 + 0.08, h / 2 + 0.05, 0.01], [0.16, h + 0.1, 0.06], '#9AA6B2');
    k.s.box([0, h + 0.1, 0.01], [w + 0.32, 0.16, 0.06], '#9AA6B2');
  });
  k.g.at(p, rotY, () => {
    k.g.box([-w / 4 - 0.005, h / 2, -0.005], [w / 2 - 0.01, h, 0.04], STEEL);
    k.g.box([w / 4 + 0.005, h / 2, -0.005], [w / 2 - 0.01, h, 0.04], STEEL);
    k.g.box([0, h / 2, 0.02], [0.012, h, 0.01], '#6B7683');
    k.g.box([-w / 4, h / 2, 0.018], [0.03, h * 0.86, 0.006], '#DDE3EA');
    k.g.box([w / 4, h / 2, 0.018], [0.03, h * 0.86, 0.006], '#DDE3EA');
    // call panel
    k.g.box([w / 2 + 0.3, 1.05, 0.02], [0.1, 0.2, 0.03], '#2B2F36');
    k.g.cyl([w / 2 + 0.3, 1.1, 0.04], [0.04, 0.012, 0.04], '#F7C531', [Math.PI / 2, 0, 0]);
    k.g.cyl([w / 2 + 0.3, 1.0, 0.04], [0.04, 0.012, 0.04], '#F7C531', [Math.PI / 2, 0, 0]);
    // floor indicator
    k.g.box([0, h + 0.32, 0.02], [0.3, 0.14, 0.03], '#1C2430');
  });
  k.e.at(p, rotY, () => {
    k.e.box([0, h + 0.32, 0.038], [0.1, 0.07, 0.004], '#FF5A3C');
  });
  k.s.at(p, rotY, () => {
    k.s.sticker('elev-sign', [-w / 2 - 0.62, 1.55, 0.006], 0.4, 0.5, drawElevatorSign, 0, 420);
  });
}

/* ------------------------------------------------------------------ furniture */

/** Simple school bench: wooden slats on steel legs, 1.8 m long, back at -Z. */
export function bench(b: Batch, len = 1.8, wood = '#D9A46B') {
  b.rbox([0, 0.44, 0.02], [len, 0.045, 0.4], wood, 0.015);
  b.rbox([0, 0.78, -0.2], [len, 0.28, 0.035], wood, 0.015, [-0.08, 0, 0]);
  for (const sx of [-1, 1]) {
    b.box([sx * (len / 2 - 0.12), 0.21, 0.02], [0.04, 0.42, 0.36], METAL);
    b.box([sx * (len / 2 - 0.12), 0.6, -0.2], [0.04, 0.34, 0.04], METAL);
  }
}

/** Plastic waste bin, rim at 0.42. */
export function bin(b: Batch, color = '#2D8CFF') {
  b.cyl([0, 0.2, 0], [0.32, 0.4, 0.32], color);
  b.cyl([0, 0.41, 0], [0.34, 0.025, 0.34], '#FFFFFF');
  b.cyl([0, 0.215, 0], [0.26, 0.4, 0.26], '#1E2A3B');
  b.box([0, 0.2, 0.162], [0.14, 0.12, 0.004], '#FFFFFF');
}

/** Water cooler dispenser with a blue bottle. */
export function waterCooler(b: Batch) {
  b.rbox([0, 0.46, 0], [0.38, 0.92, 0.38], '#F4F6F8', 0.04);
  b.box([0, 0.6, 0.192], [0.3, 0.2, 0.012], '#DCE3EA');
  b.cyl([-0.07, 0.68, 0.2], [0.05, 0.03, 0.05], '#3B9BEA', [Math.PI / 2, 0, 0]);
  b.cyl([0.07, 0.68, 0.2], [0.05, 0.03, 0.05], '#E5484D', [Math.PI / 2, 0, 0]);
  b.box([0, 0.5, 0.2], [0.2, 0.02, 0.06], '#9AA6B2');
  b.cyl([0, 1.18, 0], [0.3, 0.42, 0.3], '#7CC4FA');
  b.cyl([0, 1.42, 0], [0.12, 0.08, 0.12], '#CFE8FA');
  b.cyl([0, 1.46, 0], [0.12, 0.02, 0.12], '#FFFFFF');
}

/** Wall-mounted drinking fountain (steel), local: on the wall face, floor at y = 0, +Z out of the wall. */
export function fountain(b: Batch) {
  b.rbox([0, 0.78, 0.12], [0.5, 0.2, 0.24], STEEL, 0.05);
  b.cyl([0, 0.885, 0.14], [0.36, 0.02, 0.28], '#B8C1CC');
  b.cyl([0, 0.9, 0.14], [0.28, 0.01, 0.2], '#8FA0B2');
  b.cyl([0, 0.99, 0.04], [0.025, 0.2, 0.025], '#B8C1CC');
  b.cyl([0, 1.09, 0.1], [0.025, 0.025, 0.14], '#B8C1CC', [Math.PI / 2, 0, 0]);
  b.cyl([0.18, 0.96, 0.03], [0.07, 0.03, 0.07], '#3B9BEA', [Math.PI / 2, 0, 0]);
  b.box([0, 0.5, 0.045], [0.14, 0.5, 0.09], '#B8C1CC');
  b.box([0, 0.95, -0.005], [0.5, 0.02, 0.02], '#E4EAF0');
  b.rbox([0, 0.5, 0.02], [0.56, 1.2, 0.01], '#DCEBE6', 0.01);
}

/**
 * Hand-wash station on the wall (1.0 m wide), local like fountain(): tiled splash-back, a wall-hung porcelain basin
 * with a chrome mixer tap and trap, soap and paper-towel dispensers and a child-height mirror.
 */
export function handSink(b: Batch) {
  const CH = '#C9D2DC';
  // tiled splash-back with grout lines, and a low skirting of darker tiles
  b.rbox([0, 1.05, 0.012], [1.0, 0.9, 0.024], '#EAF4F8', 0.006);
  for (const y of [0.75, 0.9, 1.05, 1.2, 1.35]) b.box([0, y, 0.026], [1.0, 0.008, 0.004], '#C5D5DE');
  for (const x of [-0.375, -0.25, -0.125, 0, 0.125, 0.25, 0.375]) b.box([x, 1.05, 0.026], [0.008, 0.9, 0.004], '#C5D5DE');
  b.box([0, 0.62, 0.028], [1.0, 0.04, 0.008], '#5FB7C9');
  // mirror (framed) at child eye height
  b.rbox([0, 1.58, 0.016], [0.54, 0.6, 0.014], '#9AA6B2', 0.02);
  b.rbox([0, 1.58, 0.026], [0.48, 0.54, 0.008], '#CFE7F2', 0.015);
  // wall-hung basin: body, bowl, drain, back lip
  b.rbox([0, 0.8, 0.2], [0.56, 0.16, 0.4], '#FFFFFF', 0.07);
  b.cyl([0, 0.884, 0.21], [0.44, 0.014, 0.3], '#EEF2F6');
  b.cyl([0, 0.892, 0.25], [0.05, 0.014, 0.05], '#8FA0B2');
  b.rbox([0, 0.9, 0.045], [0.56, 0.07, 0.05], '#FFFFFF', 0.02);
  // trap and supply pipes under the basin
  b.cyl([0, 0.66, 0.25], [0.035, 0.24, 0.035], CH);
  b.cyl([0, 0.54, 0.14], [0.035, 0.22, 0.035], CH, [Math.PI / 2, 0, 0]);
  b.cyl([0, 0.54, 0.03], [0.045, 0.045, 0.045], CH, [Math.PI / 2, 0, 0]);
  // chrome mixer tap with two knobs
  b.cyl([0, 0.935, 0.07], [0.06, 0.03, 0.06], CH);
  b.cyl([0, 1.0, 0.07], [0.028, 0.12, 0.028], CH);
  b.cyl([0, 1.06, 0.13], [0.026, 0.026, 0.14], CH, [Math.PI / 2, 0, 0]);
  b.cyl([0, 1.045, 0.2], [0.02, 0.03, 0.02], CH);
  b.ball([-0.1, 0.95, 0.07], [0.04, 0.04, 0.04], '#3B9BEA');
  b.ball([0.1, 0.95, 0.07], [0.04, 0.04, 0.04], '#E5484D');
  // soap dispenser (left) and paper towel box (right) on the wall
  b.rbox([-0.4, 1.08, 0.065], [0.09, 0.17, 0.08], '#FFB3C7', 0.025);
  b.cyl([-0.4, 0.97, 0.095], [0.02, 0.05, 0.02], CH);
  b.rbox([0.4, 1.12, 0.07], [0.2, 0.28, 0.09], '#E4EAF0', 0.02);
  b.box([0.4, 0.97, 0.1], [0.14, 0.015, 0.04], '#FFFFFF');
}

/** A tall leafy pot plant (cheap). */
export function potPlant(b: Batch, h = 1.3, pot = '#E07A3F') {
  b.cyl([0, 0.2, 0], [0.44, 0.4, 0.44], pot);
  b.cyl([0, 0.41, 0], [0.4, 0.02, 0.4], '#6B4A2B');
  b.cyl([0, 0.4 + h * 0.3, 0], [0.05, h * 0.6, 0.05], '#7A5A3A');
  const lv: [number, number, number, number][] = [
    [0, 1, 0, 0.6],
    [0.2, 0.8, 0.1, 0.48],
    [-0.18, 0.76, -0.08, 0.46],
    [0.05, 0.6, -0.2, 0.4],
    [-0.12, 0.56, 0.18, 0.38],
  ];
  lv.forEach(([x, y, z, s], i) => b.ball([x, 0.4 + h * y * 0.85, z], [s, s * 0.8, s], i % 2 ? '#3E9B4F' : '#4CB25E'));
}

/** Paper bin used for the bin fire (rim at 0.42), wire mesh look. */
export function paperBin(b: Batch) {
  b.cyl([0, 0.21, 0], [0.34, 0.42, 0.34], '#6F7C8B');
  b.cyl([0, 0.215, 0], [0.3, 0.42, 0.3], '#2B2F36');
  b.cyl([0, 0.41, 0], [0.36, 0.025, 0.36], '#4A5563');
  for (let i = 0; i < 6; i++) b.box([Math.cos(i) * 0.1, 0.43, Math.sin(i) * 0.1], [0.12, 0.012, 0.1], i % 2 ? '#FFFFFF' : '#F3F0E8', i);
}

/** Cleaner's cart: yellow bucket on wheels, mop, bags. Long side along X, front toward +Z. */
export function cleanerCart(b: Batch) {
  b.rbox([0, 0.12, 0], [0.9, 0.08, 0.5], '#2B3A4A', 0.03);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) b.cyl([sx * 0.38, 0.05, sz * 0.2], [0.09, 0.05, 0.09], '#1E2228', [0, 0, Math.PI / 2], true);
  b.rbox([-0.22, 0.38, 0], [0.4, 0.42, 0.4], '#F7C531', 0.05);
  b.box([-0.22, 0.6, 0], [0.34, 0.03, 0.34], '#2B3A4A');
  b.rbox([0.26, 0.4, 0.05], [0.3, 0.5, 0.3], '#3B9BEA', 0.05);
  b.rbox([0.26, 0.68, 0.05], [0.26, 0.08, 0.26], '#2D7FD3', 0.03);
  // mop and broom handles leaning on the back
  b.cyl([-0.38, 0.8, -0.2], [0.03, 1.4, 0.03], '#C98F5A', [0.1, 0, -0.08], true);
  b.ball([-0.43, 1.52, -0.22], [0.12, 0.08, 0.12], '#EDEDED');
  b.cyl([0.0, 0.8, -0.22], [0.03, 1.5, 0.03], '#7CC4FA', [0.08, 0, 0.1], true);
  // bag
  b.ball([0.08, 0.37, -0.1], [0.3, 0.3, 0.3], '#2B2F36');
}

/** A-frame wet-floor sign body (yellow), local: floor y = 0 (faces are separate planes, see WetPatch). */
export function wetSignParts(b: Batch) {
  for (const s of [-1, 1]) b.rbox([0, 0.3, s * 0.1], [0.4, 0.6, 0.02], '#F7C531', 0.02, [-s * 0.24, 0, 0]);
  b.box([0, 0.62, 0], [0.4, 0.04, 0.1], '#F7C531');
}

/* ------------------------------------------------------------------ flag-driven bits */

const wetTex = () => canvasTexture('core:wetface', 160, 230, drawWetFloor);

/** Cleaner's cart and wet-floor sign (flag `wetFloor`) plus the wet patch. The sign is skipped when a scenario prop `wetSign` exists. */
export function WetFloorSet({ patch, sign, cart, signRotY = 0.3, cartRotY = 0 }: { patch: { centre: V3; size: [number, number] }; sign: V3; cart: V3; signRotY?: number; cartRotY?: number }) {
  const wet = useStage((s) => s.flags.wetFloor === true || s.flags.wetFloor === 'true');
  const hasProp = useStage((s) => !!s.props.wetSign);
  const pm = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#BFE3F5', transparent: true, opacity: 0.42, roughness: 0.04, metalness: 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }),
    [],
  );
  const fm = useMemo(() => new THREE.MeshBasicMaterial({ map: wetTex(), toneMapped: false, transparent: true, alphaTest: 0.05 }), []);
  const { signGeo, cartGeo } = useMemo(() => {
    const b = new Batch();
    wetSignParts(b);
    const c = new Batch();
    cleanerCart(c);
    return { signGeo: b.build(), cartGeo: c.build() };
  }, []);
  const cartFace = useMemo(() => new THREE.MeshBasicMaterial({ map: wetTex(), toneMapped: false, transparent: true, alphaTest: 0.05 }), []);
  useEffect(() => () => (pm.dispose(), fm.dispose(), cartFace.dispose(), signGeo.dispose(), cartGeo.dispose()), [pm, fm, cartFace, signGeo, cartGeo]);
  if (!wet) return null;
  return (
    <group>
      <mesh position={[patch.centre[0], 0.006, patch.centre[2]]} rotation={[-Math.PI / 2, 0, 0]} scale={[patch.size[0], patch.size[1], 1]} geometry={GEO.plane} material={pm} renderOrder={2} />
      {!hasProp && (
        <group position={sign} rotation={[0, signRotY, 0]}>
          <mesh geometry={signGeo} material={vcMat()} />
          <mesh position={[0, 0.31, 0.118]} rotation={[-0.24, 0, 0]} scale={[0.34, 0.5, 1]} geometry={GEO.plane} material={fm} />
          <mesh position={[0, 0.31, -0.118]} rotation={[0.24, Math.PI, 0]} scale={[0.34, 0.5, 1]} geometry={GEO.plane} material={fm} />
        </group>
      )}
      <group position={cart} rotation={[0, cartRotY, 0]}>
        <mesh geometry={cartGeo} material={vcMat()} />
        <mesh position={[-0.22, 0.38, 0.202]} scale={[0.22, 0.26, 1]} geometry={GEO.plane} material={cartFace} />
      </group>
    </group>
  );
}

/** Emergency lamp unit (static body in `s`, glow in `e`), on a wall, +Z out of the wall. */
export function emergencyLamp(k: Kit4, p: V3, rotY: number) {
  k.s.at(p, rotY, () => k.s.rbox([0, 0, 0.05], [0.44, 0.13, 0.1], '#FFFFFF', 0.02));
  k.e.at(p, rotY, () => {
    k.e.box([-0.12, -0.03, 0.105], [0.1, 0.05, 0.01], '#FFF6D0');
    k.e.box([0.12, -0.03, 0.105], [0.1, 0.05, 0.01], '#FFF6D0');
    k.e.box([0, 0.03, 0.102], [0.03, 0.015, 0.004], '#3BE37A');
  });
}

/** Blinking-free glow halo for emergency lamps when lights are off. */
const lampHaloTex = () =>
  canvasTexture('core:lamphalo', 128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,244,200,0.75)');
    g.addColorStop(1, 'rgba(255,244,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

/** Warm pools of light around emergency lamps that appear when the `lights` flag is off. */
export function EmergencyHalos({ points }: { points: { p: V3; rotY: number }[] }) {
  const { lightsOn } = useRoomFlags();
  const m = useMemo(() => new THREE.MeshBasicMaterial({ map: lampHaloTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.55 }), []);
  useEffect(() => () => m.dispose(), [m]);
  if (lightsOn) return null;
  return (
    <group>
      {points.map((q, i) => (
        <mesh key={i} position={q.p} rotation={[0, q.rotY, 0]} scale={[2.2, 1.4, 1]} geometry={GEO.plane} material={m} renderOrder={3} />
      ))}
    </group>
  );
}
