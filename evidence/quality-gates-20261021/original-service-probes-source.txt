import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { encodeAbiParameters, encodeEventTopics, encodeFunctionData, keccak256, toHex, type Address, type Hex } from 'viem';
let networkAttempts = 0;
globalThis.fetch = (async () => { networkAttempts++; throw new Error('OFFLINE PROBE: live network is prohibited'); }) as typeof fetch;
const storage = new Map<string,string>();
let storageThrows = false;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k:string) => storage.get(k) ?? null, setItem: (k:string,v:string) => { if(storageThrows) throw new Error('mock quota failure'); storage.set(k,v); } } });
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
const nextAccount=():Address=>`0x${(++n).toString(16).padStart(40,'0')}`;
function deferred<T>() { let resolve!:(v:T)=>void; let reject!:(e:unknown)=>void; const promise=new Promise<T>((a,b)=>{resolve=a;reject=b;}); return {promise,resolve,reject}; }
function fixture() {
 const account=nextAccount(), merchant=nextAccount(), invoiceId=nextHash(), hash=nextHash(), blockHash=nextHash();
 const session={account,chainId:5042002,connectionVersion:1};
 const state:any={ chainId:5042002, runtime, payerCode:'0x', merchantCode:'0x', timestamp:1000000n, gas:100000n, gasPrice:10n, balance:10n**20n, readNumber:0, calls:[] as any[], walletCalls:[] as any[], current:session, walletAccount:account, walletChain:toHex(5042002), walletSend:hash };
 const invoice:any={invoiceId,merchant,amountNative:2n*10n**17n,expiresAt:state.timestamp+86400n,termsHash:ZERO_TERMS,paid:false,payer:'0x'+'0'.repeat(40),paidAt:0n,paidBlockNumber:0n};
 const client:any={
  getChainId:async()=>state.chainId,
  getCode:async({address}:any)=>address.toLowerCase()===TESTNET_DEPLOYMENT.contractAddress.toLowerCase()?state.runtime:address.toLowerCase()===merchant.toLowerCase()?state.merchantCode:state.payerCode,
  getBlock:async(args:any)=>({number: args.blockNumber??500n,hash:blockHash,timestamp:state.timestamp}),
  readContract:async(args:any)=>{state.readNumber++; state.calls.push({method:'readContract',args}); return args.functionName==='nextNonce'?1n:{...invoice};},
  call:async(args:any)=>{state.calls.push({method:'call',args}); if(state.onCall) await state.onCall(); return {data:'0x'};},
  estimateGas:async()=>state.gas,
  getGasPrice:async()=>state.gasPrice,
  getBalance:async()=>state.balance,
  getTransaction:async()=>state.tx,
  getTransactionReceipt:async()=>state.receipt,
  getContractEvents:async(args:any)=>{state.calls.push({method:'getContractEvents',args}); return state.logs??[];},
 };
 const wallet:any={request:async(args:any)=>{state.walletCalls.push(args); if(args.method==='eth_chainId')return state.walletChain; if(args.method==='eth_accounts')return [state.walletAccount]; if(args.method==='eth_sendTransaction'){if(state.onSend)return state.onSend();return state.walletSend;} throw new Error('Unexpected wallet method');}};
 return {state,invoice,client,wallet,session,account,merchant,invoiceId,hash,blockHash,getCurrent:()=>state.current,sends:()=>state.walletCalls.filter((x:any)=>x.method==='eth_sendTransaction')};
}
async function prep(kind:'pay'|'create'='pay') { const f=fixture(); const action=kind==='pay'?await svc.preparePay(f.client,f.session,f.invoiceId):await svc.prepareCreate(f.client,f.session,'0.2',24); return {...f,action}; }
async function rejectsNoSend(f:Awaited<ReturnType<typeof prep>>, regex?:RegExp) { await assert.rejects(()=>svc.sendPreparedAction(f.client,f.wallet,f.action,f.getCurrent),regex);assert.equal(f.sends().length,0); }
function paymentEvidence(f:ReturnType<typeof fixture>) {
 Object.assign(f.invoice,{paid:true,payer:f.account,paidAt:f.state.timestamp,paidBlockNumber:500n});
 f.state.tx={hash:f.hash,from:f.account,to:TESTNET_DEPLOYMENT.contractAddress,input:encodeFunctionData({abi:ARCPROOF_ABI,functionName:'payInvoice',args:[f.invoiceId]}),value:f.invoice.amountNative,chainId:5042002};
 f.state.receipt={transactionHash:f.hash,from:f.account,to:TESTNET_DEPLOYMENT.contractAddress,status:'success',blockNumber:500n,blockHash:f.blockHash,transactionIndex:0,logs:[{address:TESTNET_DEPLOYMENT.contractAddress,topics:encodeEventTopics({abi:ARCPROOF_ABI,eventName:'InvoicePaid',args:{invoiceId:f.invoiceId,payer:f.account,merchant:f.merchant}}),data:encodeAbiParameters([{type:'uint256'}],[f.invoice.amountNative]),logIndex:2,transactionHash:f.hash,blockHash:f.blockHash,blockNumber:500n,removed:false}]};
 f.state.logs=f.state.receipt.logs;
 return f;
}
await probe('identity: empty production manifest, testnet-only frozen identity and exact full runtime',()=>{assert.equal(PRODUCTION_MANIFEST.length,0);assert.equal(ARC_TESTNET.id,5042002);assert.equal(TESTNET_MANIFEST.length,1);assert.equal(Object.isFrozen(TESTNET_DEPLOYMENT),true);assert.equal(keccak256(runtime),TESTNET_DEPLOYMENT.runtimeCodeHash);});
for(const kind of ['create','pay'] as const) {
 await probe(`${kind}: successful action uses refreshed lower gas/price and exact chain/value`,async()=>{const f=await prep(kind); f.state.gas=90000n;f.state.gasPrice=9n;const h=await svc.sendPreparedAction(f.client,f.wallet,f.action,f.getCurrent);assert.equal(h,f.hash);assert.equal(f.sends().length,1); const tx=f.sends()[0].params[0];assert.equal(tx.chainId,toHex(5042002));assert.equal(tx.from,f.account);assert.equal(tx.value,toHex(f.action.value));assert.equal(tx.gas,toHex(108000n));assert.equal(tx.gasPrice,toHex(9n));assert.ok(registry.getSubmissions().some(x=>x.hash===h));});
 for(const [name,mutate] of [
 ['wrong current chain',(f:any)=>{f.state.current={...f.session,chainId:5042};}],
 ['changed account',(f:any)=>{f.state.current={...f.session,account:nextAccount()};}],
 ['changed connection version',(f:any)=>{f.state.current={...f.session,connectionVersion:2};}],
 ['disconnected',(f:any)=>{f.state.current=null;}],
 ['changed RPC chain',(f:any)=>{f.state.chainId=5042;}],
 ['changed runtime',(f:any)=>{f.state.runtime='0x1234';}],
 ['changed deployment',(f:any)=>{f.action.deployment={...TESTNET_DEPLOYMENT,chainId:5042};}],
 ['changed target',(f:any)=>{f.action.to=nextAccount();}],
 ['expired review',(f:any)=>{f.action.preparedAt=Date.now()-120001;}],
 ['payer now has code',(f:any)=>{f.state.payerCode='0x1234';}],
 ['wallet actual chain changed',(f:any)=>{f.state.walletChain=toHex(5042);}],
 ['wallet actual account changed',(f:any)=>{f.state.walletAccount=nextAccount();}],
 ['higher gas',(f:any)=>{f.state.gas+=1n;}],
 ['higher gas price',(f:any)=>{f.state.gasPrice+=1n;}],
 ['higher gas but lower fee',(f:any)=>{f.state.gas*=2n;f.state.gasPrice=1n;}],
 ['higher gas price but lower fee',(f:any)=>{f.state.gas=1n;f.state.gasPrice=11n;}],
 ['insufficient balance',(f:any)=>{f.state.balance=0n;}],
 ['context invalidated during simulation',(f:any)=>{f.state.onCall=()=>{f.state.current=null;};}],
 ['review expires during preflight',(f:any)=>{f.state.onCall=()=>{f.action.preparedAt=Date.now()-120001;};}],
 ] as const) await probe(`${kind}: prevents signing after ${name}`,async()=>{const f=await prep(kind);mutate(f);await rejectsNoSend(f);});
}
for(const [name,mutate] of [
 ['already paid',(f:any)=>{f.invoice.paid=true;}], ['invoice expires',(f:any)=>{f.state.timestamp=f.invoice.expiresAt;}],
 ['nonzero terms',(f:any)=>{f.invoice.termsHash=nextHash();}], ['merchant changes',(f:any)=>{f.invoice.merchant=nextAccount();}],
 ['amount changes',(f:any)=>{f.invoice.amountNative=10n**18n;}], ['amount above cap',(f:any)=>{f.invoice.amountNative=10n**18n+10n**12n;}],
 ['amount sub-quantum',(f:any)=>{f.invoice.amountNative+=1n;}], ['merchant now has code',(f:any)=>{f.state.merchantCode='0x1234';}],
 ['changed calldata',(f:any)=>{f.action.data='0x1234';}], ['changed value',(f:any)=>{f.action.value+=10n**12n;}],
 ['changed payment chain',(f:any)=>{f.action.payment.chainId=5042;}], ['changed payment deployment',(f:any)=>{f.action.payment.deploymentId='other';}],
 ] as const) await probe(`pay: action-time ${name}`,async()=>{const f=await prep();mutate(f);await rejectsNoSend(f);});
