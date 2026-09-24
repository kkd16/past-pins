const lighting = `
uniform vec3 lightDirection;
uniform float ambient;
uniform float diffuse;
vec3 shade(vec3 color, vec3 normal) {
  float light = ambient + diffuse * max(0.0, dot(normal, normalize(lightDirection)));
  return color * light;
}`;

export const surfaceVertex = `
attribute vec3 position;
attribute vec3 color;
uniform mat3 rotation;
uniform vec2 scale;
uniform float pointSize;
varying vec3 surface;
varying vec3 tint;
void main() {
  surface = rotation * position;
  tint = color;
  gl_Position = vec4(surface.xy * scale, -surface.z * 0.5, 1.0);
  gl_PointSize = pointSize;
}`;

export const surfaceFragment = `
precision highp float;
varying vec3 surface;
varying vec3 tint;
uniform bool marker;
uniform bool shaded;
${lighting}
void main() {
  if (surface.z <= 0.0) discard;
  if (marker && distance(gl_PointCoord, vec2(0.5)) > 0.5) discard;
  gl_FragColor = vec4(shaded ? shade(tint, normalize(surface)) : tint, 1.0);
}`;

export const oceanVertex = `
attribute vec2 position;
uniform vec2 scale;
varying vec2 point;
void main() {
  point = position;
  gl_Position = vec4(point * scale, 0.9, 1.0);
}`;

export const oceanFragment = `
precision highp float;
varying vec2 point;
uniform vec3 color;
${lighting}
void main() {
  float squared = dot(point, point);
  if (squared > 1.0) discard;
  vec3 normal = vec3(point, sqrt(max(0.0, 1.0 - squared)));
  gl_FragColor = vec4(shade(color, normal), 1.0);
}`;
