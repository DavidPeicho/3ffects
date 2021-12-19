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
uniform float uSSSSWidth;
uniform float uTransluency;
uniform float uThickness;

#ifdef USE_TRANSLUENCY_MAP
    uniform sampler2D uTransluencyMap;
#endif // USE_TRANSLUENCY_MAP

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

#ifdef USE_SHADOWMAP
    #if NUM_DIR_LIGHT_SHADOWS > 0
        uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
    #endif
#endif

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

vec3
SSSSTransmittance(
    /**
        * This parameter allows to control the transmittance effect. Its range
        * should be 0..1. Higher values translate to a stronger effect.
        */
    float thickness,

    /**
        * Position in world space.
        */
    vec3 worldPosition,

    /**
        * Normal in world space.
        */
    vec3 worldNormal,

    /**
        * Light vector: lightWorldPosition - worldPosition.
        */
    vec3 light,

    // 0...1
    float shadowDistance,

    // 0...1
    float lightToPointDistance
) {
    /**
        * Calculate the scale of the effect.
        */
    // Why 500 though.
    float thicknessDist = abs(shadowDistance - lightToPointDistance);
    float scale = 500.0 * thicknessDist * saturate(thickness);

    /**
        * Armed with the thickness, we can now calculate the color by means of the
        * precalculated transmittance profile.
        * (It can be precomputed into a texture, for maximum performance):
        */
    float dd = -scale * scale;
    vec3 profile = vec3(0.233, 0.455, 0.649) * exp(dd / 0.0064) +
                        vec3(0.1,   0.336, 0.344) * exp(dd / 0.0484) +
                        vec3(0.118, 0.198, 0.0)   * exp(dd / 0.187)  +
                        vec3(0.113, 0.007, 0.007) * exp(dd / 0.567)  +
                        vec3(0.358, 0.004, 0.0)   * exp(dd / 1.99)   +
                        vec3(0.078, 0.0,   0.0)   * exp(dd / 7.41);

    /** 
        * Using the profile, we finally approximate the transmitted lighting from
        * the back of the object:
        */
    return profile * saturate(0.3 + dot(light, -worldNormal));
}

float
fetchShadowDepth(sampler2D depths, vec2 uv)
{
    return unpackRGBAToDepth(texture2D(depths, uv).rgba);
}

float getShadowDepth(
    sampler2D shadowMap,
    vec2 shadowMapSize,
    float shadowBias,
    float shadowRadius,
    vec4 shadowCoord
) {
    shadowCoord.xyz /= shadowCoord.w;
    shadowCoord.z += shadowBias;
    bvec4 inFrustumVec = bvec4 ( shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0 );
    bool inFrustum = all( inFrustumVec );
    bvec2 frustumTestVec = bvec2( inFrustum, shadowCoord.z <= 1.0 );
    bool frustumTest = all( frustumTestVec );
    if ( frustumTest ) {
    #if defined( SHADOWMAP_TYPE_PCF )
        vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
        float dx0 = - texelSize.x * shadowRadius;
        float dy0 = - texelSize.y * shadowRadius;
        float dx1 = + texelSize.x * shadowRadius;
        float dy1 = + texelSize.y * shadowRadius;
        float dx2 = dx0 / 2.0;
        float dy2 = dy0 / 2.0;
        float dx3 = dx1 / 2.0;
        float dy3 = dy1 / 2.0;
        return (
            fetchShadowDepth( shadowMap, shadowCoord.xy + vec2( dx0, dy0 )) +
            fetchShadowDepth( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 )) +
            fetchShadowDepth( shadowMap, shadowCoord.xy + vec2( dx1, dy0 )) +
            fetchShadowDepth( shadowMap, shadowCoord.xy + vec2( dx2, dy2 )) +
            fetchShadowDepth( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 )) +
            fetchShadowDepth( shadowMap, shadowCoord.xy + vec2( dx3, dy2 )) +
            fetchShadowDepth( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 )) +
            fetchShadowDepth( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 )) +
            fetchShadowDepth(shadowMap, shadowCoord.xy) +
            fetchShadowDepth( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 )) +
            fetchShadowDepth( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 )) +
            fetchShadowDepth( shadowMap, shadowCoord.xy + vec2( dx2, dy3 )) +
            fetchShadowDepth( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 )) +
            fetchShadowDepth( shadowMap, shadowCoord.xy + vec2( dx3, dy3 )) +
            fetchShadowDepth( shadowMap, shadowCoord.xy + vec2( dx0, dy1 )) +
            fetchShadowDepth( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 )) +
            fetchShadowDepth( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ))
        ) * ( 1.0 / 17.0 );
    #elif defined( SHADOWMAP_TYPE_PCF_SOFT )
        vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
        float dx = texelSize.x;
        float dy = texelSize.y;
        vec2 uv = shadowCoord.xy;
        vec2 f = fract( uv * shadowMapSize + 0.5 );
        uv -= f * texelSize;
        shadow = (
            texture2DCompare( shadowMap, uv, shadowCoord.z ) +
            texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
            texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
            texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
            mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ), 
                    texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
                    f.x ) +
            mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ), 
                    texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
                    f.x ) +
            mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ), 
                    texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
                    f.y ) +
            mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ), 
                    texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
                    f.y ) +
            mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ), 
                        texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
                        f.x ),
                    mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ), 
                        texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
                        f.x ),
                    f.y )
        ) * ( 1.0 / 9.0 );
    #elif defined( SHADOWMAP_TYPE_VSM )
        shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
    #else // no percentage-closer filtering:
        return fetchShadowDepth( shadowMap, shadowCoord.xy );
    #endif
    }
    return 100000.0;
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

    #ifdef USE_SHADOWMAP

        #if ( NUM_DIR_LIGHTS > 0 )

            #if NUM_DIR_LIGHT_SHADOWS > 0

                directionalLight = directionalLights[ 0 ];
                directionalLightShadow = directionalLightShadows[0];
	            vec3 diff = directionalLight.color * BRDF_Lambert( material.diffuseColor );

                float depthShadow = getShadowDepth(
                    directionalShadowMap[0],
                    directionalLightShadow.shadowMapSize,
                    directionalLightShadow.shadowBias,
                    directionalLightShadow.shadowRadius,
                    vDirectionalShadowCoord[0]
                );
                float fragDepthLightSpace = vDirectionalShadowCoord[0].z / vDirectionalShadowCoord[0].w;

                vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
                vec3 lightWorld = inverseTransformDirection(directionalLights[ 0 ].direction, viewMatrix);
                reflectedLight.directDiffuse += diff * uTransluency * SSSSTransmittance(
                    uThickness,
                    vWorldPosition,
                    worldNormal,
                    lightWorld,
                    depthShadow,
                    fragDepthLightSpace
                );

            #endif // NUM_DIR_LIGHT_SHADOWS > 0

        #endif // NUM_DIR_LIGHTS > 0

    #endif // USE_SHADOWMAP

    // vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
    // gDiffuse = vec4(totalDiffuse.rgb, uSSSStrength);

    #include <aomap_fragment>

    vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
    vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;

    gDiffuse = vec4(totalDiffuse, uSSSStrength);
    gBuffer = vec4(totalSpecular, 1.0);

    // #include <tonemapping_fragment>
    // #include <encodings_fragment>
    // #include <fog_fragment>
    // #include <premultiplied_alpha_fragment>
    // #include <dithering_fragment>
}

`;
