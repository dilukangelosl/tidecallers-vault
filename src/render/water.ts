import { Filter, GlProgram, Sprite, Texture } from 'pixi.js';

const vertex = `in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void) {
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void) {
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void) {
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}`;

const fragment = `in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform float uTime;
uniform float uLevel;
uniform float uStage;

void main(void) {
    vec2 uv = vTextureCoord;
    float wave = sin(uv.x * 18.0 + uTime * 1.35) * 0.008;
    wave += sin(uv.x * 7.0 - uTime * 0.8 + 1.4) * 0.012;
    wave += sin(uv.x * 31.0 + uTime * 2.0) * 0.003;
    float shore = clamp(1.0 - uLevel + wave, 0.0, 1.0);
    vec4 dry = texture(uTexture, uv);
    if (uv.y < shore) {
        finalColor = dry;
        return;
    }
    float depth = smoothstep(0.0, 0.55, uv.y - shore);
    vec2 duv = vec2(
        sin(uv.y * 46.0 + uTime * 1.6) * 0.006,
        cos(uv.x * 28.0 - uTime * 1.1) * 0.004
    ) * (0.35 + depth);
    vec2 suv = clamp(uv + duv, vec2(0.001), vec2(0.999));
    vec4 wet = texture(uTexture, suv);
    float alpha = max(wet.a, 0.0001);
    vec3 rgb = wet.rgb / alpha;
    vec3 vault = vec3(0.15, 0.85, 0.9);
    vec3 abyss = vec3(0.25, 0.45, 0.95);
    vec3 throne = vec3(0.95, 0.25, 0.62);
    float s = clamp(uStage, 0.0, 2.0);
    vec3 tint = mix(vault, abyss, clamp(s, 0.0, 1.0));
    tint = mix(tint, throne, clamp(s - 1.0, 0.0, 1.0));
    vec2 c = uv * vec2(8.0, 5.0);
    float ca = sin(c.x * 3.1 + sin(c.y * 2.2 + uTime) + uTime);
    ca += sin((c.x + c.y) * 4.0 - uTime * 0.7);
    ca = smoothstep(-0.2, 1.1, ca);
    float mixAmt = 0.22 + depth * 0.28;
    rgb = mix(rgb, rgb * tint * 1.35 + tint * 0.05, mixAmt);
    rgb += tint * ca * (1.0 - depth) * 0.18;
    float foam = smoothstep(0.018, 0.0, abs(uv.y - shore));
    rgb = mix(rgb, vec3(0.85, 1.0, 1.0), foam * 0.85);
    finalColor = vec4(rgb * alpha, wet.a);
}`;

export function createWaterFilter(): Filter {
  return new Filter({
    glProgram: new GlProgram({ vertex, fragment }),
    resources: {
      waveUniforms: {
        uTime: { value: 0, type: 'f32' },
        uLevel: { value: 0.05, type: 'f32' },
        uStage: { value: 0, type: 'f32' },
      },
    },
  });
}

export function waterUniforms(filter: Filter): { uTime: number; uLevel: number; uStage: number } {
  const resources = filter.resources as {
    waveUniforms: { uniforms: { uTime: number; uLevel: number; uStage: number } };
  };
  return resources.waveUniforms.uniforms;
}

/** Full-screen white sprite so a filter always has coverage if used standalone. */
export function fullBleed(width: number, height: number): Sprite {
  const sprite = new Sprite(Texture.WHITE);
  sprite.width = width;
  sprite.height = height;
  return sprite;
}
