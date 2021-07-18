import { Color, GLSL3, Matrix3, ObjectSpaceNormalMap, ShaderLib, ShaderMaterial, TangentSpaceNormalMap, Texture, UniformsLib, UniformsUtils } from 'three';

import fragmentShader from '../shaders/skin.frag';

export class SkinMaterial extends ShaderMaterial {

	public constructor() {
		super({
			fragmentShader,
      vertexShader: ShaderLib.physical.vertexShader,
			glslVersion: GLSL3,

      uniforms: UniformsUtils.merge([{
          map: { value: null },
          diffuse: { value: new Color(0xFFFFFF) },
          envMap: { value: null },

          // @todo: better handle that.
          envMapIntensity: { value: 2.0 },
          metalness: { value: 0.0 },
          roughness: { value: 1.0 },
        },
        UniformsLib.common,
        UniformsLib.normalmap,
        UniformsLib.envmap,
        UniformsLib.lights
      ]),

      lights: true
		});

    this.normalMapType = TangentSpaceNormalMap;
	}

  public get map(): Texture {
    return this.uniforms.map.value;
  }

  public set map(map: Texture) {
    this.uniforms.map.value = map;
  }

  public get normalMap(): Texture {
    return this.uniforms.normalMap.value;
  }

  public set normalMap(map: Texture) {
    this.uniforms.normalMap.value = map;
  }

  public set normalMapType(type: number) {
    if (type === ObjectSpaceNormalMap) {
      delete this.defines.TANGENTSPACE_NORMALMAP;
      this.defines.OBJECTSPACE_NORMALMAP = '';
    } else {
      delete this.defines.OBJECTSPACE_NORMALMAP;
      this.defines.TANGENTSPACE_NORMALMAP = '';
    }
  }

  public get color(): Color {
    return this.uniforms.diffuse.value;
  }

  public set color(c: Color) {
    this.uniforms.diffuse.value = c;
  }

  public get envMap(): Texture {
    return this.uniforms.envMap.value;
  }

  public set envMap(e: Texture) {
    this.uniforms.envMap.value = e;
  }

}