for(const [name,mutate] of [
 ['expired invoice',(f:any)=>{f.state.timestamp=f.action.expiresAt;}], ['expiry exceeds seven days',(f:any)=>{f.action.expiresAt=f.state.timestamp+604801n;}],
 ['nonzero value',(f:any)=>{f.action.value=1n;}], ['amount above cap',(f:any)=>{f.action.amountNative=10n**18n+10n**12n;}],
 ['sub-quantum amount',(f:any)=>{f.action.amountNative+=1n;}], ['changed calldata',(f:any)=>{f.action.data='0x1234';}],
 ] as const) await probe(`create: action-time ${name}`,async()=>{const f=await prep('create');mutate(f);await rejectsNoSend(f);});
await probe('repeat-submit: only one wallet send while first wallet request unresolved',async()=>{const f=await prep();const gate=deferred<Hex>();f.state.onSend=()=>gate.promise;const first=svc.sendPreparedAction(f.client,f.wallet,f.action,f.getCurrent);while(f.sends().length===0)await Promise.resolve();await assert.rejects(()=>svc.sendPreparedAction(f.client,f.wallet,f.action,f.getCurrent),/unresolved/);gate.resolve(f.hash);await first;assert.equal(f.sends().length,1);});
await probe('uncertain wallet result: invalid hash blocks same-invoice retry and another payer',async()=>{const f=await prep();f.state.walletSend=undefined;await assert.rejects(()=>svc.sendPreparedAction(f.client,f.wallet,f.action,f.getCurrent),/no usable/);await assert.rejects(()=>svc.sendPreparedAction(f.client,f.wallet,f.action,f.getCurrent),/unresolved/);assert.throws(()=>registry.beginSubmission('pay',nextAccount(),f.invoiceId),/unresolved/);assert.equal(f.sends().length,1);});
await probe('uncertain wallet result: transport error blocks retry without resending',async()=>{const f=await prep();f.state.onSend=()=>{throw new Error('disconnected after potential broadcast');};await assert.rejects(()=>svc.sendPreparedAction(f.client,f.wallet,f.action,f.getCurrent),/potential broadcast/);await assert.rejects(()=>svc.sendPreparedAction(f.client,f.wallet,f.action,f.getCurrent),/unresolved/);assert.equal(f.sends().length,1);});
await probe('explicit wallet rejection: code 4001 releases request lease',async()=>{const f=await prep();f.state.onSend=()=>{throw Object.assign(new Error('denied'),{code:4001});};await assert.rejects(()=>svc.sendPreparedAction(f.client,f.wallet,f.action,f.getCurrent),/denied/);f.state.onSend=null;await svc.sendPreparedAction(f.client,f.wallet,f.action,f.getCurrent);assert.equal(f.sends().length,2);});
await probe('returned hash retained after context disappears and storage quota fails',async()=>{const f=await prep();storageThrows=true;f.state.onSend=()=>{f.state.current=null;return f.hash;};try {await svc.sendPreparedAction(f.client,f.wallet,f.action,f.getCurrent); assert.ok(registry.getSubmissions().some(x=>x.hash===f.hash));assert.doesNotThrow(()=>svc.rememberPaymentHash(f.invoiceId,f.hash));}finally{storageThrows=false;}});
await probe('case-insensitive payment lease and hash deduplication',()=>{const id=`0x${'aBcD'.repeat(16)}` as Hex,h=`0x${'abCd'.repeat(16)}` as Hex,acct=nextAccount();const lease=registry.beginSubmission('pay',acct,id);assert.throws(()=>registry.beginSubmission('pay',nextAccount(),id.toLowerCase() as Hex));lease.finish();registry.recordSubmission({hash:h,kind:'pay',account:acct,invoiceId:id,state:'submitted'});registry.recordSubmission({hash:h.toLowerCase() as Hex,kind:'pay',account:acct,invoiceId:id.toLowerCase() as Hex,state:'submitted'});assert.equal(registry.getSubmissions().filter(x=>x.hash===h.toLowerCase()).length,1);});
await probe('retention: every unresolved hash survives 60 completed insertions',()=>{const hashes:Hex[]=[];for(let i=0;i<60;i++){const h=nextHash();hashes.push(h);registry.recordSubmission({hash:h,kind:'pay',account:nextAccount(),invoiceId:nextHash(),state:'submitted'});}for(let i=0;i<60;i++)registry.recordSubmission({hash:nextHash(),kind:'create',account:nextAccount(),state:'included'});assert.ok(hashes.every(h=>registry.getSubmissions().some(x=>x.hash===h)));assert.ok(registry.getSubmissions().filter(x=>x.state!=='submitted').length<=20);});
await probe('receipt: coherent fixture remains UNVERIFIED_ARC_EVIDENCE / verified false',async()=>{const f=paymentEvidence(fixture());const out=await svc.verifyTestnetReceipt(f.client,f.invoiceId,f.hash);assert.equal(out.result.status,'UNVERIFIED_ARC_EVIDENCE');assert.equal(out.result.verified,false);assert.equal(out.result.paymentLogIndex,2);});
for(const [name,mutate] of [
 ['receipt replacement',(f:any)=>{f.state.receipt.transactionHash=nextHash();}], ['transaction replacement',(f:any)=>{f.state.tx.hash=nextHash();}],
 ['receipt sender',(f:any)=>{f.state.receipt.from=nextAccount();}], ['transaction sender',(f:any)=>{f.state.tx.from=nextAccount();}],
 ['receipt target',(f:any)=>{f.state.receipt.to=nextAccount();}], ['transaction target',(f:any)=>{f.state.tx.to=nextAccount();}],
 ['transaction chain',(f:any)=>{f.state.tx.chainId=5042;}], ['transaction value',(f:any)=>{f.state.tx.value+=1n;}],
 ['transaction invoice',(f:any)=>{f.state.tx.input=encodeFunctionData({abi:ARCPROOF_ABI,functionName:'payInvoice',args:[nextHash()]});}],
 ['event transaction hash',(f:any)=>{f.state.receipt.logs[0].transactionHash=nextHash();}],
 ['event duplicate',(f:any)=>{f.state.receipt.logs.push({...f.state.receipt.logs[0]});}], ['event sender',(f:any)=>{f.state.receipt.logs[0].topics[2]=nextHash();}],
 ['event amount',(f:any)=>{f.state.receipt.logs[0].data=encodeAbiParameters([{type:'uint256'}],[1n]);}], ['event malformed',(f:any)=>{f.state.receipt.logs[0].data='0x01';}],
 ['event invalid log index',(f:any)=>{f.state.receipt.logs[0].logIndex=-1;}], ['receipt block hash',(f:any)=>{f.state.receipt.blockHash=nextHash();}],
 ['invoice paid block',(f:any)=>{f.invoice.paidBlockNumber=501n;}], ['invoice paid time',(f:any)=>{f.invoice.paidAt+=1n;}],
 ['reverted receipt',(f:any)=>{f.state.receipt.status='reverted';}],
 ] as const) await probe(`receipt: rejects mismatched ${name}`,async()=>{const f=paymentEvidence(fixture());mutate(f);const out=await svc.verifyTestnetReceipt(f.client,f.invoiceId,f.hash);assert.notEqual(out.result.status,'UNVERIFIED_ARC_EVIDENCE');assert.equal(out.result.verified,false);});
