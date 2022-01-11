import { ShaderChunk } from 'three';

ShaderChunk.transluency_pars_begin = /* glsl */`

/* SSS uniforms. */

uniform float uSSSStrength;
uniform float uSSSSWidth;
uniform float uTransluency;
uniform float uThickness;

#ifdef USE_TRANSLUENCY_MAP
    uniform sampler2D uTransluencyMap;
#endif // USE_TRANSLUENCY_MAP

struct TransmittanceData
{
    float transluency;
    float thickness;
};

void
initializeTransmittanceMaterialData(inout TransmittanceData data)
{
    data.transluency = uTransluency;
    data.thickness = uThickness;
}

vec3
SSSSTransmittance(
    /**
        * This parameter allows to control the transmittance effect. Its range
        * should be 0..1. Higher values translate to a stronger effect.
        */
    float thickness,

    float transluency,

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
)
{
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
    return transluency * profile * saturate(0.3 + dot(light, -worldNormal));
}
`;
