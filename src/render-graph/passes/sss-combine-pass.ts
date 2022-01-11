import {
  Camera,
  DepthTexture,
  FloatType,
  GLSL3,
  OrthographicCamera,
  PerspectiveCamera,
  RawShaderMaterial,
  RGBAFormat,
  RGBFormat,
  Scene,
  UnsignedByteType,
  Vector2,
  WebGLMultipleRenderTargets,
  WebGLRenderer,
  WebGLRenderTarget
} from 'three';

import { RenderGraph } from "../render-graph";
import { ARenderPass } from '../render-pass.js';

import vertexShader from '../../shaders/quad.vert';
import sssCombineFragmentShader from '../../shaders/sss-compose.frag';
import sssBlurFragmentShader from '../../shaders/sss-blur.frag';

class SSSCombineMaterial extends RawShaderMaterial {

  public constructor() {
    super({
      vertexShader,
      fragmentShader: sssCombineFragmentShader,
      uniforms: {
        uDiffuseTexture: { value: null },
      },
      glslVersion: GLSL3
    });
  }

}

class SSSBlurMaterial extends RawShaderMaterial {

  public constructor() {
    super({
      vertexShader,
      fragmentShader: sssBlurFragmentShader,
      uniforms: {
        uDepthTexture: { value: null },
        uDiffuseTexture: { value: null },
        uBlurDirection: { value: new Vector2() },

        uSSSWidth: { value: 0.1 },

        uCameraNear: { value: 0.1 },
        uCameraFar: { value: 100 },
      },
      glslVersion: GLSL3
    });
  }

}

export class SSSCombineRenderPass extends ARenderPass {

  private _blurMaterial: SSSBlurMaterial = new SSSBlurMaterial();

  public constructor(graph: RenderGraph) {
    super(graph);
  }

  public execute(renderer: WebGLRenderer, camera: OrthographicCamera | PerspectiveCamera): void {
    // Step 1: populate GBuffer. This should be done on the user sides if he
    // wants to re-use the MRTs.
    // renderer.setRenderTarget(this._mrt);
    // renderer.render(scene, camera);

    // Step 2: Horitonztal blur
    const blurMaterial = this._blurMaterial;
    blurMaterial.uniforms.uCameraNear.value = camera.near;
    blurMaterial.uniforms.uCameraFar.value = camera.far;

    this._quad.material = blurMaterial;
    blurMaterial.uniforms.uDepthTexture.value = (this._mrt as unknown as WebGLRenderTarget).depthTexture;
    blurMaterial.uniforms.uBlurDirection.value.set(1.0, 0.0);

    blurMaterial.uniforms.uDiffuseTexture.value = this._mrt.texture[0];
    blurMaterial.uniforms.uBlurDirection.value.set(0.0, 1.0);
    renderer.setRenderTarget(this._rtBlur0);
    this._quad.render(renderer);

    blurMaterial.uniforms.uDiffuseTexture.value = this._rtBlur0.texture;
    renderer.setRenderTarget(this._rtBlur1);
    this._quad.render(renderer);

    // Step 3: Combine
    renderer.setRenderTarget(null);
    this._combineMaterial.uniforms.uDiffuseTexture.value = this._rtBlur1.texture;
    this._quad.material = this._combineMaterial;
    this._quad.render(renderer);
  }

  public setInput(): this {

  }

}
