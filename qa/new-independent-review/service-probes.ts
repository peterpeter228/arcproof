import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createPublicClient, custom, getAddress, decodeFunctionData, encodeFunctionResult, encodeAbiParameters, encodeEventTopics, encodeFunctionData, keccak256, toHex, type Address, type Hex } from 'viem';
import type { LoadedInvoice, Session, WalletRequest } from '../../src/arcproof/testnetClient';
import type { RawReceipt, RawTransaction, RawLog } from '../../src/arcproof/receiptVerifier';
import { verifyReceipt } from '../../src/arcproof/receiptVerifier';
import type { Submission } from '../../src/arcproof/submissions';
import { memoryLocks } from '../../src/arcproof/__tests__/fixtures/safeBrowser';
let networkAttempts = 0;
globalThis.fetch = (async () => { networkAttempts++; throw new Error('OFFLINE PROBE: live network is prohibited'); }) as typeof fetch;
// In-process primitives model current dispatch prerequisites, not a browser acceptance test.
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:memoryLocks()}});
const storage = new Map<string,string>();
let storageThrows = false;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { get length(){return storage.size;},key:(index:number)=>[...storage.keys()][index]??null,removeItem:(key:string)=>{storage.delete(key);},clear:()=>storage.clear(), getItem: (k:string) => storage.get(k) ?? null, setItem: (k:string,v:string) => { if(storageThrows) throw new Error('mock quota failure'); storage.set(k,v); } } });
const svc = await import('../../src/arcproof/testnetClient');
const registry = await import('../../src/arcproof/submissions');
const { ARC_TESTNET, TESTNET_DEPLOYMENT, TESTNET_MANIFEST, ZERO_TERMS } = await import('../../src/arcproof/testnet');
const { PRODUCTION_MANIFEST } = await import('../../src/arcproof/manifest');
const { ARCPROOF_ABI } = await import('../../src/arcproof/arcproofAbi');
const { deriveInvoiceId } = await import('../../src/arcproof/invoiceId');
const artifact = JSON.parse(fs.readFileSync('evidence/g1/ArcProofInvoices.artifact.json','utf8'));
const runtime = artifact.deployedBytecode.object as Hex;
const results: { name:string; status:'passed'|'failed'; detail?:string }[] = [];
async function probe(name:string, fn:()=>unknown) { try { await fn(); results.push({name,status:'passed'}); console.log('PASS',name); } catch(e) { const detail=e instanceof Error ? e.stack ?? e.message : String(e); results.push({name,status:'failed',detail}); console.log('FAIL',name,detail); } }
let n=50000;
const nextHash=():Hex=>`0x${(++n).toString(16).padStart(64,'0')}`;
const nextAccount=():Address=>getAddress(`0x${(++n).toString(16).padStart(40,'0')}`);
function deferred<T>() { let resolve!:(v:T)=>void; let reject!:(e:unknown)=>void; const promise=new Promise<T>((a,b)=>{resolve=a;reject=b;}); return {promise,resolve,reject}; }
interface RpcCall { method: string; args: { address?: Address; functionName?: string; args?: { invoiceId?: Hex }; fromBlock?: bigint; toBlock?: bigint; data?: Hex } }
type WalletCall = Parameters<WalletRequest['request']>[0];
interface FixtureState {
 chainId: number; runtime: Hex; payerCode: Hex; merchantCode: Hex; timestamp: bigint; gas: bigint; gasPrice: bigint; balance: bigint;
 readNumber: number; calls: RpcCall[]; walletCalls: WalletCall[]; current: Session | null; walletAccount: Address; walletChain: Hex; walletSend: Hex | undefined;
 tx: RawTransaction; receipt: RawReceipt; logs: RawLog[]; onCall?: () => void | Promise<void>; onSend?: (() => unknown) | null;
 invoiceRead?: (invoice: LoadedInvoice) => LoadedInvoice;
}
function asRecord(value: unknown): Record<string, unknown> {
 assert.ok(value !== null && typeof value === 'object');
 return Object.fromEntries(Object.entries(value));
}
function asHex(value: unknown): Hex {
 assert.ok(typeof value === 'string' && /^0x[0-9a-f]*$/i.test(value));
 return value as Hex;
}
function rpcLog(log: RawLog) {
 return { ...log, blockNumber: log.blockNumber === undefined ? null : toHex(log.blockNumber), logIndex: toHex(log.logIndex), transactionIndex: toHex(log.transactionIndex ?? 0) };
}
function fixture() {
 const account=nextAccount(), merchant=nextAccount(), invoiceId=nextHash(), hash=nextHash(), blockHash=nextHash();
 const session: Session={account,chainId:5042002,connectionVersion:1};
 const state: FixtureState={ chainId:5042002, runtime, payerCode:'0x', merchantCode:'0x', timestamp:1000000n, gas:100000n, gasPrice:10n, balance:10n**20n, readNumber:0, calls:[], walletCalls:[], current:session, walletAccount:account, walletChain:toHex(5042002), walletSend:hash,
  tx:{hash,from:account,to:TESTNET_DEPLOYMENT.contractAddress,input:'0x',value:0n,chainId:5042002},
  receipt:{transactionHash:hash,from:account,to:TESTNET_DEPLOYMENT.contractAddress,status:'success',blockNumber:500n,blockHash,transactionIndex:0,logs:[]}, logs:[] };
 const invoice: LoadedInvoice={invoiceId,merchant,amountNative:2n*10n**17n,expiresAt:state.timestamp+86400n,termsHash:ZERO_TERMS,paid:false,payer:'0x0000000000000000000000000000000000000000',paidAt:0n,paidBlockNumber:0n};
 // Use the real viem client and formatter with an entirely in-process transport.
 // Unsupported RPC methods throw instead of falling back to HTTP or an unsafe PublicClient cast.
 const client=createPublicClient({transport:custom({request:async({method,params}:{method:string;params?:readonly unknown[]})=>{
  if(method==='eth_chainId') return toHex(state.chainId);
  if(method==='eth_getCode') { const address=asHex(params?.[0]);return address.toLowerCase()===TESTNET_DEPLOYMENT.contractAddress.toLowerCase()?state.runtime:address.toLowerCase()===merchant.toLowerCase()?state.merchantCode:state.payerCode; }
  if(method==='eth_getBlockByNumber') return {number:typeof params?.[0]==='string'&&params[0].startsWith('0x')?params[0]:toHex(500n),hash:blockHash,timestamp:toHex(state.timestamp),transactions:[],gasLimit:'0x0',gasUsed:'0x0',difficulty:'0x0',extraData:'0x',miner:merchant,mixHash:blockHash,nonce:'0x0000000000000000',parentHash:blockHash,receiptsRoot:blockHash,sha3Uncles:blockHash,size:'0x0',stateRoot:blockHash,transactionsRoot:blockHash,uncles:[]};
  if(method==='eth_call') {
   const args=asRecord(params?.[0]);const data=asHex(args.data);const decoded=decodeFunctionData({abi:ARCPROOF_ABI,data});
   if(decoded.functionName==='nextNonce'||decoded.functionName==='getInvoice') {
    state.readNumber++;state.calls.push({method:'readContract',args:{functionName:decoded.functionName}});
    if(decoded.functionName==='nextNonce')return encodeFunctionResult({abi:ARCPROOF_ABI,functionName:'nextNonce',result:1n});
    return encodeFunctionResult({abi:ARCPROOF_ABI,functionName:'getInvoice',result:state.invoiceRead?state.invoiceRead({...invoice}):{...invoice}});
   }
   state.calls.push({method:'call',args:{data}});if(state.onCall)await state.onCall();return '0x';
  }
  if(method==='eth_estimateGas')return toHex(state.gas);
  if(method==='eth_gasPrice')return toHex(state.gasPrice);
  if(method==='eth_getBalance')return toHex(state.balance);
  if(method==='eth_getTransactionByHash')return {...state.tx,type:'0x0',value:toHex(state.tx.value),chainId:toHex(state.tx.chainId??state.chainId),blockNumber:state.tx.blockNumber===undefined?null:state.tx.blockNumber===null?null:toHex(state.tx.blockNumber),transactionIndex:state.tx.transactionIndex==null?null:toHex(state.tx.transactionIndex),gas:'0x186a0',gasPrice:'0xa',nonce:'0x0',r:nextHash(),s:nextHash(),v:'0x1b'};
  if(method==='eth_getTransactionReceipt')return {...state.receipt,type:'0x0',status:state.receipt.status==='success'?'0x1':'0x0',blockNumber:toHex(state.receipt.blockNumber),transactionIndex:toHex(state.receipt.transactionIndex),logs:state.receipt.logs.map(rpcLog),gasUsed:state.receipt.gasUsed===undefined?undefined:toHex(state.receipt.gasUsed),effectiveGasPrice:state.receipt.effectiveGasPrice===undefined?undefined:toHex(state.receipt.effectiveGasPrice),cumulativeGasUsed:'0x0',contractAddress:null,logsBloom:'0x'};
  if(method==='eth_getLogs') {
   const filter=asRecord(params?.[0]);assert.ok(Array.isArray(filter.topics));
   state.calls.push({method:'getContractEvents',args:{address:asHex(filter.address),fromBlock:BigInt(asHex(filter.fromBlock)),toBlock:BigInt(asHex(filter.toBlock)),args:{invoiceId:asHex(filter.topics[1])}}});
   return state.logs.map(rpcLog);
  }
  throw new Error(`OFFLINE PROBE: unsupported RPC method ${method}`);
 }}, {retryCount:0})});
 const wallet: WalletRequest={request:async(args)=>{state.walletCalls.push(args); if(args.method==='eth_chainId')return state.walletChain; if(args.method==='eth_accounts')return [state.walletAccount]; if(args.method==='eth_sendTransaction'){if(state.onSend)return state.onSend();return state.walletSend;} throw new Error('Unexpected wallet method');}};
 return {state,invoice,client,wallet,session,account,merchant,invoiceId,hash,blockHash,getCurrent:()=>state.current,sends:()=>state.walletCalls.filter(x=>x.method==='eth_sendTransaction')};
}
async function prep(kind:'pay'|'create'='pay') { const f=fixture(); const action=kind==='pay'?await svc.preparePay(f.client,f.session,f.invoiceId):await svc.prepareCreate(f.client,f.session,'0.2',24); return {...f,action}; }
async function rejectsNoSend(f:Awaited<ReturnType<typeof prep>>, regex?:RegExp) { const send=()=>svc.sendPreparedAction(f.client,f.wallet,f.action,f.getCurrent);if(regex)await assert.rejects(send,regex);else await assert.rejects(send);assert.equal(f.sends().length,0); }
function paymentEvidence(f:ReturnType<typeof fixture>) {
 Object.assign(f.invoice,{paid:true,payer:f.account,paidAt:f.state.timestamp,paidBlockNumber:500n});
 f.state.tx={hash:f.hash,from:f.account,to:TESTNET_DEPLOYMENT.contractAddress,input:encodeFunctionData({abi:ARCPROOF_ABI,functionName:'payInvoice',args:[f.invoiceId]}),value:f.invoice.amountNative,chainId:5042002,blockHash:f.blockHash,blockNumber:500n,transactionIndex:0};
 f.state.receipt={transactionHash:f.hash,from:f.account,to:TESTNET_DEPLOYMENT.contractAddress,status:'success',blockNumber:500n,blockHash:f.blockHash,transactionIndex:0,logs:[{address:TESTNET_DEPLOYMENT.contractAddress,topics:encodeEventTopics({abi:ARCPROOF_ABI,eventName:'InvoicePaid',args:{invoiceId:f.invoiceId,payer:f.account,merchant:f.merchant}}).map(asHex),data:encodeAbiParameters([{type:'uint256'}],[f.invoice.amountNative]),logIndex:2,transactionHash:f.hash,blockHash:f.blockHash,blockNumber:500n,transactionIndex:0,removed:false}]};
 f.state.logs=f.state.receipt.logs;
 return f;
}
await probe('identity: empty production manifest, testnet-only frozen identity and exact full runtime',()=>{assert.equal(PRODUCTION_MANIFEST.length,0);assert.equal(ARC_TESTNET.id,5042002);assert.equal(TESTNET_MANIFEST.length,1);assert.equal(Object.isFrozen(TESTNET_DEPLOYMENT),true);assert.equal(keccak256(runtime),TESTNET_DEPLOYMENT.runtimeCodeHash);});
for(const kind of ['create','pay'] as const) {
 await probe(`${kind}: successful action uses refreshed lower gas/price and exact chain/value`,async()=>{const f=await prep(kind); f.state.gas=90000n;f.state.gasPrice=9n;const h=await svc.sendPreparedAction(f.client,f.wallet,f.action,f.getCurrent);assert.equal(h,f.hash);assert.equal(f.sends().length,1); const tx=asRecord(f.sends()[0]?.params?.[0]);assert.equal(tx.chainId,toHex(5042002));assert.equal(tx.from,f.account);assert.equal(tx.value,toHex(f.action.value));assert.equal(tx.gas,toHex(108000n));assert.equal(tx.gasPrice,toHex(9n));assert.ok(registry.getSubmissions().some(x=>x.hash===h));});
 for(const [name,mutate] of [
 ['wrong current chain',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.current={...f.session,chainId:5042};}],
 ['changed account',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.current={...f.session,account:nextAccount()};}],
 ['changed connection version',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.current={...f.session,connectionVersion:2};}],
 ['disconnected',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.current=null;}],
 ['changed RPC chain',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.chainId=5042;}],
 ['changed runtime',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.runtime='0x1234';}],
 ['changed deployment',(f:Awaited<ReturnType<typeof prep>>)=>{f.action.deployment={...TESTNET_DEPLOYMENT,chainId:5042};}],
 ['changed target',(f:Awaited<ReturnType<typeof prep>>)=>{f.action.to=nextAccount();}],
 ['expired review',(f:Awaited<ReturnType<typeof prep>>)=>{f.action.preparedAt=Date.now()-120001;}],
 ['payer now has code',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.payerCode='0x1234';}],
 ['wallet actual chain changed',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.walletChain=toHex(5042);}],
 ['wallet actual account changed',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.walletAccount=nextAccount();}],
 ['higher gas',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.gas+=1n;}],
 ['higher gas price',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.gasPrice+=1n;}],
 ['higher gas but lower fee',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.gas*=2n;f.state.gasPrice=1n;}],
 ['higher gas price but lower fee',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.gas=1n;f.state.gasPrice=11n;}],
 ['insufficient balance',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.balance=0n;}],
 ['context invalidated during simulation',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.onCall=()=>{f.state.current=null;};}],
 ['review expires during preflight',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.onCall=()=>{f.action.preparedAt=Date.now()-120001;};}],
 ] as const) await probe(`${kind}: prevents signing after ${name}`,async()=>{const f=await prep(kind);mutate(f);await rejectsNoSend(f);});
}
for(const [name,mutate] of [
 ['already paid',(f:Awaited<ReturnType<typeof prep>>)=>{f.invoice.paid=true;}], ['invoice expires',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.timestamp=f.invoice.expiresAt;}],
 ['nonzero terms',(f:Awaited<ReturnType<typeof prep>>)=>{f.invoice.termsHash=nextHash();}], ['merchant changes',(f:Awaited<ReturnType<typeof prep>>)=>{f.invoice.merchant=nextAccount();}],
 ['amount changes',(f:Awaited<ReturnType<typeof prep>>)=>{f.invoice.amountNative=10n**18n;}], ['amount above cap',(f:Awaited<ReturnType<typeof prep>>)=>{f.invoice.amountNative=10n**18n+10n**12n;}],
 ['amount sub-quantum',(f:Awaited<ReturnType<typeof prep>>)=>{f.invoice.amountNative+=1n;}], ['merchant now has code',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.merchantCode='0x1234';}],
 ['changed calldata',(f:Awaited<ReturnType<typeof prep>>)=>{f.action.data='0x1234';}], ['changed value',(f:Awaited<ReturnType<typeof prep>>)=>{f.action.value+=10n**12n;}],
 ['changed payment chain',(f:Awaited<ReturnType<typeof prep>>)=>{assert.ok(f.action.payment);f.action.payment.chainId=5042;}], ['changed payment deployment',(f:Awaited<ReturnType<typeof prep>>)=>{assert.ok(f.action.payment);f.action.payment.deploymentId='other';}],
 ] as const) await probe(`pay: action-time ${name}`,async()=>{const f=await prep();mutate(f);await rejectsNoSend(f);});
