import { WebGLRenderer } from 'three';

import { RenderNode } from './render-node.js';

export class RenderGraph {

  public initialize(): void {
  }

  public addPass(pass: RenderNode): this {
    return this;
  }

  public render(renderer: WebGLRenderer): void {
  }

  public dispose(): void {
  }

}
