// Actual main.tsx bootstrap with synthetic injected provider/network; no real wallet.
import { expect, it, vi } from 'vitest';
it('actual read-only bootstrap does not dispatch wallet RPC or business fetch', async () => {
 const walletCalls: unknown[]=[]; const fetchCalls: unknown[]=[];
 Object.defineProperty(window,'matchMedia',{value:()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}),configurable:true});
 Object.defineProperty(window,'ethereum',{value:{isMetaMask:true,on(){},removeListener(){},request:async(request:unknown)=>{walletCalls.push(request);return []}},configurable:true});
 vi.stubGlobal('fetch',async(...args:unknown[])=>{fetchCalls.push(args);throw Error('OFFLINE_FETCH_FORBIDDEN')});
 localStorage.setItem('wagmi.injected.connected', 'true');
 localStorage.setItem('wagmi.recentConnectorId', JSON.stringify('injected'));
 localStorage.setItem('wagmi.store',JSON.stringify({state:{connections:{__type:'Map',value:[]},chainId:5042002,current:null},version:2}));
 document.body.innerHTML='<div id="root"></div>';
 window.history.replaceState(null,'','#/verify');
 await import('../../../src/main');
 await new Promise(resolve=>setTimeout(resolve,500));
 expect(document.body.textContent).toContain('Verify a testnet receipt');
 expect(walletCalls).toEqual([]);expect(fetchCalls).toEqual([]);
 console.log(JSON.stringify({walletCalls,fetchCalls,scope:'actual main.tsx + installed providers + synthetic injected provider, jsdom; 500ms bootstrap observation, not real wallet/browser'}));
 // Positive control: explicitly requesting reconnect through the real library must hit this synthetic provider.
 const { reconnect } = await import('@wagmi/core');
 const { config } = await import('../../../src/config');
 await reconnect(config);
 expect(walletCalls.length).toBeGreaterThan(0);
 expect(walletCalls).toContainEqual({method:'eth_accounts'});
 vi.unstubAllGlobals();
});
