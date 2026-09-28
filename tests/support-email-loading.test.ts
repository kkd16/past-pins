import { expect, test } from 'bun:test';
import { join } from 'node:path';

test.each(['device', 'feature'])('support email module loading: %s', async (scenario) => {
  const child = Bun.spawn([
    process.execPath, '--preload', join(import.meta.dir, 'setup.ts'),
    join(import.meta.dir, 'helpers/support-email-loading.ts'), scenario,
  ], { stdout: 'pipe', stderr: 'pipe' });
  const [output, errors, exit] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect(errors).toBe('');
  expect(exit).toBe(0);
  expect(output).toBe('passed');
});
