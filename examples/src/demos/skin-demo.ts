import { SkinMaterial, SSSPass } from '3ffects';

import {
  DirectionalLight,
  Mesh, MeshStandardMaterial, Object3D, PerspectiveCamera, Scene, WebGLRenderer, UnsignedByteType, PMREMGenerator, LinearFilter, Group, Texture, TextureLoader
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { HDRCubeTextureLoader } from 'three/examples/jsm/loaders/HDRCubeTextureLoader';

export class SkinDemo {

  private _scene: Scene;
  private _camera: PerspectiveCamera;
  private _light: DirectionalLight;
  private _controls: OrbitControls;

  private _material: SkinMaterial;
  private _sssPass: SSSPass;

  constructor(renderer: WebGLRenderer, camera: PerspectiveCamera) {
    this._scene = new Scene();
    this._camera = camera;
    this._camera.near = 0.05;
    this._camera.far = 5.0;
    this._camera.position.z = 0.5;
    this._camera.updateProjectionMatrix();
    this._camera.updateMatrix();

    this._light = new DirectionalLight(0xFFFFFF, 2.0);
    // this._light.target.position.set(-1.0, -1.0, 1.0);
    this._light.target.position.set(-0.0, -1.0, 0.0);
    this._light.castShadow = true;

    this._controls = new OrbitControls(this._camera, renderer.domElement);
    this._controls.minDistance = 0.5;
    this._controls.maxDistance = 4.0;

    this._material = new SkinMaterial();
    this._sssPass = new SSSPass();

    this._scene.add(this._light);

    this._load(renderer);
  }

  update() {

  }

  render(renderer: WebGLRenderer) {
    this._sssPass.render(renderer, this._scene, this._camera);
  }

  resize(width: number, height: number) {
    this._sssPass.setSize(width, height);
  }

  private async _load(renderer: WebGLRenderer): Promise<void> {
    const [ cubeTexture, envTexture ] = await this._loadEnv(renderer);

    const mesh = await this._loadMesh();
    mesh.traverse((object: Object3D) => {
      if ((object as Mesh).isMesh) {
        object.castShadow = true; //default is false
        object.receiveShadow = true; //default
        // const material = new MeshStandardMaterial();
        // material.envMap = envTexture;
        // material.needsUpdate = true;
        (object as Mesh).material = this._material;
      }
    });

    this._scene.add(mesh);
    this._scene.background = cubeTexture;
    this._scene.environment = envTexture;

    const textures = await this._loadTextures();
    mesh.traverse((object: Object3D) => {
      if ((object as Mesh).isMesh) {
        const material = (object as Mesh).material as MeshStandardMaterial;
        material.map = textures.albedo;
        material.normalMap = textures.normal;
        material.envMap = envTexture;
        material.needsUpdate = true;
      }
    });
  }

  private _loadMesh(): Promise<Group> {
    return new Promise((res, rej) => {
      const loader = new OBJLoader();
      loader.load(
        // resource URL
        'assets/models/lee-perry-smith/head.obj',
        // called when the resource is loaded
        function(obj) { res(obj); },
        function (xhr) {},
        function (error) { rej(error); }
      );
    });
  }

  private _loadTextures(): Promise<PerryTextures> {
    return Promise.all([
      this._loadJPGPNG('lambertian.jpeg'),
      this._loadJPGPNG('normal.png'),
    ]).then((textures) => {
      return {
        albedo: textures[0],
        normal: textures[1],
        transmission: null
      };
    })
  }

  private _loadEnv(renderer: WebGLRenderer): Promise<Texture[]> {
    return new Promise((res, rej) => {
      const pmremGenerator = new PMREMGenerator(renderer);
      pmremGenerator.compileCubemapShader();

      const hdrTexture = new HDRCubeTextureLoader()
        .setPath('assets/env/pisa/')
        .setDataType(UnsignedByteType)
        .load(['px.hdr', 'nx.hdr', 'py.hdr', 'ny.hdr', 'pz.hdr', 'nz.hdr'], () => {
          const envTexture = pmremGenerator.fromCubemap(hdrTexture);
          hdrTexture.magFilter = LinearFilter;
          hdrTexture.needsUpdate = true;
          res([hdrTexture, envTexture.texture]);
        });
    });
  }

  private _loadJPGPNG(path: string): Promise<Texture> {
    return new Promise((res, rej) => {
      const loader = new TextureLoader();
      loader.setPath('assets/models/lee-perry-smith/')
      loader.load(
        path,
        function(texture) { res(texture); },
        undefined,
        function(e) { rej(e); }
      );
    });
  }

}

interface PerryTextures {
  albedo: Texture;
  normal: Texture;
  // transmission: Texture;
}
