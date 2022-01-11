import { ShaderChunk } from 'three';

ShaderChunk.indirect_lighting_fragment = /* glsl */`

#if defined( RE_IndirectDiffuse )

vec3 iblIrradiance = vec3( 0.0 );

vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );

irradiance += getLightProbeIrradiance( lightProbe, geometry.normal );

#if ( NUM_HEMI_LIGHTS > 0 )

    #pragma unroll_loop_start
    for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {

        irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry.normal );

    }
    #pragma unroll_loop_end

#endif

#endif

#if defined( RE_IndirectSpecular )

vec3 radiance = vec3( 0.0 );
vec3 clearcoatRadiance = vec3( 0.0 );

#endif
`;
