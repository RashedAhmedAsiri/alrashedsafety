import * as THREE from 'three';

/**
 * Materials that get darker and shinier when it rains (asphalt, sidewalks, yard paving, roofs).
 * Outdoor sets create them with kit.wetMat(); the weather system lerps every registered material
 * between its dry look (userData.dry) and a wet look using weatherBlend.wet / rain.
 */
export const WET_MATERIALS = new Set<THREE.MeshStandardMaterial>();

export function registerWet(m: THREE.MeshStandardMaterial) {
  m.userData.dry = { color: m.color.clone(), roughness: m.roughness, metalness: m.metalness };
  WET_MATERIALS.add(m);
  return m;
}
