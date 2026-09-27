import { expect, test } from 'bun:test';
import { join } from 'node:path';

test('a broken app module cannot prevent Router from loading or reject a background task', async () => {
  const child = Bun.spawn([process.execPath, join(import.meta.dir, 'helpers/boot-with-broken-app.ts')], { stdout: 'pipe', stderr: 'pipe' });
  const [output, errors, exit] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect(errors).toBe('');
  expect(exit).toBe(0);
  expect(output).toBe('boot and task error handled');
});
