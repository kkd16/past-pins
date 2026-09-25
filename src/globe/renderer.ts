import type { ExpoWebGLRenderingContext } from 'expo-gl';
import { mat3 } from 'gl-matrix';

import { countryColor } from '../atlas/colors';
import type { AppData } from '../data/model';
import { theme } from '../theme';
import type { GlobeCamera } from './camera';
import {
  oceanFragment,
  oceanVertex,
  surfaceFragment,
  surfaceVertex,
} from './shaders';
import world from './world.json';

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map(
    (start) => parseInt(hex.slice(start, start + 2), 16) / 255,
  ) as [number, number, number];
}

export function createGlobeRenderer(gl: ExpoWebGLRenderingContext) {
  const buffers: WebGLBuffer[] = [];
  const programs: WebGLProgram[] = [];
  const shaders: WebGLShader[] = [];
  const dispose = () => {
    buffers.forEach((buffer) => gl.deleteBuffer(buffer));
    programs.forEach((program) => gl.deleteProgram(program));
    shaders.forEach((shader) => gl.deleteShader(shader));
  };

  function program(vertex: string, fragment: string) {
    const result = gl.createProgram();
    if (!result) throw new Error('Could not create globe program.');
    programs.push(result);
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertex],
      [gl.FRAGMENT_SHADER, fragment],
    ] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Could not create globe shader.');
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(shader) ?? 'Globe shader failed.');
      gl.attachShader(result, shader);
    }
    gl.linkProgram(result);
    if (!gl.getProgramParameter(result, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(result) ?? 'Globe program failed.');
    return result;
  }

  function buffer(
    data: Float32Array | Uint32Array,
    target: number = gl.ARRAY_BUFFER,
    usage: number = gl.STATIC_DRAW,
  ) {
    const result = gl.createBuffer();
    if (!result) throw new Error('Could not create globe buffer.');
    buffers.push(result);
    gl.bindBuffer(target, result);
    gl.bufferData(target, data, usage);
    return result;
  }

  function attribute(location: number, buffer: WebGLBuffer, size: number) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  }

  try {
    const ocean = program(oceanVertex, oceanFragment);
    const surface = program(surfaceVertex, surfaceFragment);
    const quad = buffer(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
    const land = buffer(new Float32Array(world.positions));
    const indices = buffer(
      new Uint32Array(world.indices),
      gl.ELEMENT_ARRAY_BUFFER,
    );
    const borders = buffer(new Float32Array(world.borders));
    const points = buffer(
      new Float32Array(world.markers.flatMap(({ position }) => position)),
    );
    const colors = new Float32Array(world.positions.length);
    const landColors = buffer(colors, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW);
    const markerColors = new Float32Array(world.markers.length * 3);
    const pointColors = buffer(markerColors, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW);
    const surfaceUniform = {
      rotation: gl.getUniformLocation(surface, 'rotation'),
      scale: gl.getUniformLocation(surface, 'scale'),
      marker: gl.getUniformLocation(surface, 'marker'),
      pointSize: gl.getUniformLocation(surface, 'pointSize'),
      shaded: gl.getUniformLocation(surface, 'shaded'),
    };
    const oceanScale = gl.getUniformLocation(ocean, 'scale');
    const oceanColor = gl.getUniformLocation(ocean, 'color');
    const quadPosition = gl.getAttribLocation(ocean, 'position');
    const surfacePosition = gl.getAttribLocation(surface, 'position');
    const surfaceColor = gl.getAttribLocation(surface, 'color');
    const background = rgb(theme.color.background);
    const rotation = mat3.create();
    const appearance = theme.globe;
    const water = rgb(appearance.ocean);
    const border = rgb(appearance.border);

    for (const target of [ocean, surface]) {
      gl.useProgram(target);
      gl.uniform3f(
        gl.getUniformLocation(target, 'lightDirection'),
        ...appearance.lightDirection,
      );
      for (const name of ['ambient', 'diffuse'] as const)
        gl.uniform1f(gl.getUniformLocation(target, name), appearance[name]);
    }

    if (gl.getError() !== gl.NO_ERROR)
      throw new Error('Could not upload globe geometry.');

    return {
      dispose,
      setColors(places: AppData['places'], selectedId: string | null) {
        const color = (id: string) =>
          rgb(countryColor(places[id], selectedId === id));
        for (const { id, firstVertex, vertexCount } of world.countries) {
          const tint = color(id);
          for (let i = firstVertex; i < firstVertex + vertexCount; i++)
            colors.set(tint, i * 3);
        }
        world.markers.forEach(({ id }, i) =>
          markerColors.set(color(id), i * 3),
        );
        gl.bindBuffer(gl.ARRAY_BUFFER, landColors);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, colors);
        gl.bindBuffer(gl.ARRAY_BUFFER, pointColors);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, markerColors);
      },
      draw(camera: GlobeCamera) {
        if (!camera.radius) return;
        const sx = (2 * camera.radius) / camera.width;
        const sy = (2 * camera.radius) / camera.height;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(...background, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.useProgram(ocean);
        gl.uniform2f(oceanScale, sx, sy);
        gl.uniform3f(oceanColor, ...water);
        attribute(quadPosition, quad, 2);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.disableVertexAttribArray(quadPosition);

        gl.useProgram(surface);
        gl.uniformMatrix3fv(
          surfaceUniform.rotation,
          false,
          camera.matrix(rotation) as Float32Array,
        );
        gl.uniform2f(surfaceUniform.scale, sx, sy);
        gl.uniform1i(surfaceUniform.marker, 0);
        gl.uniform1i(surfaceUniform.shaded, 1);
        gl.uniform1f(
          surfaceUniform.pointSize,
          (appearance.markerSize * gl.drawingBufferWidth) / camera.width,
        );
        attribute(surfacePosition, land, 3);
        attribute(surfaceColor, landColors, 3);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
        gl.drawElements(gl.TRIANGLES, world.indices.length, gl.UNSIGNED_INT, 0);

        // Lines are on the sphere, above the triangulated land chords.
        gl.disable(gl.DEPTH_TEST);
        gl.uniform1i(surfaceUniform.shaded, 0);
        attribute(surfacePosition, borders, 3);
        gl.disableVertexAttribArray(surfaceColor);
        gl.vertexAttrib3f(surfaceColor, ...border);
        gl.drawArrays(gl.LINES, 0, world.borders.length / 3);
        gl.uniform1i(surfaceUniform.marker, 1);
        attribute(surfacePosition, points, 3);
        attribute(surfaceColor, pointColors, 3);
        gl.drawArrays(gl.POINTS, 0, world.markers.length);
        gl.disableVertexAttribArray(surfacePosition);
        gl.disableVertexAttribArray(surfaceColor);
        gl.endFrameEXP();
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}

export type GlobeRenderer = ReturnType<typeof createGlobeRenderer>;
