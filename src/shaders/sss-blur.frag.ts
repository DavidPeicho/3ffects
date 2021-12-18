export default `

/**
 * Copyright (C) 2012 Jorge Jimenez (jorge@iryoku.com)
 * Copyright (C) 2012 Diego Gutierrez (diegog@unizar.es)
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *    1. Redistributions of source code must retain the above copyright notice,
 *       this list of conditions and the following disclaimer.
 *
 *    2. Redistributions in binary form must reproduce the following disclaimer
 *       in the documentation and/or other materials provided with the
 *       distribution:
 *
 *       "Uses Separable SSS. Copyright (C) 2012 by Jorge Jimenez and Diego
 *        Gutierrez."
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 'AS
 * IS' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL COPYRIGHT HOLDERS OR CONTRIBUTORS
 * BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 * The views and conclusions contained in the software and documentation are
 * those of the authors and should not be interpreted as representing official
 * policies, either expressed or implied, of the copyright holders.
 */


/**
 *                  _______      _______      _______      _______
 *                 /       |    /       |    /       |    /       |
 *                |   (----    |   (----    |   (----    |   (----
 *                 \   \        \   \        \   \        \   \
 *              ----)   |    ----)   |    ----)   |    ----)   |
 *             |_______/    |_______/    |_______/    |_______/
 *
 *        S E P A R A B L E   S U B S U R F A C E   S C A T T E R I N G
 *
 *                           http://www.iryoku.com/
 *
 * Hi, thanks for your interest in Separable SSS!
 *
 * It's a simple shader composed of two components:
 *
 * 1) A transmittance function, 'SSSSTransmittance', which allows to calculate
 *    light transmission in thin slabs, useful for ears and nostrils. It should
 *    be applied during the main rendering pass as follows:
 *
 *        float3 t = albedo.rgb * lights[i].color * attenuation * spot;
 *        color.rgb += t * SSSSTransmittance(...)
 *
 *    (See 'Main.fx' for more details).
 *
 * 2) A simple two-pass reflectance post-processing shader, 'SSSSBlur*', which
 *    softens the skin appearance. It should be applied as a regular
 *    post-processing effect like bloom (the usual framebuffer ping-ponging):
 *
 *    a) The first pass (horizontal) must be invoked by taking the final color
 *       framebuffer as input, and storing the results into a temporal
 *       framebuffer.
 *    b) The second pass (vertical) must be invoked by taking the temporal
 *       framebuffer as input, and storing the results into the original final
 *       color framebuffer.
 *
 *    Note that This SSS filter should be applied *before* tonemapping.
 *
 * Before including SeparableSSS.h you'll have to setup the target. The
 * following targets are available:
 *         SMAA_HLSL_3
 *         SMAA_HLSL_4
 *         SMAA_GLSL_3
 *
 * For more information of what's under the hood, you can check the following
 * URLs (but take into account that the shader has evolved a little bit since
 * these publications):
 *
 * 1) Reflectance: http://www.iryoku.com/sssss/
 * 2) Transmittance: http://www.iryoku.com/translucency/
 *
 * If you've got any doubts, just contact us!
 */

precision highp float;
precision highp sampler2D;

in vec2 vUv;

layout(location = 0) out vec4 fragColor;

uniform sampler2D uDiffuseTexture;
uniform sampler2D uDepthTexture;
uniform vec2 uBlurDirection;

uniform float uCameraNear;
uniform float uCameraFar;

uniform float uSSSWidth;

float perspectiveDepthToViewZ( const in float invClipZ, const in float near, const in float far )
{
	return ( near * far ) / ( ( far - near ) * invClipZ - far );
}

float getLinearDepth(const in float nonLinearDepth)
{
  float ndc = 2.0 * nonLinearDepth - 1.0;
  return 2.0 * uCameraNear * uCameraFar / (uCameraFar + uCameraNear - ndc * (uCameraFar - uCameraNear));
}

float getZ(vec2 uv)
{
  return abs(perspectiveDepthToViewZ(texture(uDepthTexture, uv).r, uCameraNear, uCameraFar));
}

float getSSSDepth(vec2 uv)
{
  float d = getLinearDepth(texture(uDepthTexture, uv).r);
  return 1.0 / d;
}

void main()
{
  vec4 colorM = texture(uDiffuseTexture, vUv);
  // @todo: replace by stencil test
  if (colorM.r <= 0.00001 && colorM.g <= 0.00001 && colorM.b <= 0.00001)
  {
    discard;
  }

  // Fetch color and linear depth for current pixel:
  // float depthM = getSSSDepth(vUv);
  float depthRange = uCameraFar - uCameraNear;
  float depthM = getZ(vUv);
  // float depthM = getLinearDepth(texture(uDepthTexture, vUv).r) / depthRange;

  vec4 kernel[11];
  kernel[0] = vec4(0.560479, 0.669086, 0.784728, 0.0);
  kernel[1] = vec4(0.00471691, 0.000184771, 5.07566e-005, -2.0);
  kernel[2] =     vec4(0.0192831, 0.00282018, 0.00084214, -1.28);
  kernel[3] =     vec4(0.03639, 0.0130999, 0.00643685, -0.72);
  kernel[4] =     vec4(0.0821904, 0.0358608, 0.0209261, -0.32);
  kernel[5] =     vec4(0.0771802, 0.113491, 0.0793803, -0.08);
  kernel[6] =     vec4(0.0771802, 0.113491, 0.0793803, 0.08);
  kernel[7] =     vec4(0.0821904, 0.0358608, 0.0209261, 0.32);
  kernel[8] =     vec4(0.03639, 0.0130999, 0.00643685, 0.72);
  kernel[9] =     vec4(0.0192831, 0.00282018, 0.00084214, 1.28);
  kernel[10] =     vec4(0.00471691, 0.000184771, 5.07565e-005, 2.0);

  #define SSSS_N_SAMPLES 11

  float sssStrength = colorM.a;

  float radiansFovY = 0.78;
  float distanceToProjectionWindow = 1.0 / tan(0.5 * radiansFovY);
  float sssScale = distanceToProjectionWindow / float(SSSS_N_SAMPLES) * 0.5;

  float scale = sssScale / depthM;

  // Calculate the final step to fetch the surrounding pixels:
  vec2 finalStep = uSSSWidth * scale * uBlurDirection;
  // finalStep *= SSSS_STREGTH_SOURCE; // Modulate it using the alpha channel.
  finalStep *= 1.0 / 3.0; // Divide by 3 as the kernels range from -3 to 3.
  finalStep *= sssStrength;

  vec4 colorBlurred = colorM;
  colorBlurred.rgb *= kernel[0].rgb;

  #define SSSS_FOLLOW_SURFACE
  for (int i = 1; i < SSSS_N_SAMPLES; i++)
  {
    // Fetch color and depth for current sample:
    vec2 offset = vUv + kernel[i].a * finalStep;
    vec4 color = texture(uDiffuseTexture, offset);

    #ifdef SSSS_FOLLOW_SURFACE
      // If the difference in depth is huge, we lerp color back to "colorM":
      float depth = getZ(offset);
      float s = clamp(
        // 12000.0 / 400000.0 * distanceToProjectionWindow * uSSSWidth * abs(depthM - depth),
        distanceToProjectionWindow * uSSSWidth * abs(depthM - depth),
        0.0,
        1.0
      );
      color.rgb = mix(color.rgb, colorM.rgb, s);
    #endif

    // Accumulate:
    colorBlurred.rgb += kernel[i].rgb * color.rgb;
  }

  fragColor = vec4(colorBlurred.rgb, 1.0);
  // fragColor = vec4(vec3(depthM), 1.0);
}

`;
