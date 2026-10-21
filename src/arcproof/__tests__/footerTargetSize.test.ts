import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const styles = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

it('gives footer links a 44px minimum actionable target (source guard; browser measured separately)', () => {
  const footerRule = styles.match(/\.app-footer a\s*\{([^}]+)\}/)?.[1];
  expect(footerRule).toContain('min-height: 2.75rem');
  expect(footerRule).toContain('display: inline-flex');
  expect(footerRule).toContain('align-items: center');
});
