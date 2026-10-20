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
  expect(host.textContent).toContain('1 invoices (demo)');
  expect(host.querySelector('a[href*="/pay/"]')).toBeNull();
  const receiptButton=Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='View simulated receipt')!;
  act(()=>receiptButton.click());
  expect(host.textContent).toContain('SIMULATED_NOT_VERIFIED');
  expect(host.textContent).toContain('No payment occurred');
  expect(host.textContent).toContain('Export simulated JSON');
  expect(host.textContent).toContain('Example amount: 0.20 USDC');
 } finally { act(()=>root.unmount()); }
});
