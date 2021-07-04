import { ShaderMaterial } from 'three';

import fragment from '../shaders/skin.frag';

export class SkinMaterial extends ShaderMaterial {

	public constructor() {
		super();
    this.fragmentShader = fragment;
	}
	
}
