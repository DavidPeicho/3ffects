import { SkinMaterial, SSSPass } from '3ffects';
import { GUI } from 'dat.gui';

import {
  DirectionalLight,
  Mesh, Object3D, PerspectiveCamera, Scene, WebGLRenderer, UnsignedByteType, PMREMGenerator, LinearFilter, Group, Texture, TextureLoader, Clock, Vector3, Box3, CameraHelper, PlaneGeometry, EventDispatcher, MeshLambertMaterial, ShadowMapType, BasicShadowMap, FrontSide, DoubleSide
} from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { HDRCubeTextureLoader } from 'three/examples/jsm/loaders/HDRCubeTextureLoader';

export class SkinDemo {

  private _renderer: WebGLRenderer;

  private _scene: Scene;
  private _perry: Group | Mesh | null;
  private _camera: PerspectiveCamera;
  private _light: DirectionalLight;
  private _controls: OrbitControls;

  private _material: SkinMaterial;
  private _sssPass: SSSPass;

  private _textures: PerryTextures | null = null;

  private _guiParameters: GUIParameters;

  private _clock: Clock;

  constructor(renderer: WebGLRenderer, camera: PerspectiveCamera) {
    renderer.shadowMap.enabled = true ;

    this._renderer = renderer;

    this._scene = new Scene();
    this._camera = camera;
    this._camera.near = 0.5;
    this._camera.far = 50.0;
    this._camera.position.set(0.0, 0.0, 5.0);
    this._camera.updateProjectionMatrix();
    this._camera.updateMatrix();
    this._perry = null;

    this._light = new DirectionalLight(0xFFFFFF, 2.0);
    this._light.castShadow = true;
    this._light.shadow.camera.near = - 10.0;
    this._light.shadow.camera.far = 10.0;
    this._light.shadow.bias = -0.01;
    this._light.shadow.normalBias = -0.02;
    this._light.shadow.mapSize.set(1024, 1024);

    this._light.shadow.camera.updateProjectionMatrix();
    this._light.target.position.set(0.0, 0.0, -1.0);
    this._light.add(this._light.target);

    const helper = new CameraHelper(this._light.shadow.camera );
    this._scene.add( helper );

    this._controls = new OrbitControls(this._camera, renderer.domElement);

    this._material = new SkinMaterial();
    this._material.shadowSide = DoubleSide;
    this._sssPass = new SSSPass();

    this._scene.add(this._light);

    const plane = new Mesh(new PlaneGeometry(), new MeshLambertMaterial());
    plane.position.set(0, 0, -5);
    plane.scale.set(5, 5, 5);
    plane.receiveShadow = true;
    this._scene.add(plane);

    this._guiParameters = {
      sssStrength: 1.0,
      sssWidth: 0.75,
      zPos: 0.0,
      scale: 1.0,

      bias: this._light.shadow.bias,
      normalbias: this._light.shadow.normalBias,
      transluency: 0.5,

      ao: true,
      transluencyMap: true,

      envIntensity: 1.0,
      lightIntensity: this._light.intensity
    };

    this._load(renderer);
    this._buildGUI();

    this._clock = new Clock();
  }

  update() {
    if (this._perry) {
      const s = this._guiParameters.scale;
      this._perry.position.z = this._guiParameters.zPos;
      this._perry.scale.set(s, s, s);
    }

    const delta = this._clock.getDelta();
    const elapsed = this._clock.getElapsedTime();

    if (this._textures) {
      this._material.aoMap = this._guiParameters.ao ? this._textures.occlusion : null;
      this._material.transluencyMap = this._guiParameters.transluencyMap ? this._textures.transmission : null;
    }

    this._light.shadow.bias = this._guiParameters.bias;
    this._light.shadow.normalBias = this._guiParameters.normalbias;
    // this._light.target.position.x = Math.cos(elapsed * 0.5);
    // this._light.target.position.y = Math.sin(elapsed * 0.5);
    // this._light.target.position.z = Math.cos(elapsed * 0.5);
  }

  render(renderer: WebGLRenderer) {
    // Reflects GUI parameters onto the material.
    this._material.sssWidth = this._guiParameters.sssWidth;
    this._material.transluency = this._guiParameters.transluency;
    this._material.sssStrength = this._guiParameters.sssStrength;
    this._material.envMapIntensity = this._guiParameters.envIntensity;

    this._light.intensity = this._guiParameters.lightIntensity;

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
        (object as Mesh).material = this._material;
        object.scale.set(10.0, 10.0, 10.0);
        object.receiveShadow = true;
        object.castShadow = true;

        const g = (object as Mesh).geometry;
        // Required for ao map...
        g.attributes.uv2 = g.attributes.uv;
      }
    });

    this._perry = mesh;

    this._scene.add(mesh);
    // this._scene.background = cubeTexture;
    this._scene.environment = envTexture;

    this._controls.target = new Vector3(0.0, 0.0, 0.0);
    this._controls.target = new Vector3(0.0, 0.0, 5.0);
    new Box3().setFromObject(this._perry).getCenter(this._controls.target);

    this._controls.reset();
    this._controls.update();

    this._textures = await this._loadTextures();
    mesh.traverse((object: Object3D) => {
      if ((object as Mesh).isMesh) {
        const material = (object as Mesh).material as SkinMaterial;
        material.map = this._textures!.albedo;
        material.normalMap = this._textures!.normal;
        material.transluencyMap = this._textures!.transmission;
        material.aoMap = this._textures!.occlusion;
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
      this._loadJPGPNG('transmission.jpg'),
      this._loadJPGPNG('out_occlusion.png')
    ]).then((textures) => {
      return {
        albedo: textures[0],
        normal: textures[1],
        transmission: textures[2],
        occlusion: textures[3],
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

    gui.add(this._guiParameters, 'sssStrength', 0.0, 2.0, 0.05);
    gui.add(this._guiParameters, 'sssWidth', 0.0, 1.0, 0.01);
    gui.add(this._guiParameters, 'transluency', 0.0, 1.0, 0.05);

    gui.add(this._guiParameters, 'zPos', -10.0, 10, 0.1);
    gui.add(this._guiParameters, 'scale', 1.0, 20, 0.5);
    gui.add(this._guiParameters, 'bias', -0.2, 0.2, 0.001);
    gui.add(this._guiParameters, 'normalbias', -0.2, 0.2, 0.001);

    gui.add(this._guiParameters, 'ao');
    gui.add(this._guiParameters, 'transluencyMap');

    gui.add(this._guiParameters, 'envIntensity', 0.0, 2.0, 0.25);
    gui.add(this._guiParameters, 'lightIntensity', 0.0, 5.0, 0.25);

    gui.open();
  }

}

interface PerryTextures {
  albedo: Texture;
  normal: Texture;
  transmission: Texture;
  occlusion: Texture;
}

interface GUIParameters {
  sssStrength: number;
  sssWidth: number;
  transluency: number;

  ao: boolean;
  transluencyMap: boolean;

  zPos: number;
  scale: number;

  bias: number;
  normalbias: number;

  envIntensity: number;
  lightIntensity: number;
}
