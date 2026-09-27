import { expect, test } from 'bun:test';
import { join } from 'node:path';

test('stamp outlines and map navigation do not load GPU geometry', async () => {
  const result = await Bun.build({
    entrypoints: ['stamps/outline.ts', 'atlas/geography.ts', 'globe/picking.ts']
      .map((path) => join(import.meta.dir, '../src', path)),
    target: 'bun',
    metafile: true,
  });
  expect(result.success).toBe(true);
  const inputs = Object.keys(result.metafile!.inputs);
  expect(inputs.some((path) => path.endsWith('atlas/metadata.json'))).toBe(true);
  expect(inputs.some((path) => path.endsWith('globe/world.json'))).toBe(false);
});

test('globe geometry loads only for a live GL context', async () => {
  const child = Bun.spawn([
    process.execPath, '--preload', join(import.meta.dir, 'setup.ts'),
    join(import.meta.dir, 'helpers/globe-lazy-geometry.tsx'),
  ], { stdout: 'pipe', stderr: 'pipe' });
  const [output, errors, exit] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect(errors).toBe('');
  expect(exit).toBe(0);
  expect(output).toBe('passed');
});