for(const [name,mutate] of [
 ['expired invoice',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.timestamp=f.action.expiresAt;}], ['expiry exceeds seven days',(f:Awaited<ReturnType<typeof prep>>)=>{f.action.expiresAt=f.state.timestamp+604801n;}],
 ['nonzero value',(f:Awaited<ReturnType<typeof prep>>)=>{f.action.value=1n;}], ['amount above cap',(f:Awaited<ReturnType<typeof prep>>)=>{f.action.amountNative=10n**18n+10n**12n;}],
 ['sub-quantum amount',(f:Awaited<ReturnType<typeof prep>>)=>{f.action.amountNative+=1n;}], ['changed calldata',(f:Awaited<ReturnType<typeof prep>>)=>{f.action.data='0x1234';}],
 ] as const) await probe(`create: action-time ${name}`,async()=>{const f=await prep('create');mutate(f);await rejectsNoSend(f);});
await probe('repeat-submit: only one wallet send while first wallet request unresolved',async()=>{const f=await prep();const gate=deferred<Hex>();f.state.onSend=()=>gate.promise;const first=svc.sendPreparedAction(f.client,f.wallet,f.action,f.getCurrent);let settled=false;void first.then(()=>{settled=true;},()=>{settled=true;});while(!settled&&f.sends().length===0)await new Promise<void>(resolve=>setImmediate(resolve));if(f.sends().length===0)await first;try{await assert.rejects(()=>svc.sendPreparedAction(f.client,f.wallet,f.action,f.getCurrent),/unresolved|Another tab has a wallet operation in progress/);}finally{gate.resolve(f.hash);await first;}assert.equal(f.sends().length,1);});
await probe('uncertain wallet result: invalid hash blocks same-invoice retry and another payer',async()=>{const f=await prep();f.state.walletSend=undefined;await assert.rejects(()=>svc.sendPreparedAction(f.client,f.wallet,f.action,f.getCurrent),/no usable/);await assert.rejects(()=>svc.sendPreparedAction(f.client,f.wallet,f.action,f.getCurrent),/unresolved/);assert.throws(()=>registry.beginSubmission('pay',nextAccount(),f.invoiceId),/unresolved/);assert.equal(f.sends().length,1);});
await probe('uncertain wallet result: transport error blocks retry without resending',async()=>{const f=await prep();f.state.onSend=()=>{throw new Error('disconnected after potential broadcast');};await assert.rejects(()=>svc.sendPreparedAction(f.client,f.wallet,f.action,f.getCurrent),/potential broadcast/);await assert.rejects(()=>svc.sendPreparedAction(f.client,f.wallet,f.action,f.getCurrent),/unresolved/);assert.equal(f.sends().length,1);});
await probe('explicit wallet rejection: code 4001 releases request lease',async()=>{const f=await prep();f.state.onSend=()=>{throw Object.assign(new Error('denied'),{code:4001});};await assert.rejects(()=>svc.sendPreparedAction(f.client,f.wallet,f.action,f.getCurrent),/denied/);f.state.onSend=null;await svc.sendPreparedAction(f.client,f.wallet,f.action,f.getCurrent);assert.equal(f.sends().length,2);});
await probe('returned hash retained after context disappears and storage quota fails',async()=>{
 // Quota failure before dispatch must fail closed without calling the wallet.
 const before=await prep();storageThrows=true;
 try{await assert.rejects(()=>svc.sendPreparedAction(before.client,before.wallet,before.action,before.getCurrent),/quota/);assert.equal(before.sends().length,0);}finally{storageThrows=false;}
 // Separately fail storage only after the wallet has actually returned a hash.
 const f=await prep();f.state.onSend=()=>{f.state.current=null;storageThrows=true;return f.hash;};
 try{await assert.rejects(()=>svc.sendPreparedAction(f.client,f.wallet,f.action,f.getCurrent),/persistence failed/);assert.equal(f.sends().length,1);assert.ok(registry.getSubmissions().some(x=>x.hash===f.hash));assert.doesNotThrow(()=>svc.rememberPaymentHash(f.invoiceId,f.hash));}finally{storageThrows=false;}
 await assert.rejects(()=>svc.sendPreparedAction(f.client,f.wallet,f.action,f.getCurrent),/unresolved/);assert.equal(f.sends().length,1);
});
await probe('case-insensitive payment lease and hash deduplication',()=>{const id=`0x${'aBcD'.repeat(16)}` as Hex,h=`0x${'abCd'.repeat(16)}` as Hex,acct=nextAccount();const lease=registry.beginSubmission('pay',acct,id);assert.throws(()=>registry.beginSubmission('pay',nextAccount(),id.toLowerCase() as Hex));lease.finish();registry.recordSubmission({hash:h,kind:'pay',account:acct,invoiceId:id,state:'submitted'});registry.recordSubmission({hash:h.toLowerCase() as Hex,kind:'pay',account:acct,invoiceId:id.toLowerCase() as Hex,state:'submitted'});assert.equal(registry.getSubmissions().filter(x=>x.hash===h.toLowerCase()).length,1);});
await probe('retention: every unresolved hash survives 60 completed insertions',()=>{const hashes:Hex[]=[];for(let i=0;i<60;i++){const h=nextHash();hashes.push(h);registry.recordSubmission({hash:h,kind:'pay',account:nextAccount(),invoiceId:nextHash(),state:'submitted'});}for(let i=0;i<60;i++)registry.recordSubmission({hash:nextHash(),kind:'create',account:nextAccount(),state:'included'});assert.ok(hashes.every(h=>registry.getSubmissions().some(x=>x.hash===h)));assert.ok(registry.getSubmissions().filter(x=>x.state!=='submitted').length<=20);});
await probe('receipt: coherent fixture remains UNVERIFIED_ARC_EVIDENCE / verified false',async()=>{
 const f=paymentEvidence(fixture());const out=await svc.verifyTestnetReceipt(f.client,f.invoiceId,f.hash);
 // Complete transaction inclusion is synthetic, but native transfer legs are absent.
 assert.equal(out.result.status,'INVALID_NATIVE_TRANSFER');assert.equal(out.result.verified,false);
 // Preserve the original no-policy expectation explicitly, rather than pretending the checked deployment has no policy.
 const {settlementPolicy:_policy,...legacyDeployment}=TESTNET_DEPLOYMENT;
 const legacy=await verifyReceipt(f.hash,f.invoiceId,legacyDeployment,5042002,svc.receiptRpc(f.client));
 assert.equal(legacy.status,'UNVERIFIED_ARC_EVIDENCE');assert.equal(legacy.verified,false);assert.equal(legacy.paymentLogIndex,2);
});
for(const [name,mutate] of [
 ['receipt replacement',(f:ReturnType<typeof fixture>)=>{f.state.receipt.transactionHash=nextHash();}], ['transaction replacement',(f:ReturnType<typeof fixture>)=>{f.state.tx.hash=nextHash();}],
 ['receipt sender',(f:ReturnType<typeof fixture>)=>{f.state.receipt.from=nextAccount();}], ['transaction sender',(f:ReturnType<typeof fixture>)=>{f.state.tx.from=nextAccount();}],
 ['receipt target',(f:ReturnType<typeof fixture>)=>{f.state.receipt.to=nextAccount();}], ['transaction target',(f:ReturnType<typeof fixture>)=>{f.state.tx.to=nextAccount();}],
 ['transaction chain',(f:ReturnType<typeof fixture>)=>{f.state.tx.chainId=5042;}], ['transaction value',(f:ReturnType<typeof fixture>)=>{f.state.tx.value+=1n;}],
 ['transaction invoice',(f:ReturnType<typeof fixture>)=>{f.state.tx.input=encodeFunctionData({abi:ARCPROOF_ABI,functionName:'payInvoice',args:[nextHash()]});}],
 ['event transaction hash',(f:ReturnType<typeof fixture>)=>{f.state.receipt.logs[0].transactionHash=nextHash();}],
 ['event duplicate',(f:ReturnType<typeof fixture>)=>{f.state.receipt.logs.push({...f.state.receipt.logs[0]});}], ['event sender',(f:ReturnType<typeof fixture>)=>{f.state.receipt.logs[0].topics[2]=nextHash();}],
 ['event amount',(f:ReturnType<typeof fixture>)=>{f.state.receipt.logs[0].data=encodeAbiParameters([{type:'uint256'}],[1n]);}], ['event malformed',(f:ReturnType<typeof fixture>)=>{f.state.receipt.logs[0].data='0x01';}],
 ['event invalid log index',(f:ReturnType<typeof fixture>)=>{f.state.receipt.logs[0].logIndex=-1;}], ['receipt block hash',(f:ReturnType<typeof fixture>)=>{f.state.receipt.blockHash=nextHash();}],
 ['invoice paid block',(f:ReturnType<typeof fixture>)=>{f.invoice.paidBlockNumber=501n;}], ['invoice paid time',(f:ReturnType<typeof fixture>)=>{f.invoice.paidAt+=1n;}],
 ['reverted receipt',(f:ReturnType<typeof fixture>)=>{f.state.receipt.status='reverted';}],
 ] as const) await probe(`receipt: rejects mismatched ${name}`,async()=>{const f=paymentEvidence(fixture());mutate(f);const out=await svc.verifyTestnetReceipt(f.client,f.invoiceId,f.hash);assert.notEqual(out.result.status,'UNVERIFIED_ARC_EVIDENCE');assert.notEqual(out.result.status,'INVALID_NATIVE_TRANSFER','the mutated standard identity gate must reject before the missing native-leg gate');assert.equal(out.result.verified,false);});
