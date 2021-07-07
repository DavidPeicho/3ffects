export default `

precision highp float;
precision highp sampler2D;

varying vec2 vUv;

uniform sampler2D uDiffuseTexture;

void main() {
	gl_FragColor = vec4(texture2D(uDiffuseTexture, vUv).rgb * 0.5, 1.0);
}

`;
