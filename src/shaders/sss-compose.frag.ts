export default `

precision highp float;
precision highp sampler2D;

in vec2 vUv;

layout(location = 0) out vec4 fragColor;

uniform sampler2D uDiffuseTexture;

void main() {
  fragColor = vec4(texture(uDiffuseTexture, vUv).rgb, 1.0);
}

`;
