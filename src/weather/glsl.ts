// OWNER: weather worker. Small GLSL helpers shared by the weather shaders.

export const NOISE_GLSL = /* glsl */ `
float wHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float wNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), u.x), mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float wFbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * wNoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
`;

/** Sky color for a direction, matching the dome (used by puddle reflections). */
export const SKY_FN_GLSL = /* glsl */ `
vec3 wSky(vec3 d, vec3 zenith, vec3 horizon) {
  float h = clamp(d.y, 0.0, 1.0);
  return mix(horizon, zenith, pow(smoothstep(0.0, 0.65, h), 0.8));
}
`;
