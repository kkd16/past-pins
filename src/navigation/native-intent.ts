export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  if (path.length > 4096) return '/';
  try {
    let current = path;
    while (true) {
      decodeURIComponent(current);
      const url = new URL(current, 'past-pins:///');
      for (const [key, value] of url.searchParams) {
        for (const component of [key, value]) {
          let decoded = component;
          for (let remaining = 2; remaining > 0 && /%[0-9a-f]{2}/i.test(decoded); remaining--) {
            decoded = decodeURIComponent(decoded);
          }
        }
      }
      const nested = url.hostname === 'expo-development-client' ? url.searchParams.get('url') : null;
      if (!nested) return path;
      current = decodeURI(nested);
    }
  } catch {
    return '/';
  }
}
