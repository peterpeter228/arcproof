import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('wallet bootstrap safety wiring (static source guard)', () => {
  it('explicitly disables the provider default reconnect while retaining manual connect provider', () => {
    const source = readFileSync(new URL('../../main.tsx', import.meta.url), 'utf8');
    expect(source).toMatch(/<WagmiProvider\s+config=\{config\}\s+reconnectOnMount=\{false\}>/);
    expect(source).toContain('<ConnectKitProvider>');
  });
});
