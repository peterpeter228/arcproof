import urllib.request,json,datetime,pathlib
p=pathlib.Path(__file__).parent
url='https://rpc.testnet.arc.io'
tx='0x0987c87540b6701be5fe047c55a7ac1b9277fda7dd989f31c8ea3ccd25350ace'
contract='0x3Dcd2bDD924BCC384Cb39e9e12038e00fde0FA30'
def call(name,method,params):
 payload={'jsonrpc':'2.0','id':name,'method':method,'params':params}; rec={'source':url,'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'request':payload}
 try:
  r=urllib.request.urlopen(urllib.request.Request(url,data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'}),timeout=25)
  rec.update(httpStatus=r.status,response=json.loads(r.read()),responseHeaders=dict(r.headers))
 except Exception as e:rec['error']=str(e)
 rec['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();(p/(name+'.json')).write_text(json.dumps(rec,indent=2));print(name,rec.get('error') or str(rec.get('response'))[:160],flush=True)
 return rec.get('response',{}).get('result')
chain=call('chain-id','eth_chainId',[])
t=call('payment-transaction','eth_getTransactionByHash',[tx])
r=call('payment-receipt','eth_getTransactionReceipt',[tx])
code=call('runtime','eth_getCode',[contract,'latest'])
d=call('deployment-receipt','eth_getTransactionReceipt',['0x2e43459e213e993b2290749e5549f993d63db1af6e1d8feab2fcca94917db535'])
if r:call('payment-block','eth_getBlockByNumber',[r['blockNumber'],False])
f=call('finalized-block','eth_getBlockByNumber',['finalized',False])
if f:call('finalized-block-by-number','eth_getBlockByNumber',[f['number'],False])
if r:call('payment-block-recheck','eth_getBlockByNumber',[r['blockNumber'],False])
