/**
 * Point-sprite shaders for drawing stars that actually read as stars.
 *
 * A flat disc reads as a dot no matter how it is coloured. What sells a star
 * is the combination of a blown-out white core, a wide faint halo, and
 * diffraction spikes — the cross every telescope and camera produces from its
 * secondary-mirror vanes. Without the spikes the eye files the sprite under
 * "circle"; with them it files it under "star".
 */

export const STAR_SPRITE_VERT = /* glsl */ `
  uniform float uPixelRatio;
  uniform float uScale;
  uniform float uTime;
  uniform float uTwinkle;

  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;

  varying vec3 vColor;
  varying float vFlicker;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;

    vColor = aColor;
    vFlicker = 1.0 - uTwinkle + uTwinkle * (0.72 + 0.28 * sin(uTime * 1.7 + aPhase * 6.2831853));

    // Perspective size falloff, clamped so distant stars never vanish and
    // near ones never swallow the frame.
    float s = aSize * uScale * uPixelRatio * (300.0 / max(-mv.z, 0.001));
    gl_PointSize = clamp(s, 2.0, 190.0);
  }
`

export const STAR_SPRITE_FRAG = /* glsl */ `
  uniform float uSpikes;
  uniform float uHalo;

  varying vec3 vColor;
  varying float vFlicker;

  void main() {
    vec2 p = (gl_PointCoord - 0.5) * 2.0;
    float d = length(p);
    if (d > 1.0) discard;

    // Tight, blown-out core.
    float core = exp(-d * d * 24.0);

    // Wide, faint halo — this is what gives a star presence rather than
    // a hard edge.
    float halo = exp(-d * 3.1) * uHalo;

    // Four-point diffraction spikes. Each arm is a narrow gaussian along one
    // axis, attenuated along the other so the arms taper instead of forming
    // a plus sign of constant width.
    float ax = abs(p.x);
    float ay = abs(p.y);
    float sx = exp(-ax * ax * 300.0) * exp(-ay * 2.6);
    float sy = exp(-ay * ay * 300.0) * exp(-ax * 2.6);
    float spikes = (sx + sy) * uSpikes;

    float i = (core + halo + spikes) * vFlicker;
    i *= smoothstep(1.0, 0.72, d);

    // Hot centres desaturate toward white, exactly as an overexposed
    // stellar core does on a real sensor.
    vec3 col = mix(vColor, vec3(1.0), core * 0.78);

    gl_FragColor = vec4(col * i, i);
  }
`

export function starSpriteUniforms(opts?: {
  scale?: number
  spikes?: number
  halo?: number
  twinkle?: number
}) {
  return {
    uTime: { value: 0 },
    uPixelRatio: {
      value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2),
    },
    uScale: { value: opts?.scale ?? 1 },
    uSpikes: { value: opts?.spikes ?? 0.55 },
    uHalo: { value: opts?.halo ?? 0.32 },
    uTwinkle: { value: opts?.twinkle ?? 0.25 },
  }
}
