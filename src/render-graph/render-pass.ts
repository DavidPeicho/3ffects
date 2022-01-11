import { OrthographicCamera, PerspectiveCamera, WebGLRenderer } from "three";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass";
import { RenderGraph } from "./render-graph";

export abstract class ARenderPass {

  protected readonly _graph: RenderGraph;

  protected readonly _quad: FullScreenQuad;

  public constructor(graph: RenderGraph) {
    this._graph = graph;
    this._quad = new FullScreenQuad();
  }

  public abstract execute(renderer: WebGLRenderer, camera: OrthographicCamera | PerspectiveCamera): void;

  public addInput(): this {
    return this;
  }

}

export interface RenderPassParameters<Inputs> {
  inputs: Inputs;
}
