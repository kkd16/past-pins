import { expect, test } from 'bun:test';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import source from '../scripts/data/cities-source.json';

const project = join(import.meta.dir, '..');

test.each(['download', 'validation'])('failed city refresh preserves source snapshots and outputs: %s', async (failure) => {
  const directory = await mkdtemp(join(tmpdir(), 'past-pins-city-refresh-'));
  try {
    await mkdir(join(directory, 'scripts/data'), { recursive: true });
    await mkdir(join(directory, 'src/cities'), { recursive: true });
    await Promise.all([
      cp(join(project, 'scripts/generate-cities.ts'), join(directory, 'scripts/generate-cities.ts')),
      cp(join(project, 'scripts/data/subdivisions-source.json'), join(directory, 'scripts/data/subdivisions-source.json')),
      cp(join(project, 'scripts/data/cities'), join(directory, 'scripts/data/cities'), { recursive: true }),
      symlink(join(project, 'scripts/city-data.ts'), join(directory, 'scripts/city-data.ts')),
      symlink(join(project, 'scripts/subdivision-data.ts'), join(directory, 'scripts/subdivision-data.ts')),
      symlink(join(project, 'src/countries'), join(directory, 'src/countries')),
      symlink(join(project, 'node_modules'), join(directory, 'node_modules')),
    ]);
    const snapshots = source.snapshots.map((snapshot) => ({ ...snapshot, zipEntry: null }));
    const metadata = JSON.stringify({ ...source, snapshots });
    const sourceFile = join(directory, 'scripts/data/cities-source.json');
    await Bun.write(sourceFile, metadata);
    const preload = join(directory, 'fetch.ts');
    await Bun.write(preload, `
      const snapshots = ${JSON.stringify(snapshots)};
      globalThis.fetch = async (url) => {
        const snapshot = snapshots.find((entry) => entry.url === String(url));
        if (!snapshot) throw new Error('Unexpected source URL.');
        if (snapshot === snapshots[0]) return new Response('invalid city source');
        if (${JSON.stringify(failure)} === 'download') return new Response(null, { status: 503 });
        const bytes = await Bun.file(new URL('./scripts/data/cities/' + snapshot.file, import.meta.url)).bytes();
        return new Response(Bun.gunzipSync(bytes));
      };
    `);
    const child = Bun.spawn([
      process.execPath, '--preload', preload, join(directory, 'scripts/generate-cities.ts'), '--refresh',
    ], { stdout: 'pipe', stderr: 'pipe' });
    const [output, errors, exit] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    expect(exit).not.toBe(0);
    expect(errors).toContain(failure === 'download' ? 'City source download failed: HTTP 503' : 'Invalid GeoNames city columns');
    expect(output).toBe('');
    expect(await readFile(sourceFile, 'utf8')).toBe(metadata);
    for (const snapshot of snapshots) {
      expect(await Bun.file(join(directory, 'scripts/data/cities', snapshot.file)).bytes()).toEqual(
        await Bun.file(join(project, 'scripts/data/cities', snapshot.file)).bytes(),
      );
    }
    expect(await readdir(join(directory, 'src/cities'))).toEqual([]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
