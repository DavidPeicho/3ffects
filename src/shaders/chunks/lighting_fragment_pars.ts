import { ShaderChunk } from 'three';

import './shadow_pars_fragment_extended.ts';

ShaderChunk.lighting_fragment_pars = /* glsl */`

void
computeReflectedLight(
    inout ReflectedLight reflectedLight,
    const in GeometricContext geometry,
    const in MATERIAL_DATA materialData
)
{
    /**
     * This file is copied and modified from Three.js.
     *
     * It might be a little bit painful to maintain, but that's the most
     * performant solution.
     */

    #ifdef USE_SHADOWMAP

        Shadow shadowTmp;

    #endif // USE_SHADOWMAP

    IncidentLight directLight;

    #if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )

        PointLight pointLight;
        #if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
        PointLightShadow pointLightShadow;
        #endif

        #pragma unroll_loop_start
        for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {

            pointLight = pointLights[ i ];

            getPointLightInfo( pointLight, geometry, directLight );

            #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
            pointLightShadow = pointLightShadows[ i ];
            directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
            #endif

            RE_Direct( directLight, geometry, materialData.material, reflectedLight );

        }
        #pragma unroll_loop_end

    #endif

    #if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )

        SpotLight spotLight;
        #if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
        SpotLightShadow spotLightShadow;
        #endif

        #pragma unroll_loop_start
        for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {

            spotLight = spotLights[ i ];

            getSpotLightInfo( spotLight, geometry, directLight );

            #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
            spotLightShadow = spotLightShadows[ i ];
            directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotShadowCoord[ i ] ) : 1.0;
            #endif

            RE_Direct( directLight, geometry, materialData.material, reflectedLight );

        }
        #pragma unroll_loop_end

    #endif

    #if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )

        DirectionalLight directionalLight;
        #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
        DirectionalLightShadow directionalLightShadow;
        #endif

        #pragma unroll_loop_start
        for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {

            directionalLight = directionalLights[ i ];

            getDirectionalLightInfo( directionalLight, geometry, directLight );

            #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )

                directionalLightShadow = directionalLightShadows[ i ];
                getShadow(
                    shadowTmp,
                    directionalShadowMap[ i ],
                    directionalLightShadow.shadowMapSize,
                    directionalLightShadow.shadowRadius,
                    directionalLightShadow.shadowBias,
                    vDirectionalShadowCoord[ i ],
                    directLight.visible
                );
                directLight.color *= getShadowAttenuation(shadowTmp.distance, shadowTmp.coords);

            #endif // USE_SHADOWMAP && (UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS)

            RE_Direct(directLight, geometry, materialData.material, reflectedLight);
            #ifdef RE_Direct_Extended
                RE_Direct_Extended(directLight, shadowTmp, geometry, materialData, reflectedLight);
            #endif // RE_Direct_Extended

        }
        #pragma unroll_loop_end

    #endif

    #if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )

        RectAreaLight rectAreaLight;

        #pragma unroll_loop_start
        for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {

            rectAreaLight = rectAreaLights[ i ];
            RE_Direct_RectArea( rectAreaLight, geometry, material, reflectedLight );

        }
        #pragma unroll_loop_end

    #endif
}
`;
