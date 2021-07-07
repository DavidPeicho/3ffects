export default `

attribute vec3 position;
attribute vec2 uv;

varying vec2 vUv;

uniform mat4 projectionMatrix;

void main()
{
  vUv = uv;
  gl_Position = projectionMatrix * vec4(position, 1.0);
}

`;
