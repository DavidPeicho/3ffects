export default `
precision highp float;
precision highp sampler2D;

out vec4 color;

#define STANDARD

uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;

#ifdef REFLECTIVITY
    uniform float reflectivity;
#endif
#ifdef CLEARCOAT
    uniform float clearcoat;
    uniform float clearcoatRoughness;
#endif
#ifdef USE_SHEEN
    uniform vec3 sheen;
#endif
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
    varying vec3 vNormal;
    #ifdef USE_TANGENT
        varying vec3 vTangent;
        varying vec3 vBitangent;
    #endif
#endif

#if defined ( USE_SHADOWMAP )
    varying vec3 vWorldPosition;
#endif // USE_SHADOWMAP

#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <bsdfs>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <lights_physical_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmap_pars_fragment_extended>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
#include <transluency_pars_begin>

struct MaterialData
{
    PhysicalMaterial material;
    TransmittanceData transmittance;
};

#define MATERIAL_DATA MaterialData

void
RE_Direct_Transluency(
    const in IncidentLight directLight,
    const in Shadow shadow,
    const in GeometricContext geometry,
    const in MaterialData material,
    inout ReflectedLight reflectedLight
)
{
    float fragDepthLightSpace = shadow.coords.z / shadow.coords.w;
    reflectedLight.directDiffuse += uTransluency * SSSSTransmittance(
        material.transmittance.thickness,
        material.transmittance.transluency,
        geometry.normal,
        directLight.direction,
        shadow.distance,
        fragDepthLightSpace
    );
}

#ifndef RE_Direct_Extended
    #define RE_Direct_Extended RE_Direct_Transluency
#endif // !RE_Direct_Extended

#include <lighting_fragment_pars>

void main() {
    #include <clipping_planes_fragment>
    vec4 diffuseColor = vec4( diffuse, opacity );
    ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
    vec3 totalEmissiveRadiance = emissive;
    #include <logdepthbuf_fragment>
    #include <map_fragment>
    #include <color_fragment>
    #include <alphamap_fragment>
    #include <alphatest_fragment>
    #include <roughnessmap_fragment>
    #include <metalnessmap_fragment>
    #include <normal_fragment_begin>
    #include <normal_fragment_maps>
    #include <clearcoat_normal_fragment_begin>
    #include <clearcoat_normal_fragment_maps>
    #include <emissivemap_fragment>
    // accumulation
    #include <lights_physical_fragment>

    GeometricContext geometry;
    geometry.position = - vViewPosition;
    geometry.normal = normal;
    geometry.viewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );

    #ifdef USE_CLEARCOAT

        geometry.clearcoatNormal = clearcoatNormal;

    #endif

    MaterialData materialData;
    materialData.material = material;
    initializeTransmittanceMaterialData(materialData.transmittance);

    computeReflectedLight(reflectedLight, geometry, materialData);

    #include <indirect_lighting_fragment>
    #include <lights_fragment_maps>
    #include <lights_fragment_end>

    #include <aomap_fragment>

    vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
    vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;

    // gDiffuse = vec4(totalDiffuse, uSSSStrength);
    // gBuffer = vec4(totalSpecular, 1.0);

    color = vec4(totalDiffuse, uSSSStrength);

    // #include <tonemapping_fragment>
    // #include <encodings_fragment>
    // #include <fog_fragment>
    // #include <premultiplied_alpha_fragment>
}

`;
