import { ClampToEdgeWrapping, LinearFilter, Texture, WebGLRenderer, WebGLRenderTarget, WebGLRenderTargetOptions } from 'three';

import { ARenderPass, RenderPassParameters } from './render-pass.js';

export class RenderGraph {

  private readonly _texturesCache: Map<string, Texture> = new Map();

  public initialize(): void {
  }

  public addPass(pass: ARenderPass, parameters: RenderPassParameters): this {
    return this;
  }

  public compile(): this {
    return this;
  }

  public execute(renderer: WebGLRenderer): void {
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clear(true, true, true);

    // Render graph.

    renderer.autoClear = autoClear;
  }

  public dispose(): void {
  }

  public createRenderTarget(parameters: RenderTargetParameters): void {
    const {
      wrapS = ClampToEdgeWrapping;
      wrapT = ClampToEdgeWrapping;
      magFilter = LinearFilter;
      minFilter = LinearFilter;
      format?: number | undefined; // RGBAFormat;
      type?: TextureDataType | undefined; // UnsignedByteType;
      anisotropy?: number | undefined; // 1;
      depthBuffer?: boolean | undefined; // true;
      stencilBuffer?: boolean | undefined; // false;
      generateMipmaps?: boolean | undefined; // true;
      depthTexture?: DepthTexture | undefined;
      encoding?: TextureEncoding | undefined;
    } = parameters;
  }
}

interface RenderGraphResource {}

type RenderTargetParameters = WebGLRenderTargetOptions & {
  mrt?: boolean;
}
