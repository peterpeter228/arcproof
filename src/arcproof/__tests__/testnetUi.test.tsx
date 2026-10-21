// @vitest-environment jsdom
/* eslint-disable typescript/require-await -- Promise-returning offline UI mocks. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Hex } from 'viem';
import { ARC_TESTNET, TESTNET_DEPLOYMENT, ZERO_TERMS } from '../testnet';
import type { Session, PreparedAction, LoadedInvoice } from '../testnetClient';
import { recordSubmission, getSubmissions, updateSubmission } from '../submissions';
const mocks=vi.hoisted(()=>({session:null as Session|null,key:'none',prepare:vi.fn(),preparePay:vi.fn(),load:vi.fn(),send:vi.fn(),provider:vi.fn(),wait:vi.fn(),verify:vi.fn(),confirmCreated:vi.fn(),confirmOutcome:vi.fn()}));
vi.mock('../useTestnetWallet',()=>({useTestnetWallet:()=>({session:mocks.session,sessionKey:mocks.key,getSession:()=>mocks.session,getProvider:mocks.provider})}));
vi.mock('connectkit',()=>({ConnectKitButton:()=> <button>Connect wallet</button>}));
vi.mock('../testnetClient',async()=>{const original=await vi.importActual<typeof import('../testnetClient')>('../testnetClient');return {...original,prepareCreate:mocks.prepare,preparePay:mocks.preparePay,loadInvoice:mocks.load,sendPreparedAction:mocks.send,verifyTestnetReceipt:mocks.verify,confirmCreatedInvoice:mocks.confirmCreated,confirmSubmittedOutcome:mocks.confirmOutcome,testnetClient:{waitForTransactionReceipt:mocks.wait}};});
import { testnetClient } from '../testnetClient';
import { TestnetDashboard, TestnetPayScreen, TestnetReceiptScreen } from '../../components/arcproof/TestnetScreens';
const session:Session={account:'0x8888888888888888888888888888888888888888',chainId:ARC_TESTNET.id,connectionVersion:1};
const id:Hex=`0x${'a'.repeat(64)}`, hash:Hex=`0x${'b'.repeat(64)}`;
const invoice:LoadedInvoice={invoiceId:id,merchant:'0x7777777777777777777777777777777777777777',amountNative:200000000000000000n,expiresAt:2000000000n,termsHash:ZERO_TERMS,paid:false,payer:'0x0000000000000000000000000000000000000000',paidAt:0n,paidBlockNumber:0n};
const action:PreparedAction={kind:'create',session,deployment:TESTNET_DEPLOYMENT,to:TESTNET_DEPLOYMENT.contractAddress,data:'0x',value:0n,gas:100n,gasPrice:1n,feeEstimate:100n,preparedAt:Date.now(),amountNative:invoice.amountNative,expiresAt:invoice.expiresAt};
let host:HTMLDivElement,root:Root;
const text=()=>host.textContent??'';
const button=(label:string)=>Array.from(host.querySelectorAll('button')).find(x=>x.textContent?.includes(label))!;
async function render(node:React.ReactNode){await act(async()=>{root.render(node);});}
async function click(label:string){await act(async()=>{button(label).click();});}
function deferred<T>(){let resolve!:(x:T)=>void;const promise=new Promise<T>(r=>{resolve=r;});return{promise,resolve};}
beforeEach(()=>{(globalThis as typeof globalThis &{IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;vi.clearAllMocks();mocks.session=null;mocks.key='none';mocks.prepare.mockResolvedValue(action);mocks.load.mockResolvedValue(invoice);mocks.provider.mockResolvedValue({request:vi.fn()});mocks.send.mockResolvedValue(hash);mocks.confirmCreated.mockReset().mockResolvedValue(invoice);mocks.confirmOutcome.mockReset().mockResolvedValue(undefined);mocks.wait.mockRejectedValue(Error('read-only receipt wait timed out'));getSubmissions().forEach(x=>updateSubmission(x.hash,'reverted'));host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);});
afterEach(()=>{act(()=>root.unmount());host.remove();vi.restoreAllMocks();});
describe('New-candidate rendered controls with mocked wallet/RPC, not real browser acceptance',()=>{
 it('does not enable creation or invoke a wallet while disconnected',async()=>{await render(<TestnetDashboard/>);expect(button('Review invoice').disabled).toBe(true);expect(mocks.prepare).not.toHaveBeenCalled();expect(mocks.provider).not.toHaveBeenCalled();});
 it('keeps mainnet controls disabled',async()=>{mocks.session={...session,chainId:1};mocks.key='mainnet';await render(<TestnetDashboard/>);expect(button('Review invoice').disabled).toBe(true);expect(text()).toContain('Switch to Arc Testnet');});
 it('shows review without opening the wallet',async()=>{mocks.session=session;mocks.key='testnet';await render(<TestnetDashboard/>);await click('Review invoice');expect(text()).toContain('Review invoice creation');expect(text()).toContain('Transaction value: 0 test USDC');expect(mocks.provider).not.toHaveBeenCalled();});
 it('cancels review without submitting',async()=>{mocks.session=session;mocks.key='testnet';await render(<TestnetDashboard/>);await click('Review invoice');await click('Cancel review');expect(button('Open wallet')).toBeUndefined();expect(mocks.send).not.toHaveBeenCalled();});
 it('invalidates an existing review after wallet session change',async()=>{mocks.session=session;mocks.key='testnet';await render(<TestnetDashboard/>);await click('Review invoice');mocks.session={...session,connectionVersion:2};mocks.key='changed';await render(<TestnetDashboard/>);expect(button('Open wallet')).toBeUndefined();expect(mocks.send).not.toHaveBeenCalled();});
 it('allows only one send on repeated confirmation clicks',async()=>{const pending=deferred<Hex>();mocks.send.mockReturnValue(pending.promise);mocks.session=session;mocks.key='testnet';await render(<TestnetDashboard/>);await click('Review invoice');await act(async()=>{const confirm=button('Open wallet');confirm.click();confirm.click();});expect(mocks.send).toHaveBeenCalledTimes(1);await act(async()=>pending.resolve(hash));});
 it('retains a late returned hash even after navigating away',async()=>{const pending=deferred<Hex>();mocks.send.mockReturnValue(pending.promise);mocks.session=session;mocks.key='testnet';await render(<TestnetDashboard/>);await click('Review invoice');await click('Open wallet');await render(<p>Other page</p>);await act(async()=>pending.resolve(hash));expect(getSubmissions().some(x=>x.hash===hash)).toBe(true);expect(text()).toBe('Other page');});
 // These mocks verify UI wiring only; strict settlement proof is tested in testnetClient.test.ts.
 it('shows created state only after calling the strict create confirmation helper',async()=>{
  mocks.session=session;mocks.key='testnet';
  mocks.wait.mockResolvedValueOnce({transactionHash:hash,from:session.account,to:action.to,status:'success'});
  const confirmation=deferred<LoadedInvoice>();mocks.confirmCreated.mockReturnValueOnce(confirmation.promise);
  await render(<TestnetDashboard/>);await click('Review invoice');await click('Open wallet');
  expect(mocks.confirmCreated).toHaveBeenCalledExactlyOnceWith(testnetClient,action,hash);
  expect(mocks.confirmOutcome).not.toHaveBeenCalled();
  expect(text()).not.toContain('Invoice created on Arc Testnet');
  await act(async()=>confirmation.resolve(invoice));
  expect(text()).toContain('Invoice created on Arc Testnet');
  expect(host.querySelector('a[href*="/pay/"]')).not.toBeNull();
 });
 it('keeps a submitted create unresolved when strict confirmation rejects',async()=>{
  mocks.session=session;mocks.key='testnet';
  mocks.wait.mockResolvedValueOnce({transactionHash:hash,from:session.account,to:action.to,status:'success'});
  mocks.confirmCreated.mockRejectedValueOnce(Error('Strict confirmation failed'));
  await render(<TestnetDashboard/>);await click('Review invoice');await click('Open wallet');
  expect(mocks.confirmCreated).toHaveBeenCalledExactlyOnceWith(testnetClient,action,hash);
  expect(mocks.confirmOutcome).not.toHaveBeenCalled();
  expect(text()).toContain('Strict confirmation failed');
  expect(text()).toContain('The submitted hash is saved');
  expect(text()).not.toContain('Invoice created on Arc Testnet');
  expect(host.querySelector('a[href*="/pay/"]')).toBeNull();
  expect(getSubmissions().find(x=>x.hash===hash)?.state).toBe('submitted');
  expect(mocks.send).toHaveBeenCalledTimes(1);
 });
 it('shows unknown invoice read errors without enabling payment',async()=>{mocks.session=session;mocks.key='testnet';mocks.load.mockRejectedValue(Error('Unknown invoice'));await render(<TestnetPayScreen invoiceId={id}/>);expect(button('Review test payment').disabled).toBe(true);expect(text()).toContain('Unknown invoice');});
 it('loads a request without a wallet but does not enable paying',async()=>{await render(<TestnetPayScreen invoiceId={id}/>);expect(text()).toContain('0.20 test USDC');expect(button('Review test payment').disabled).toBe(true);expect(mocks.provider).not.toHaveBeenCalled();});
 it('blocks a saved pending payment using alternate ID casing',async()=>{mocks.session=session;mocks.key='testnet';recordSubmission({hash,kind:'pay',invoiceId:`0x${'A'.repeat(64)}`,account:session.account,state:'submitted'});await render(<TestnetPayScreen invoiceId={id}/>);expect(button('Review test payment').disabled).toBe(true);expect(text()).toContain('A hash is not payment proof');});
 it('keeps simulation visibly distinct and never requests wallet access',async()=>{await render(<TestnetDashboard/>);await click('Use offline simulation');expect(text()).toContain('Offline demo mode');expect(text()).toContain('separate from the live');expect(mocks.provider).not.toHaveBeenCalled();});
 it('verifies receipts without a wallet and does not fabricate verified settlement',async()=>{mocks.verify.mockResolvedValue({invoice,hash,result:{status:'UNVERIFIED_ARC_EVIDENCE',message:'Native settlement evidence still pending.',verified:false,paymentLogIndex:0,blockHash:hash,verifiedAt:0}});await render(<TestnetReceiptScreen invoiceId={id} txHash={hash}/>);await click('Verify from chain');expect(text()).toContain('settlement evidence incomplete');expect(mocks.provider).not.toHaveBeenCalled();});
 it('does not render stale receipt results on a newer route',async()=>{const pending=deferred<unknown>();mocks.verify.mockReturnValueOnce(pending.promise).mockReturnValue(new Promise(()=>{}));await render(<TestnetReceiptScreen invoiceId={id} txHash={hash}/>);await render(<TestnetReceiptScreen invoiceId={`0x${'c'.repeat(64)}`}/>);await act(async()=>pending.resolve({invoice,hash,result:{status:'PENDING',message:'STALE RESULT',verified:false,paymentLogIndex:null,blockHash:null,verifiedAt:0}}));expect(text()).not.toContain('STALE RESULT');});
});
