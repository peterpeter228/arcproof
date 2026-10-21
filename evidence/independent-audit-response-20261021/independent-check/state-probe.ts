// Independent offline module probe. Synthetic storage and Web Locks; no wallet/RPC.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { memoryStorage, memoryLocks } from '../../../src/arcproof/__tests__/fixtures/safeBrowser';
import { ARC_TESTNET, TESTNET_DEPLOYMENT } from '../../../src/arcproof/testnet';
import { parseHash } from '../../../src/arcproof/routes';
import { resolveDeployment } from '../../../src/arcproof/manifest';
import { TESTNET_MANIFEST } from '../../../src/arcproof/testnet';
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:memoryStorage()});
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:memoryLocks()}});
const m = await import('../../../src/arcproof/walletIntents');
const hash = `0x${'a'.repeat(64)}` as const;
const account = `0x${'1'.repeat(40)}` as const;
const prefix = `arcproof:${ARC_TESTNET.id}:${TESTNET_DEPLOYMENT.deploymentId}:intent:`;
const operationId='11111111-1111-4111-8111-111111111111';
let checks=0;
for(const kind of ['pay','create'] as const) for(const state of ['requesting','uncertain','submitted'] as const) {
 localStorage.clear();
 const input={chainId:ARC_TESTNET.id,deploymentId:TESTNET_DEPLOYMENT.deploymentId,kind,account,invoiceId:hash,to:TESTNET_DEPLOYMENT.contractAddress,data:'0x1234' as const,value:'1'};
 const saved={...input,operationId,state};
 localStorage.setItem(prefix+operationId,JSON.stringify(saved));
 let validations=0,sends=0;
 await assert.rejects(m.recoverWalletIntent(operationId,hash,async()=>{validations++;return 'included'}),/hashless/);
 assert.equal(validations,0); assert.deepEqual(JSON.parse(localStorage.getItem(prefix+operationId)!),saved);
 await assert.rejects(m.runWalletIntent({...input, account:kind==='pay'?`0x${'2'.repeat(40)}`:account,invoiceId:`0x${'A'.repeat(64)}`},async()=>{sends++;return hash}),/unresolved/);
 assert.equal(sends,0); checks++;
}
for(const outcome of ['included','reverted'] as const) {
 localStorage.clear();
 const saved={chainId:ARC_TESTNET.id,deploymentId:TESTNET_DEPLOYMENT.deploymentId,kind:'pay' as const,account,invoiceId:hash,to:TESTNET_DEPLOYMENT.contractAddress,data:'0x1234' as const,value:'1',operationId,state:'submitted',hash};
 localStorage.setItem(prefix+operationId,JSON.stringify(saved));
 await assert.rejects(m.recoverWalletIntent(operationId,hash,async()=>{throw Error('RPC uncertainty')}),/RPC uncertainty/);
 assert.deepEqual(JSON.parse(localStorage.getItem(prefix+operationId)!),saved);
 assert.equal(await m.recoverWalletIntent(operationId,`0x${'A'.repeat(64)}`,async()=>outcome),outcome);
 assert.equal(JSON.parse(localStorage.getItem(prefix+operationId)!).state,outcome); checks++;
}
const invalidChains=['','NaN','undefined','5042002garbage','5042002.0','5.042002e6','0x4cef52','+5042002','-5042002',' 5042002','5042002%00','9007199254740993'];
for(const chain of invalidChains) {
 const r=parseHash(`#/receipt/${chain}/${TESTNET_DEPLOYMENT.deploymentId}/${hash}`);
 assert.equal(resolveDeployment(TESTNET_MANIFEST,r.chainId!,r.deploymentId!),null,chain); checks++;
}
console.log(JSON.stringify({status:'passed',checks,scope:'Actual modules with synthetic storage and lock primitives; no real browser, wallet, chain, external network, or paid model.',sources:Object.fromEntries(['src/arcproof/walletIntents.ts','src/arcproof/routes.ts','src/arcproof/manifest.ts'].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]))},null,2));