await probe('receipt recovery: queries exactly paid block and bound invoice; rejects multiple results',async()=>{const f=paymentEvidence(fixture());await svc.verifyTestnetReceipt(f.client,f.invoiceId);const query=f.state.calls.find(x=>x.method==='getContractEvents')?.args;assert.ok(query);assert.ok(query.args);assert.equal(query.fromBlock,500n);assert.equal(query.toBlock,500n);assert.equal(query.args.invoiceId,f.invoiceId);assert.equal(query.address,TESTNET_DEPLOYMENT.contractAddress);f.state.logs=[...f.state.logs,...f.state.logs];await assert.rejects(()=>svc.verifyTestnetReceipt(f.client,f.invoiceId),/Exactly one/);});
await probe('receipt export: returned invoice is the same read snapshot checked by verifier',async()=>{const f=paymentEvidence(fixture());f.state.invoiceRead=row=>({...row,expiresAt:row.expiresAt+BigInt(f.state.readNumber)});const out=await svc.verifyTestnetReceipt(f.client,f.invoiceId,f.hash);assert.equal(f.state.readNumber,2);assert.equal(out.invoice.expiresAt,f.invoice.expiresAt+2n);assert.equal(out.result.status,'INVALID_NATIVE_TRANSFER');assert.equal(out.result.verified,false);});
await probe('saved receipt: reconciliation binds exact transaction/function/invoice without signing',async()=>{const f=paymentEvidence(fixture());const row:Omit<Submission, 'submittedAt'>={hash:f.hash,kind:'pay',invoiceId:f.invoiceId,account:f.account,state:'submitted'};registry.recordSubmission(row);assert.equal(await svc.reconcileSubmission(f.client,row),'included');assert.equal(f.sends().length,0);assert.equal(registry.getSubmissions().find(x=>x.hash===f.hash)?.state,'included');assert.throws(()=>registry.beginSubmission('pay',f.account,f.invoiceId));});
for(const [name,mutate] of [
 ['receipt hash',(f:ReturnType<typeof fixture>)=>{f.state.receipt.transactionHash=nextHash();}], ['transaction hash',(f:ReturnType<typeof fixture>)=>{f.state.tx.hash=nextHash();}],
 ['sender',(f:ReturnType<typeof fixture>)=>{f.state.tx.from=nextAccount();}], ['target',(f:ReturnType<typeof fixture>)=>{f.state.receipt.to=nextAccount();}], ['chain',(f:ReturnType<typeof fixture>)=>{f.state.tx.chainId=5042;}],
 ['invoice',(f:ReturnType<typeof fixture>)=>{f.state.tx.input=encodeFunctionData({abi:ARCPROOF_ABI,functionName:'payInvoice',args:[nextHash()]});}],
 ['function',(f:ReturnType<typeof fixture>)=>{f.state.tx.input=encodeFunctionData({abi:ARCPROOF_ABI,functionName:'createInvoice',args:[1n,1n,ZERO_TERMS]});}],
 ] as const) await probe(`saved receipt: refuses mismatched ${name}`,async()=>{const f=paymentEvidence(fixture());const row:Omit<Submission, 'submittedAt'>={hash:f.hash,kind:'pay',invoiceId:f.invoiceId,account:f.account,state:'submitted'};registry.recordSubmission(row);mutate(f);await assert.rejects(()=>svc.reconcileSubmission(f.client,row));assert.equal(registry.getSubmissions().find(x=>x.hash===f.hash)?.state,'submitted');assert.equal(f.sends().length,0);});
