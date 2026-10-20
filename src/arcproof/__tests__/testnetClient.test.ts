/* eslint-disable typescript/require-await -- Promise-returning RPC mocks intentionally contain no await. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { encodeFunctionData, toHex, type PublicClient, type Hex, type Address } from 'viem';
import artifact from '../../../evidence/g1/ArcProofInvoices.artifact.json';
import { ARCPROOF_ABI } from '../arcproofAbi';
import { ARC_TESTNET, TESTNET_DEPLOYMENT, ZERO_TERMS } from '../testnet';
import { checkDeployment, loadInvoice, prepareCreate, preparePay, sendPreparedAction, assertReceiptMatches, recoverPaymentHash, reconcileSubmission, type Session, type LoadedInvoice, type WalletRequest } from '../testnetClient';
import { getSubmissions, recordSubmission } from '../submissions';
let seq=20000;
const hex=():Hex=>`0x${(++seq).toString(16).padStart(64,'0')}`;
const address=():Address=>`0x${(++seq).toString(16).padStart(40,'0')}`;
function fixture() {
 const session:Session={account:address(),chainId:ARC_TESTNET.id,connectionVersion:1};
 const invoice:LoadedInvoice={invoiceId:hex(),merchant:address(),amountNative:200000000000000000n,expiresAt:2000n,termsHash:ZERO_TERMS,paid:false,payer:'0x0000000000000000000000000000000000000000',paidAt:0n,paidBlockNumber:0n};
 const hash=hex();
 const rpc={
  getChainId:vi.fn(async():Promise<number>=>ARC_TESTNET.id),
  getCode:vi.fn(async({address:a}:{address:Address})=>a.toLowerCase()===TESTNET_DEPLOYMENT.contractAddress.toLowerCase()?artifact.deployedBytecode.object as Hex:'0x'),
  readContract:vi.fn(async()=>({...invoice})), getBlock:vi.fn(async()=>({timestamp:1000n,number:10n,hash:hex()})),
  call:vi.fn(async()=>({data:'0x'})),estimateGas:vi.fn(async()=>100000n),getGasPrice:vi.fn(async()=>100n),getBalance:vi.fn(async()=>10n**20n),
  getContractEvents:vi.fn(async()=>[{transactionHash:hash}]),
  getTransaction:vi.fn(async()=>({hash,chainId:ARC_TESTNET.id,from:session.account,to:TESTNET_DEPLOYMENT.contractAddress,input:encodeFunctionData({abi:ARCPROOF_ABI,functionName:'payInvoice',args:[invoice.invoiceId]}),value:invoice.amountNative})),
  getTransactionReceipt:vi.fn(async()=>({transactionHash:hash,from:session.account,to:TESTNET_DEPLOYMENT.contractAddress,status:'reverted'})),
 };
 const request=vi.fn(async({method}:{method:string;params?:readonly unknown[]})=>method==='eth_chainId'?toHex(ARC_TESTNET.id):method==='eth_accounts'?[session.account]:hash);
 return {session,invoice,hash,rpc,client:rpc as unknown as PublicClient,request,wallet:{request} as WalletRequest};
}
afterEach(()=>vi.restoreAllMocks());
describe('Reconstructed dedicated testnet adapter with offline-only RPC/wallet mocks',()=>{
 it('rejects an RPC serving another chain',async()=>{const f=fixture();f.rpc.getChainId.mockResolvedValue(1);await expect(checkDeployment(f.client)).rejects.toThrow('wrong chain');});
 it('rejects wrong runtime bytecode',async()=>{const f=fixture();f.rpc.getCode.mockResolvedValue('0x6000');await expect(checkDeployment(f.client)).rejects.toThrow('Runtime');});
 it('rejects malformed invoice identifiers',async()=>{const f=fixture();await expect(loadInvoice(f.client,'0x123')).rejects.toThrow('32-byte');});
 it('rejects out-of-cap RPC invoice amounts',async()=>{const f=fixture();f.invoice.amountNative=10n**18n+1n;await expect(loadInvoice(f.client,f.invoice.invoiceId)).rejects.toThrow('Invalid invoice');});
 it('prepares exact native amount and zero creation value',async()=>{const f=fixture(),a=await prepareCreate(f.client,f.session,'0.20',24);expect(a.amountNative).toBe(200000000000000000n);expect(a.value).toBe(0n);expect(a.expiresAt).toBe(87400n);});
 it.each([0,169,1.5])('rejects invalid creation lifetime %s',async hours=>{const f=fixture();await expect(prepareCreate(f.client,f.session,'0.20',hours)).rejects.toThrow();});
 it.each(['0','1.000001','0.0000001','1e-1'])('rejects invalid creation amount %s',async amount=>{const f=fixture();await expect(prepareCreate(f.client,f.session,amount,24)).rejects.toThrow();});
 it('does not prepare a paid invoice',async()=>{const f=fixture();f.invoice.paid=true;await expect(preparePay(f.client,f.session,f.invoice.invoiceId)).rejects.toThrow('already');});
 it('does not prepare unsupported terms',async()=>{const f=fixture();f.invoice.termsHash=hex();await expect(preparePay(f.client,f.session,f.invoice.invoiceId)).rejects.toThrow('UNSUPPORTED');});
 it('does not prepare an expired invoice',async()=>{const f=fixture();f.invoice.expiresAt=1000n;await expect(preparePay(f.client,f.session,f.invoice.invoiceId)).rejects.toThrow('expired');});
 it('rejects smart-contract payers and merchants',async()=>{const f=fixture();const original=f.rpc.getCode.getMockImplementation()!;f.rpc.getCode.mockImplementation(async args=>args.address===f.session.account?'0x6000':original(args));await expect(preparePay(f.client,f.session,f.invoice.invoiceId)).rejects.toThrow('EOA');f.rpc.getCode.mockImplementation(async args=>args.address===f.invoice.merchant?'0x6000':original(args));await expect(preparePay(f.client,f.session,f.invoice.invoiceId)).rejects.toThrow('EOA');});
 it('rejects insufficient value-plus-fee balance',async()=>{const f=fixture();f.rpc.getBalance.mockResolvedValue(f.invoice.amountNative);await expect(preparePay(f.client,f.session,f.invoice.invoiceId)).rejects.toThrow('Insufficient');});
 it('submits once with explicit sender, chain and exact value, then saves the hash',async()=>{const f=fixture(),a=await preparePay(f.client,f.session,f.invoice.invoiceId);expect(await sendPreparedAction(f.client,f.wallet,a,()=>f.session)).toBe(f.hash);const sends=f.request.mock.calls.filter(([x])=>x.method==='eth_sendTransaction');expect(sends).toHaveLength(1);expect(sends[0][0].params?.[0]).toMatchObject({from:f.session.account,chainId:toHex(ARC_TESTNET.id),to:TESTNET_DEPLOYMENT.contractAddress,value:toHex(f.invoice.amountNative)});expect(getSubmissions().some(x=>x.hash===f.hash)).toBe(true);});
 it('rejects a stale account before the wallet is asked',async()=>{const f=fixture(),a=await preparePay(f.client,f.session,f.invoice.invoiceId);await expect(sendPreparedAction(f.client,f.wallet,a,()=>({...f.session,account:address()}))).rejects.toThrow('context');expect(f.request).not.toHaveBeenCalled();});
 it('rejects wrong wallet chain at action time without sending',async()=>{const f=fixture(),a=await preparePay(f.client,f.session,f.invoice.invoiceId);f.request.mockImplementation(async({method})=>method==='eth_chainId'?'0x1':[f.session.account]);await expect(sendPreparedAction(f.client,f.wallet,a,()=>f.session)).rejects.toThrow('changed');expect(f.request.mock.calls.some(([x])=>x.method==='eth_sendTransaction')).toBe(false);});
 it('rechecks paid state immediately before dispatch',async()=>{const f=fixture(),a=await preparePay(f.client,f.session,f.invoice.invoiceId);f.invoice.paid=true;await expect(sendPreparedAction(f.client,f.wallet,a,()=>f.session)).rejects.toThrow('paid');expect(f.request).not.toHaveBeenCalled();});
 it('rechecks merchant EOA status immediately before dispatch',async()=>{const f=fixture(),a=await preparePay(f.client,f.session,f.invoice.invoiceId);const original=f.rpc.getCode.getMockImplementation()!;f.rpc.getCode.mockImplementation(async args=>args.address===f.invoice.merchant?'0x6000':original(args));await expect(sendPreparedAction(f.client,f.wallet,a,()=>f.session)).rejects.toThrow('EOA');});
 it('rejects higher gas limit even when total fee falls',async()=>{const f=fixture(),a=await preparePay(f.client,f.session,f.invoice.invoiceId);f.rpc.estimateGas.mockResolvedValue(110000n);f.rpc.getGasPrice.mockResolvedValue(1n);await expect(sendPreparedAction(f.client,f.wallet,a,()=>f.session)).rejects.toThrow('increased');});
 it('uses refreshed lower fee fields rather than stale reviewed ones',async()=>{const f=fixture(),a=await preparePay(f.client,f.session,f.invoice.invoiceId);f.rpc.getGasPrice.mockResolvedValue(1n);await sendPreparedAction(f.client,f.wallet,a,()=>f.session);const send=f.request.mock.calls.find(([x])=>x.method==='eth_sendTransaction');expect(send?.[0].params?.[0]).toMatchObject({gasPrice:'0x1'});});
 it('rechecks review age after asynchronous wallet context reads',async()=>{const f=fixture(),a=await preparePay(f.client,f.session,f.invoice.invoiceId);f.request.mockImplementation(async({method})=>{vi.spyOn(Date,'now').mockReturnValue(a.preparedAt+120001);return method==='eth_chainId'?toHex(ARC_TESTNET.id):[f.session.account];});await expect(sendPreparedAction(f.client,f.wallet,a,()=>f.session)).rejects.toThrow('expired during');});
 it('never resends after an ambiguous wallet outcome',async()=>{const f=fixture(),a=await preparePay(f.client,f.session,f.invoice.invoiceId);f.request.mockImplementation(async({method})=>{if(method==='eth_sendTransaction')throw Error('transport timed out');return method==='eth_chainId'?toHex(ARC_TESTNET.id):[f.session.account];});await expect(sendPreparedAction(f.client,f.wallet,a,()=>f.session)).rejects.toThrow('timed out');await expect(sendPreparedAction(f.client,f.wallet,a,()=>f.session)).rejects.toThrow('unresolved');expect(f.request.mock.calls.filter(([x])=>x.method==='eth_sendTransaction')).toHaveLength(1);});
 it('does not confuse a replacement receipt with the submitted hash',async()=>{const f=fixture(),a=await preparePay(f.client,f.session,f.invoice.invoiceId);expect(()=>assertReceiptMatches(a,f.hash,{transactionHash:hex(),from:f.session.account,to:a.to})).toThrow('replacement');});
 it('limits hash recovery to the recorded paid block',async()=>{const f=fixture();f.invoice.paid=true;f.invoice.paidBlockNumber=456n;expect(await recoverPaymentHash(f.client,f.invoice)).toBe(f.hash);expect(f.rpc.getContractEvents).toHaveBeenCalledWith(expect.objectContaining({fromBlock:456n,toBlock:456n,args:{invoiceId:f.invoice.invoiceId}}));});
 it('requires exactly one matching recovery event',async()=>{const f=fixture();f.invoice.paid=true;f.invoice.paidBlockNumber=456n;f.rpc.getContractEvents.mockResolvedValue([]);await expect(recoverPaymentHash(f.client,f.invoice)).rejects.toThrow('Exactly one');});
 it('only unlocks a saved reverted hash after exact sender/target/function binding',async()=>{const f=fixture(),row={hash:f.hash,kind:'pay' as const,invoiceId:f.invoice.invoiceId,account:f.session.account,state:'submitted' as const};recordSubmission(row);expect(await reconcileSubmission(f.client,row)).toBe('reverted');expect(getSubmissions().find(x=>x.hash===f.hash)?.state).toBe('reverted');});
});
