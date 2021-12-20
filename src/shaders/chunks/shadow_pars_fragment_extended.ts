import { ShaderChunk } from 'three';

ShaderChunk.shadowmap_pars_fragment_extended = /* glsl */`

#ifdef USE_SHADOWMAP

  struct Shadow
  {
    vec4  coords;
    float distance;
  };

	float
  getShadowAttenuation(float shadowDepth, vec4 shadowCoords)
  {
		return step(shadowCoords.z, shadowDepth);
	}

  float
  fetchShadowDepth(sampler2D depths, vec2 uv)
  {
    return unpackRGBAToDepth(texture2D(depths, uv).rgba);
  }

  vec4
  processShadowCoords(vec4 coords, float shadowBias)
  {
    coords.xyz /= coords.w;
    coords.z += shadowBias;
    return coords;
  }

  float getShadowDistanceNormalized(
    sampler2D shadowMap,
    vec2 shadowMapSize,
    float shadowRadius,
    vec4 shadowCoord
  )
  {
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
      return VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
    #else // no percentage-closer filtering:
      return fetchShadowDepth( shadowMap, shadowCoord.xy );
    #endif
    }
    return 1.00001;
  }

  void
  getShadow(
    inout Shadow shadow,
    sampler2D shadowMap,
    vec2 shadowMapSize,
    float shadowRadius,
    float shadowBias,
    vec4 shadowCoord,
    bool isLightVisible
  )
  {
    shadow.coords = processShadowCoords(shadowCoord, shadowBias);
    shadowTmp.distance = all(bvec2(isLightVisible, receiveShadow)) ?
        getShadowDistanceNormalized(
            shadowMap,
            shadowMapSize,
            shadowRadius,
            shadow.coords
        ) : 1.0;
  }

#endif // USE_SHADOWMAP

`;