await probe('saved receipt: explicit reverted receipt releases repeat-payment registry lock',async()=>{const f=paymentEvidence(fixture());f.state.receipt.status='reverted';const row:Omit<Submission, 'submittedAt'>={hash:f.hash,kind:'pay',invoiceId:f.invoiceId,account:f.account,state:'submitted'};registry.recordSubmission(row);assert.equal(await svc.reconcileSubmission(f.client,row),'reverted');registry.beginSubmission('pay',f.account,f.invoiceId).finish();});
// Explicit independent adversarial requirements, not inherited assertions.
for(const [name,mutate] of [
 ['log blockHash',(f:ReturnType<typeof fixture>)=>{f.state.receipt.logs[0].blockHash=nextHash();}],
 ['log blockNumber',(f:ReturnType<typeof fixture>)=>{f.state.receipt.logs[0].blockNumber=999n;}],
 ['removed log',(f:ReturnType<typeof fixture>)=>{f.state.receipt.logs[0].removed=true;}],
 ] as const) await probe(`receipt: fails closed on inconsistent ${name}`,async()=>{const f=paymentEvidence(fixture());mutate(f);const out=await svc.verifyTestnetReceipt(f.client,f.invoiceId,f.hash);assert.notEqual(out.result.status,'UNVERIFIED_ARC_EVIDENCE','inconsistent log must not be described as all standard checks passing');assert.notEqual(out.result.status,'INVALID_NATIVE_TRANSFER','inconsistent provenance must fail before checking native legs');assert.equal(out.result.verified,false);});
