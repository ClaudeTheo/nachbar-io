import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public/sw.js local development safety', () => {
  const source = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf8');

  it('erkennt lokale Entwicklungs-Hosts', () => {
    expect(source).toContain('function isLocalDevelopmentUrl');
    expect(source).toContain('"localhost"');
    expect(source).toContain('"127.0.0.1"');
  });

  it('entfernt lokale Service-Worker-Caches statt Next-Dev-Bundles zu cachen', () => {
    expect(source).toContain('self.registration.unregister()');
    expect(source).toContain('return !isLocalDevelopmentUrl(event.request.url)');
  });
});
