export default `
precision highp float;
precision highp sampler2D;

layout(location = 0) out vec4 gDiffuse;
layout(location = 1) out vec4 gBuffer;

#define STANDARD

uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;

/* SSS uniforms. */

uniform float uSSSStrength;

#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform vec3 attenuationColor;
	uniform float attenuationDistance;
#endif
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
#include <transmission_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <lights_physical_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

vec3
TransmissionMap(float s)
{
 return (
	vec3(0.233, 0.455, 0.649) * exp(-s*s / 0.0064) +
	vec3(0.1, 0.336, 0.344) * exp(-s*s/0.0484) +
	vec3(0.118, 0.198, 0.0) * exp(-s*s/0.187) +
	vec3(0.113, 0.007, 0.007) * exp(-s*s/0.567) +
	vec3(0.358, 0.004, 0.0) * exp(-s*s/1.99) +
	vec3(0.078, 0.0, 0.0) * exp(-s*s/7.41)
 );
}

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
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	// modulation
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	// vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;

	#ifdef USE_SHADOWMAP
		#if NUM_DIR_LIGHT_SHADOWS > 0

			directionalLightShadow = directionalLightShadows[0];

			vec4 shadowUv = vDirectionalShadowCoord[0];
			shadowUv.xyz /= shadowUv.w;
			shadowUv.z += directionalLightShadow.shadowBias;

			float depthShadow = unpackRGBAToDepth(
				texture2D(directionalShadowMap[0], shadowUv.xy)
			);

			// gDiffuse = vec4(vec3(depthShadow), uSSSStrength);
			gDiffuse = vec4(totalDiffuse.rgb, uSSSStrength);
			// gDiffuse = vec4(vec3(vViewPosition.z), uSSSStrength);

		#endif // NUM_DIR_LIGHT_SHADOWS > 0
	#else
		gDiffuse = vec4(totalDiffuse.rgb, uSSSStrength);
	#endif // USE_SHADOWMAP
		// gDiffuse = vec4(totalDiffuse.rgb, uSSSStrength);
	gBuffer = vec4(totalSpecular, 1.0);

	// #include <tonemapping_fragment>
	// #include <encodings_fragment>
	// #include <fog_fragment>
	// #include <premultiplied_alpha_fragment>
	// #include <dithering_fragment>
}

`;