function createEvidence(f:Awaited<ReturnType<typeof prep>>) {
 const nonce=0n,id=deriveInvoiceId(5042002,TESTNET_DEPLOYMENT.contractAddress,f.account,nonce);
 Object.assign(f.invoice,{invoiceId:id,merchant:f.account,amountNative:f.action.amountNative,expiresAt:f.action.expiresAt,termsHash:ZERO_TERMS});
 f.state.tx={hash:f.hash,from:f.account,to:f.action.to,input:f.action.data,value:0n,chainId:5042002};
 f.state.receipt={transactionHash:f.hash,from:f.account,to:f.action.to,status:'success',blockNumber:500n,blockHash:f.blockHash,transactionIndex:0,logs:[{address:f.action.to,topics:encodeEventTopics({abi:ARCPROOF_ABI,eventName:'InvoiceCreated',args:{invoiceId:id,merchant:f.account}}).map(asHex),data:encodeAbiParameters([{type:'uint256'},{type:'uint256'},{type:'uint64'},{type:'bytes32'}],[nonce,f.action.amountNative,f.action.expiresAt,ZERO_TERMS]),logIndex:0,transactionHash:f.hash,blockHash:f.blockHash,blockNumber:500n,transactionIndex:0,removed:false}]};
 return f;
}
await probe('creation read-back: binds transaction, exact event, derived ID and immutable terms',async()=>{const f=createEvidence(await prep('create'));const out=await svc.readCreatedInvoice(f.client,f.action,f.hash);assert.equal(out.invoiceId,f.invoice.invoiceId);assert.equal(out.merchant,f.account);});
for(const [name,mutate] of [
 ['replaced receipt',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.receipt.transactionHash=nextHash();}], ['replaced transaction',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.tx.hash=nextHash();}],
 ['wrong transaction input',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.tx.input='0x1234';}], ['wrong transaction value',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.tx.value=1n;}],
 ['wrong transaction sender',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.tx.from=nextAccount();}], ['wrong transaction chain',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.tx.chainId=5042;}],
 ['wrong event transaction',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.receipt.logs[0].transactionHash=nextHash();}], ['wrong event blockHash',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.receipt.logs[0].blockHash=nextHash();}],
 ['wrong event blockNumber',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.receipt.logs[0].blockNumber=501n;}], ['duplicate creation event',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.receipt.logs.push({...f.state.receipt.logs[0]});}],
 ['changed read-back terms',(f:Awaited<ReturnType<typeof prep>>)=>{f.invoice.amountNative=1n*10n**18n;}], ['removed creation log',(f:Awaited<ReturnType<typeof prep>>)=>{f.state.receipt.logs[0].removed=true;}],
 ] as const) await probe(`creation read-back: rejects ${name}`,async()=>{const f=createEvidence(await prep('create'));mutate(f);await assert.rejects(()=>svc.readCreatedInvoice(f.client,f.action,f.hash));});