await probe('receipt recovery: queries exactly paid block and bound invoice; rejects multiple results',async()=>{const f=paymentEvidence(fixture());await svc.verifyTestnetReceipt(f.client,f.invoiceId);const query=f.state.calls.find((x:any)=>x.method==='getContractEvents').args;assert.equal(query.fromBlock,500n);assert.equal(query.toBlock,500n);assert.equal(query.args.invoiceId,f.invoiceId);assert.equal(query.address,TESTNET_DEPLOYMENT.contractAddress);f.state.logs=[...f.state.logs,...f.state.logs];await assert.rejects(()=>svc.verifyTestnetReceipt(f.client,f.invoiceId),/Exactly one/);});
await probe('receipt export: returned invoice is the same read snapshot checked by verifier',async()=>{const f=paymentEvidence(fixture());const original=f.client.readContract;f.client.readContract=async(args:any)=>{const row=await original(args);return {...row,expiresAt:row.expiresAt+BigInt(f.state.readNumber)};};const out=await svc.verifyTestnetReceipt(f.client,f.invoiceId,f.hash);assert.equal(f.state.readNumber,2);assert.equal(out.invoice.expiresAt,f.invoice.expiresAt+2n);assert.equal(out.result.status,'UNVERIFIED_ARC_EVIDENCE');});
await probe('saved receipt: reconciliation binds exact transaction/function/invoice without signing',async()=>{const f=paymentEvidence(fixture());const row:any={hash:f.hash,kind:'pay',invoiceId:f.invoiceId,account:f.account,state:'submitted'};registry.recordSubmission(row);assert.equal(await svc.reconcileSubmission(f.client,row),'included');assert.equal(f.sends().length,0);assert.equal(registry.getSubmissions().find(x=>x.hash===f.hash)?.state,'included');assert.throws(()=>registry.beginSubmission('pay',f.account,f.invoiceId));});
for(const [name,mutate] of [
 ['receipt hash',(f:any)=>{f.state.receipt.transactionHash=nextHash();}], ['transaction hash',(f:any)=>{f.state.tx.hash=nextHash();}],
 ['sender',(f:any)=>{f.state.tx.from=nextAccount();}], ['target',(f:any)=>{f.state.receipt.to=nextAccount();}], ['chain',(f:any)=>{f.state.tx.chainId=5042;}],
 ['invoice',(f:any)=>{f.state.tx.input=encodeFunctionData({abi:ARCPROOF_ABI,functionName:'payInvoice',args:[nextHash()]});}],
 ['function',(f:any)=>{f.state.tx.input=encodeFunctionData({abi:ARCPROOF_ABI,functionName:'createInvoice',args:[1n,1n,ZERO_TERMS]});}],
 ] as const) await probe(`saved receipt: refuses mismatched ${name}`,async()=>{const f=paymentEvidence(fixture());const row:any={hash:f.hash,kind:'pay',invoiceId:f.invoiceId,account:f.account,state:'submitted'};registry.recordSubmission(row);mutate(f);await assert.rejects(()=>svc.reconcileSubmission(f.client,row));assert.equal(registry.getSubmissions().find(x=>x.hash===f.hash)?.state,'submitted');assert.equal(f.sends().length,0);});
