import { SkinMaterial, SSSPass } from '3ffects';
import { GUI } from 'dat.gui';

import {
  DirectionalLight,
  Mesh, MeshStandardMaterial, Object3D, PerspectiveCamera, Scene, WebGLRenderer, UnsignedByteType, PMREMGenerator, LinearFilter, Group, Texture, TextureLoader, Clock, Vector3, Box3
} from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { HDRCubeTextureLoader } from 'three/examples/jsm/loaders/HDRCubeTextureLoader';
import { KTXLoader } from 'three/examples/jsm/loaders/KTXLoader';

export class SkinDemo {

  private _scene: Scene;
  private _perry: Group | Mesh | null;
  private _camera: PerspectiveCamera;
  private _light: DirectionalLight;
  private _controls: OrbitControls;

  private _material: SkinMaterial;
  private _sssPass: SSSPass;

  private _guiParameters: GUIParameters;

  private _clock: Clock;

  constructor(renderer: WebGLRenderer, camera: PerspectiveCamera) {
    renderer.shadowMap.enabled = true ;

    this._scene = new Scene();
    this._camera = camera;
    this._camera.near = 0.05;
    this._camera.far = 5.0;
    this._camera.position.set(0.0, 0.0, 0.5);
    this._camera.updateProjectionMatrix();
    this._camera.updateMatrix();
    this._perry = null;

    this._light = new DirectionalLight(0xFFFFFF, 2.0);
    this._light.castShadow = true;
    // this._light.target.position.set(-1.0, -1.0, 1.0);
    this._light.target.position.set(-0.0, -1.0, 0.0);
    this._light.castShadow = true;

    this._controls = new OrbitControls(this._camera, renderer.domElement);
    this._controls.minDistance = 0.15;
    this._controls.maxDistance = 2.5;

    this._material = new SkinMaterial();
    this._sssPass = new SSSPass();

    this._scene.add(this._light);

    this._guiParameters = {
      sssStrength: 1.0,
      sssWidth: 0.1
    };

    this._load(renderer);

    const loader = new KTXLoader();

    this._clock = new Clock();

    this._buildGUI();

    // window.onclick = () => {
    //   const can = renderer.getContext().canvas;
    //   renderer.render(this._scene, this._camera);
    //   var dataURL = can.toDataURL("image/png");
    //   var newTab = window.open('about:blank','image from canvas')!;
    //   newTab.document.write("<img src='" + dataURL + "' alt='from canvas'/>");
    // }
  }

  update() {
    if (this._perry !== null) {
      // this._perry.rotateY(this._clock.getDelta());
      this._perry.updateMatrix();
    }
  }

  render(renderer: WebGLRenderer) {
    // Reflects GUI parameters onto the material.
    this._material.sssStrength = this._guiParameters.sssStrength;
    // @ts-ignore
    this._sssPass._blurMaterial.uniforms.uSSSWidth.value = this._guiParameters.sssWidth;
    this._sssPass.render(renderer, this._scene, this._camera);

    // renderer.setClearAlpha(0.0);
    // renderer.render(this._scene, this._camera);
  }

  resize(width: number, height: number) {
    this._sssPass.setSize(width, height);
  }

  private async _load(renderer: WebGLRenderer): Promise<void> {
    const [ cubeTexture, envTexture ] = await this._loadEnv(renderer);

    const mesh = await this._loadMesh();
    mesh.traverse((object: Object3D) => {
      if ((object as Mesh).isMesh) {
        // object.castShadow = true; //default is false
        // object.receiveShadow = true; //default
        // const material = new MeshStandardMaterial();
        // material.envMap = envTexture;
        // material.needsUpdate = true;
        // material.wireframe = true;
        // (object as Mesh).material = material;
        (object as Mesh).material = this._material;
        mesh.receiveShadow = true;
      }
    });

    this._perry = mesh;

    this._scene.add(mesh);
    // this._scene.background = cubeTexture;
    this._scene.environment = envTexture;

    this._controls.target = new Vector3(0.0, 0.0, 0.0);
    this._controls.target = new Vector3(0.0, 0.0, 2.0);
    new Box3().setFromObject(this._perry).getCenter(this._controls.target);
    this._controls.update();

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

  private _buildGUI(): void {
    const gui = new GUI();

    gui.add(this._guiParameters, 'sssStrength', 0.0, 1.0, 0.05);
    gui.add(this._guiParameters, 'sssWidth', 0.0, 0.25, 0.01);

    gui.open();
  }

}

interface PerryTextures {
  albedo: Texture;
  normal: Texture;
  // transmission: Texture;
}

interface GUIParameters {
  sssStrength: number;
  sssWidth: number;
}
