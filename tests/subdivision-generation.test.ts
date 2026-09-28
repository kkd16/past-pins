import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import source from '../scripts/data/subdivisions-source.json';
import type { SubdivisionSourceData } from '../scripts/subdivision-data';

const project = join(import.meta.dir, '..');

test('subdivision generation downloads, reuses, and refreshes its cache without publishing invalid data', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'past-pins-subdivision-generation-'));
  try {
    await mkdir(join(directory, 'scripts/data'), { recursive: true });
    await mkdir(join(directory, 'src/subdivisions'), { recursive: true });
    const cacheDirectory = join(directory, 'cache');
    await mkdir(cacheDirectory);
    await Promise.all([
      cp(join(project, 'scripts/generate-subdivisions.ts'), join(directory, 'scripts/generate-subdivisions.ts')),
      symlink(join(project, 'scripts/subdivision-data.ts'), join(directory, 'scripts/subdivision-data.ts')),
      symlink(join(project, 'src/countries'), join(directory, 'src/countries')),
      symlink(join(project, 'node_modules'), join(directory, 'node_modules')),
    ]);
    const snapshot = await Bun.file(join(project, 'scripts/data/cities/subdivisions.geojson.gz')).bytes();
    const upstream = JSON.parse(new TextDecoder().decode(Bun.gunzipSync(snapshot))) as SubdivisionSourceData;
    const region = upstream.features.find(({ properties }) => properties.iso_a2 === 'CA')!;
    const fixture = JSON.stringify({ type: 'FeatureCollection', features: [region] });
    const sha256 = createHash('sha256').update(fixture).digest('hex');
    await Bun.write(join(directory, 'scripts/data/subdivisions-source.json'), JSON.stringify({ ...source, sha256 }));
    await Bun.write(join(directory, 'source.json'), fixture);
    const preload = join(directory, 'fetch.ts');
    await Bun.write(preload, `
      globalThis.fetch = async () => {
        if (process.env.DISALLOW_DOWNLOAD) throw new Error('Unexpected download.');
        return new Response(await Bun.file(new URL('./source.json', import.meta.url)).bytes(), {
          status: Number(process.env.DOWNLOAD_STATUS),
        });
      };
    `);
    const run = async ({ offline = false, refresh = false, status = 200 } = {}) => {
      const child = Bun.spawn([process.execPath, '--preload', preload, join(directory, 'scripts/generate-subdivisions.ts'), ...(refresh ? ['--refresh'] : [])], {
        env: { ...process.env, TMPDIR: cacheDirectory, DISALLOW_DOWNLOAD: offline ? '1' : '', DOWNLOAD_STATUS: String(status) },
        stdout: 'pipe', stderr: 'pipe',
      });
      const [output, errors, exit] = await Promise.all([
        new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
      ]);
      return { output, errors, exit };
    };

    const cold = await run();
    expect(cold.errors).toBe('');
    expect(cold.exit).toBe(0);
    expect(cold.output).toContain('Downloading');
    const readOutputs = () => Promise.all(
      ['catalog.json', 'maps.json', 'manifest.json'].map((name) => Bun.file(join(directory, 'src/subdivisions', name)).text()),
    );
    const outputs = await readOutputs();
    expect(JSON.parse(outputs[0]).regions).toHaveLength(1);
    const cached = await run({ offline: true });
    expect(cached.errors).toBe('');
    expect(cached.exit).toBe(0);
    expect(cached.output).not.toContain('Downloading');
    expect(await readOutputs()).toEqual(outputs);

    const cachePath = join(cacheDirectory, `pastpins-natural-earth-${sha256}.geojson`);
    await Bun.write(cachePath, '{}');
    const corrupt = await run({ offline: true });
    expect(corrupt.exit).not.toBe(0);
    expect(corrupt.errors).toContain('Cached subdivision checksum mismatch');
    expect(await readOutputs()).toEqual(outputs);

    const refreshed = await run({ refresh: true });
    expect(refreshed.errors).toBe('');
    expect(refreshed.exit).toBe(0);
    expect(refreshed.output).toContain('Downloading');
    expect(await Bun.file(cachePath).text()).toBe(fixture);
    expect(await readOutputs()).toEqual(outputs);

    await Bun.write(join(directory, 'source.json'), '{}');
    for (const [status, message] of [
      [200, 'Upstream subdivision checksum mismatch'],
      [503, 'Source download failed: HTTP 503'],
    ] as const) {
      const failed = await run({ refresh: true, status });
      expect(failed.exit).not.toBe(0);
      expect(failed.errors).toContain(message);
      expect(await Bun.file(cachePath).text()).toBe(fixture);
      expect(await readOutputs()).toEqual(outputs);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