await probe('saved receipt: explicit reverted receipt releases repeat-payment registry lock',async()=>{const f=paymentEvidence(fixture());f.state.receipt.status='reverted';const row:any={hash:f.hash,kind:'pay',invoiceId:f.invoiceId,account:f.account,state:'submitted'};registry.recordSubmission(row);assert.equal(await svc.reconcileSubmission(f.client,row),'reverted');registry.beginSubmission('pay',f.account,f.invoiceId).finish();});
// Explicit independent adversarial requirements, not inherited assertions.
for(const [name,mutate] of [
 ['log blockHash',(f:any)=>{f.state.receipt.logs[0].blockHash=nextHash();}],
 ['log blockNumber',(f:any)=>{f.state.receipt.logs[0].blockNumber=999n;}],
 ['removed log',(f:any)=>{f.state.receipt.logs[0].removed=true;}],
 ] as const) await probe(`receipt: fails closed on inconsistent ${name}`,async()=>{const f=paymentEvidence(fixture());mutate(f);const out=await svc.verifyTestnetReceipt(f.client,f.invoiceId,f.hash);assert.notEqual(out.result.status,'UNVERIFIED_ARC_EVIDENCE','inconsistent log must not be described as all standard checks passing');});
function createEvidence(f:Awaited<ReturnType<typeof prep>>) {
 const nonce=0n,id=deriveInvoiceId(5042002,TESTNET_DEPLOYMENT.contractAddress,f.account,nonce);
 Object.assign(f.invoice,{invoiceId:id,merchant:f.account,amountNative:f.action.amountNative,expiresAt:f.action.expiresAt,termsHash:ZERO_TERMS});
 f.state.tx={hash:f.hash,from:f.account,to:f.action.to,input:f.action.data,value:0n,chainId:5042002};
 f.state.receipt={transactionHash:f.hash,from:f.account,to:f.action.to,status:'success',blockNumber:500n,blockHash:f.blockHash,transactionIndex:0,logs:[{address:f.action.to,topics:encodeEventTopics({abi:ARCPROOF_ABI,eventName:'InvoiceCreated',args:{invoiceId:id,merchant:f.account}}),data:encodeAbiParameters([{type:'uint256'},{type:'uint256'},{type:'uint64'},{type:'bytes32'}],[nonce,f.action.amountNative,f.action.expiresAt,ZERO_TERMS]),logIndex:0,transactionHash:f.hash,blockHash:f.blockHash,blockNumber:500n,removed:false}]};
 return f;
}
await probe('creation read-back: binds transaction, exact event, derived ID and immutable terms',async()=>{const f=createEvidence(await prep('create'));const out=await svc.readCreatedInvoice(f.client,f.action,f.hash);assert.equal(out.invoiceId,f.invoice.invoiceId);assert.equal(out.merchant,f.account);});
for(const [name,mutate] of [
 ['replaced receipt',(f:any)=>{f.state.receipt.transactionHash=nextHash();}], ['replaced transaction',(f:any)=>{f.state.tx.hash=nextHash();}],
 ['wrong transaction input',(f:any)=>{f.state.tx.input='0x1234';}], ['wrong transaction value',(f:any)=>{f.state.tx.value=1n;}],
 ['wrong transaction sender',(f:any)=>{f.state.tx.from=nextAccount();}], ['wrong transaction chain',(f:any)=>{f.state.tx.chainId=5042;}],
 ['wrong event transaction',(f:any)=>{f.state.receipt.logs[0].transactionHash=nextHash();}], ['wrong event blockHash',(f:any)=>{f.state.receipt.logs[0].blockHash=nextHash();}],
 ['wrong event blockNumber',(f:any)=>{f.state.receipt.logs[0].blockNumber=501n;}], ['duplicate creation event',(f:any)=>{f.state.receipt.logs.push({...f.state.receipt.logs[0]});}],
 ['changed read-back terms',(f:any)=>{f.invoice.amountNative=1n*10n**18n;}], ['removed creation log',(f:any)=>{f.state.receipt.logs[0].removed=true;}],
 ] as const) await probe(`creation read-back: rejects ${name}`,async()=>{const f=createEvidence(await prep('create'));mutate(f);await assert.rejects(()=>svc.readCreatedInvoice(f.client,f.action,f.hash));});
