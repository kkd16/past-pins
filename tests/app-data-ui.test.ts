import { expect, test } from 'bun:test';
import { join } from 'node:path';

test.each([
  'subscriptions', 'load recovery',
  'selection change', 'screen blur', 'unmount', 'confirmed',
  'details:selection change', 'details:confirmed',
])(
  'real app data UI: %s',
  async (scenario) => {
    const child = Bun.spawn([
      process.execPath, '--preload', join(import.meta.dir, 'setup.ts'),
      join(import.meta.dir, 'helpers/app-data-ui.tsx'), scenario,
    ], { stdout: 'pipe', stderr: 'pipe' });
    const [output, errors, exit] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    expect(errors).toBe('');
    expect(exit).toBe(0);
    expect(output).toBe('passed');
  },
);
