import { GLSL3, ShaderMaterial } from 'three';

import fragmentShader from '../shaders/skin.frag';

export class SkinMaterial extends ShaderMaterial {

	public constructor() {
		super({
			fragmentShader,
			glslVersion: GLSL3
		});
	}

}
