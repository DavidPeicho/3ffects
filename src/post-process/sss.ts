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

import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass';

import vertexShader from '../shaders/quad.vert';
import sssCombineFragmentShader from '../shaders/sss-compose.frag';
import sssBlurFragmentShader from '../shaders/sss-blur.frag';

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
        uCameraNear: { value: 0.1 },
        uCameraFar: { value: 100 },
      },
      glslVersion: GLSL3
    });
  }

}

export class SSSPass {

  private _quad: FullScreenQuad;

  private _mrt: WebGLMultipleRenderTargets;
  private _rtBlur0: WebGLRenderTarget;
  private _rtBlur1: WebGLRenderTarget;

  private _blurMaterial: SSSBlurMaterial;
  private _combineMaterial: SSSCombineMaterial;

  public constructor(mrt?: WebGLMultipleRenderTargets) {
    this._mrt = mrt ?? new WebGLMultipleRenderTargets(1, 1, 2);
    this._quad = new FullScreenQuad();
    this._blurMaterial = new SSSBlurMaterial();
    this._combineMaterial = new SSSCombineMaterial();

    // Diffuse + Depth
    (this._mrt as unknown as WebGLRenderTarget).depthBuffer = true;
    (this._mrt as unknown as WebGLRenderTarget).depthTexture = new DepthTexture(0, 0);
    (this._mrt as unknown as WebGLRenderTarget).depthTexture.type = FloatType;
    this._mrt.texture[0].name = 'diffuse';
    this._mrt.texture[0].type = FloatType;
    this._mrt.texture[0].format = RGBAFormat;
    this._mrt.texture[0].internalFormat = 'RGBA32F';

    // Specular.
    this._mrt.texture[1].name = 'specular';
    this._mrt.texture[1].type = FloatType;
    this._mrt.texture[1].format = RGBAFormat;
    this._mrt.texture[1].internalFormat = 'RGBA32F';

    // Blur.
    this._rtBlur0 = new WebGLRenderTarget(1, 1);
    this._rtBlur0.texture.type = UnsignedByteType;
    this._rtBlur0.texture.format = RGBFormat;
    this._rtBlur0.texture.internalFormat = 'RGB8';

    this._rtBlur1 = new WebGLRenderTarget(1, 1);
    this._rtBlur1.texture.type = UnsignedByteType;
    this._rtBlur1.texture.format = RGBFormat;
    this._rtBlur1.texture.internalFormat = 'RGB8';
  }

  public setSize(width: number, height: number): void {
    this._mrt.setSize(width, height);
    this._rtBlur0.setSize(width, height);
    this._rtBlur1.setSize(width, height);
  }

  public render(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: OrthographicCamera | PerspectiveCamera
  ) {
    // Step 1: populate GBuffer. This should be done on the user sides if he
    // wants to re-use the MRTs.
    renderer.setRenderTarget(this._mrt);
    renderer.render(scene, camera);

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

}
