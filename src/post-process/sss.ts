import {
  Camera,
  DepthTexture,
  FloatType,
  RawShaderMaterial,
  RedFormat,
  RGBAFormat,
  RGBFormat,
  Scene,
  UnsignedByteType,
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
      }
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
      }
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
    this._mrt.texture[0].type = UnsignedByteType;
    this._mrt.texture[0].format = RGBAFormat;
    this._mrt.texture[0].internalFormat = 'RGBA8';

    // Specular.
    this._mrt.texture[1].name = 'specular';
    this._mrt.texture[1].type = UnsignedByteType;
    this._mrt.texture[1].format = RGBFormat;
    this._mrt.texture[1].internalFormat = 'RGB8';

    // Blur.
    this._rtBlur0 = new WebGLRenderTarget(1, 1);
    this._rtBlur0.texture.type = UnsignedByteType;
    this._rtBlur0.texture.format = RGBAFormat;
    this._rtBlur0.texture.internalFormat = 'RGBA8';

    this._rtBlur1 = new WebGLRenderTarget(1, 1);
    this._rtBlur1.texture.type = UnsignedByteType;
    this._rtBlur1.texture.format = RGBAFormat;
    this._rtBlur1.texture.internalFormat = 'RGBA8';
  }

  public setSize(width: number, height: number): void {
    this._mrt.setSize(width, height);
    this._rtBlur0.setSize(width, height);
    this._rtBlur1.setSize(width, height);
  }

  public render(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: Camera
  ) {
    // Step 1: populate GBuffer. This should be done on the user sides if he
    // wants to re-use the MRTs.
    renderer.setRenderTarget(this._mrt);
    renderer.render(scene, camera);

    // Step 2: Horitonztal blur
    const blurMaterial = this._blurMaterial;
    this._quad.material = blurMaterial;
    blurMaterial.uniforms.uDepthTexture.value = (this._mrt as unknown as WebGLRenderTarget).depthTexture;

    blurMaterial.uniforms.uDiffuseTexture.value = this._mrt.texture[0];
    renderer.setRenderTarget(this._rtBlur0);
    this._quad.render(renderer);

    blurMaterial.uniforms.uDiffuseTexture.value = this._rtBlur0;
    renderer.setRenderTarget(this._rtBlur1);
    this._quad.render(renderer);
    
    // Step 3: Combine
    renderer.setRenderTarget(null);
    this._combineMaterial.uniforms.uDiffuseTexture.value = this._rtBlur1.texture;
    this._quad.material = this._combineMaterial;
    this._quad.render(renderer);
  }

}