await probe('network isolation: no global fetch attempted',()=>assert.equal(networkAttempts,0));
const paths=['src/arcproof/testnet.ts','src/arcproof/testnetClient.ts','src/arcproof/useTestnetWallet.ts','src/arcproof/submissions.ts','src/arcproof/preparedPayment.ts','src/arcproof/receiptVerifier.ts','src/arcproof/manifest.ts','src/arcproof/arcproofAbi.ts','src/arcproof/exportUtils.ts','src/components/arcproof/TestnetScreens.tsx','src/App.tsx','src/config.ts','evidence/g1/ArcProofInvoices.artifact.json','qa/new-independent-review/service-probes.ts'];
const hashes=Object.fromEntries(paths.filter(p=>fs.existsSync(p)).map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const report={candidate:'NEW reconstructed candidate; no prior test claims inherited',runAtExecutorClock:new Date().toISOString(),executorClockNote:"Executor wall clock was observed approximately nine hours ahead of authoritative clock tool. Do not treat it as authoritative UTC.",scope:'injected offline mocks only; not actual browser, wallet, RPC, payment, finality or audit evidence',networkAttempts,passed:results.filter(x=>x.status==='passed').length,failed:results.filter(x=>x.status==='failed').length,results,sha256:hashes};
fs.writeFileSync('qa/new-independent-review/service-probes-results.json',JSON.stringify(report,null,2)+'\n');
console.log(`RESULT ${report.passed} passed; ${report.failed} failed; ${networkAttempts} network attempts`);
process.exitCode=report.failed?1:0;
