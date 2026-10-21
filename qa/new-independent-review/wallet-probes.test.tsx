import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import type { Address } from 'viem';
import type { Session, WalletRequest } from '../../src/arcproof/testnetClient';
type Listener = (...args: unknown[]) => void;
interface MockProvider extends WalletRequest { on: ReturnType<typeof vi.fn>; removeListener: ReturnType<typeof vi.fn> }
interface MockAccount { isConnected: boolean; status: string; address: Address; chainId: number; connector?: { uid: string; getProvider: () => Promise<Pick<MockProvider, 'on' | 'removeListener'> | MockProvider> } }
const state=vi.hoisted(()=>({account:undefined as MockAccount | undefined,watch:undefined as ((account: MockAccount) => void) | undefined,stop:vi.fn(),config:{id:'offline-mock'}}));
vi.mock('wagmi',()=>({useConfig:()=>state.config}));
vi.mock('@wagmi/core',()=>({getAccount:()=>state.account,watchAccount:(_config:unknown,{onChange}:{onChange:(account:MockAccount)=>void})=>{state.watch=onChange;return state.stop;}}));
import {useTestnetWallet} from '../../src/arcproof/useTestnetWallet';
let root:Root,host:HTMLDivElement,current:ReturnType<typeof useTestnetWallet>,listeners:Map<string,Listener>,provider:MockProvider,n=0;
function accountState(): MockAccount { if (!state.account) throw new Error('Mock account not initialized'); return state.account; }
function Component(){const wallet=useTestnetWallet();React.useLayoutEffect(()=>{current=wallet;});return <div>{wallet.sessionKey}</div>;}
function deferred<T>(){let resolve!:(v:T)=>void;const promise=new Promise<T>(r=>resolve=r);return {promise,resolve};}
async function mount(){await act(async()=>root.render(<Component/>));}
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('fetch',vi.fn(async()=>{throw new Error('Offline probe forbids network');}));listeners=new Map();provider={request:vi.fn(),on:vi.fn((name:string,fn:Listener)=>listeners.set(name,fn)),removeListener:vi.fn((name:string,fn:Listener)=>{if(listeners.get(name)===fn)listeners.delete(name);})};state.stop.mockReset();state.account={isConnected:true,status:'connected',address:'0x1111111111111111111111111111111111111111',chainId:5042002,connector:{uid:'mock-'+(++n),getProvider:vi.fn(async()=>provider)}};host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(()=>{act(()=>root.unmount());host.remove();vi.unstubAllGlobals();});
describe('Direct wallet hook invalidation; mocked connector and EIP-1193 events',()=>{
 it.each(['accountsChanged','chainChanged','disconnect'])('%s synchronously invalidates before React rendering and advances version',async(event)=>{await mount();const old=current.session!;expect(listeners.has(event)).toBe(true);let synchronous:Session|null|'unset'='unset';await act(async()=>{listeners.get(event)!();synchronous=current.getSession();});expect(synchronous).toBeNull();expect(current.session?.connectionVersion).toBeGreaterThan(old.connectionVersion);});
 it('getSession detects external account changes even before watcher notification',async()=>{await mount();state.account={...accountState(),address:'0x2222222222222222222222222222222222222222'};expect(current.getSession()).toBeNull();});
 it('getSession detects external chain changes even before watcher notification',async()=>{await mount();state.account={...accountState(),chainId:5042};expect(current.getSession()).toBeNull();});
 it('watchAccount replacement detaches original provider listeners',async()=>{await mount();const previous=provider;state.account={...accountState(),connector:undefined};await act(async()=>state.watch!(state.account!));expect(previous.removeListener).toHaveBeenCalledTimes(3);expect(listeners.size).toBe(0);});
 it('late provider promise from superseded connector cannot attach stale listeners',async()=>{const wait=deferred<Pick<MockProvider,'on'|'removeListener'>>();const oldProvider={on:vi.fn(),removeListener:vi.fn()};state.account!.connector!.getProvider=()=>wait.promise;await mount();state.account={...accountState(),connector:{uid:'new-'+n,getProvider:async()=>provider}};await act(async()=>state.watch!(state.account!));await act(async()=>wait.resolve(oldProvider));expect(oldProvider.on).not.toHaveBeenCalled();expect(provider.on).toHaveBeenCalledTimes(3);});
 it('provider-read failure does not request wallet access or invent a provider',async()=>{state.account!.connector!.getProvider=vi.fn(async()=>{throw new Error('offline denial');});await mount();expect(provider.request).not.toHaveBeenCalled();await expect(current.getProvider()).rejects.toThrow('offline denial');expect(provider.request).not.toHaveBeenCalled();});
});
