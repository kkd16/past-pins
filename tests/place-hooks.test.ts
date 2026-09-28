import { expect, test } from 'bun:test';
import { join } from 'node:path';

test.each([
  'cold-list', 'stale-query', 'stale-page', 'stale-suggestions', 'suggestion-failure', 'pagination',
  'reset-list', 'reset-search', 'reset-page', 'retry-list', 'retry-search', 'catalog-retry',
  'missing-row', 'region-filters', 'route-context',
  'catalog-recovery',
  'replace-list', 'replace-search',
])('asynchronous place hooks: %s', async (scenario) => {
  const child = Bun.spawn([
    process.execPath, '--preload', join(import.meta.dir, 'setup.ts'),
    join(import.meta.dir, 'helpers/place-hooks.tsx'), scenario,
  ], { stdout: 'pipe', stderr: 'pipe' });
  const [output, errors, exit] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect(errors).toBe('');
  expect(exit).toBe(0);
  expect(output).toBe('passed');
});
