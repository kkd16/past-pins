import { expect, test } from 'bun:test';
import { join } from 'node:path';

test('choice controls preserve native selection and accessible large-text and RTL choices', async () => {
  const child = Bun.spawn([
    process.execPath, '--preload', join(import.meta.dir, 'setup.ts'),
    join(import.meta.dir, 'helpers/choice-control.tsx'),
  ], { stdout: 'pipe', stderr: 'pipe' });
  const [output, errors, exit] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  expect(errors).toBe('');
  expect(exit).toBe(0);
  expect(output).toBe('passed');
});