await probe('network isolation: no global fetch attempted',()=>assert.equal(networkAttempts,0));
const paths=['src/arcproof/testnet.ts','src/arcproof/testnetClient.ts','src/arcproof/useTestnetWallet.ts','src/arcproof/submissions.ts','src/arcproof/preparedPayment.ts','src/arcproof/receiptVerifier.ts','src/arcproof/manifest.ts','src/arcproof/arcproofAbi.ts','src/arcproof/exportUtils.ts','src/components/arcproof/TestnetScreens.tsx','src/App.tsx','src/config.ts','evidence/g1/ArcProofInvoices.artifact.json','qa/new-independent-review/service-probes.ts'];
const hashes=Object.fromEntries(paths.filter(p=>fs.existsSync(p)).map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const report={candidate:'NEW reconstructed candidate; no prior test claims inherited',runAtExecutorClock:new Date().toISOString(),executorClockNote:"Executor wall clock was observed approximately nine hours ahead of authoritative clock tool. Do not treat it as authoritative UTC.",scope:'injected offline mocks only; not actual browser, wallet, RPC, payment, finality or audit evidence',networkAttempts,passed:results.filter(x=>x.status==='passed').length,failed:results.filter(x=>x.status==='failed').length,results,sha256:hashes};
const output=process.env.ARCPROOF_PROBE_OUTPUT??'evidence/quality-gates-20261021/service-probes-results.json';
fs.mkdirSync(output.slice(0,output.lastIndexOf('/'))||'.',{recursive:true});
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(`RESULT ${report.passed} passed; ${report.failed} failed; ${networkAttempts} network attempts`);
process.exitCode=report.failed?1:0;
