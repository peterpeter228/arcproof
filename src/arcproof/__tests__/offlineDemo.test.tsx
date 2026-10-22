// @vitest-environment jsdom
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {it,expect,vi} from 'vitest';
vi.mock('connectkit',()=>({ConnectKitButton:()=>null}));
import {DashboardScreen} from '../../components/arcproof/DashboardScreen';
it('creates a clearly marked offline fixture without a connected wallet or signing',()=>{
 (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT=true;
 const host=document.createElement('div'); const root=createRoot(host);
 try {
  act(()=>root.render(<DashboardScreen/>));
  const button=Array.from(host.querySelectorAll('button')).find(b=>b.textContent?.includes('Create invoice'))!;
  expect(button.disabled).toBe(false);
  expect(host.textContent).toContain('No wallet is needed');
  act(()=>button.click());
  expect(host.textContent).toContain('Nonce 0');
  expect(host.textContent).toContain(' 1 invoice (demo)');
  expect(host.querySelector('a[href*="/pay/"]')).toBeNull();
  const receiptButton=Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='View simulated receipt')!;
  act(()=>receiptButton.click());
  expect(host.textContent).toContain('SIMULATED_NOT_VERIFIED');
  expect(host.textContent).toContain('No payment occurred');
  expect(host.textContent).toContain('Export simulated JSON');
  expect(host.textContent).toContain('Example amount: 0.20 test USDC');
  expect(host.textContent).toMatch(/Expires: \d{4}-\d{2}-\d{2}T[^ ]+Z \(UTC\)/);
 } finally { act(()=>root.unmount()); }
});

it('opens the simulated receipt for the invoice just created, with no payment facts',()=>{
 (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT=true;
 const host=document.createElement('div'); const root=createRoot(host);
 try {
  act(()=>root.render(<DashboardScreen/>));
  const amount=host.querySelector<HTMLInputElement>('#invoice-amount')!;
  expect(amount.getAttribute('aria-describedby')).toBe('invoice-amount-units');
  act(()=>Array.from(host.querySelectorAll('button')).find(b=>b.textContent?.includes('Create invoice'))!.click());
  const receipt=host.querySelector('[aria-label="Simulated receipt"]')!;
  const listed=Array.from(host.querySelectorAll('p.font-mono')).map(p=>p.textContent??'').find(t=>/^0x[0-9a-f]{64}$/.test(t))!;
  expect(listed).toMatch(/^0x[0-9a-f]{64}$/);
  expect(receipt.textContent).toContain(`Invoice fixture: ${listed}`);
  expect(receipt.textContent).toContain('SIMULATED_NOT_VERIFIED');
  expect(receipt.textContent).toContain('None — no payment happens in the demo');
  expect(receipt.textContent?.match(/Not run \(simulation\)/g)).toHaveLength(5);
  // The only 32-byte value shown is the derived invoice ID: no transaction hash is invented.
  expect(receipt.textContent?.match(/0x[0-9a-f]{64}/gi)).toEqual([listed]);
 } finally { act(()=>root.unmount()); }
});
