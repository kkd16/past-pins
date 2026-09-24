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
void main() {
  if (surface.z <= 0.0) discard;
  if (marker && distance(gl_PointCoord, vec2(0.5)) > 0.5) discard;
  float light = 0.72 + 0.28 * max(0.0, dot(normalize(surface), normalize(vec3(-0.35, 0.45, 1.0))));
  gl_FragColor = vec4(tint * light, 1.0);
}`;

export const oceanVertex = `
attribute vec2 position;
uniform vec2 scale;
varying vec2 point;
void main() {
  point = position;
  gl_Position = vec4(position * scale, 0.9, 1.0);
}`;

export const oceanFragment = `
precision highp float;
varying vec2 point;
uniform vec3 color;
void main() {
  float squared = dot(point, point);
  if (squared > 1.0) discard;
  vec3 normal = vec3(point, sqrt(1.0 - squared));
  float light = 0.72 + 0.28 * max(0.0, dot(normal, normalize(vec3(-0.35, 0.45, 1.0))));
  gl_FragColor = vec4(color * light, 1.0);
}`;
