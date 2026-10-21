"""Single anonymous official mainnet metadata probe. No keys/accounts/signing."""
import json,datetime,urllib.request,urllib.error,pathlib
p=pathlib.Path(__file__).parent
url='https://rpc.mainnet.arc.io'
request=[{'jsonrpc':'2.0','id':'chain-id','method':'eth_chainId','params':[]},{'jsonrpc':'2.0','id':'finalized-header','method':'eth_getBlockByNumber','params':['finalized',False]}]
record={'source':url,'documentation':'https://docs.arc.io/arc/references/rpc-endpoints.md','startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'request':request,'scope':'Single mainnet metadata batch, distinct from prior testnet verification. No transactions or account reads.'}
try:
 r=urllib.request.urlopen(urllib.request.Request(url,data=json.dumps(request).encode(),headers={'Content-Type':'application/json'}),timeout=20)
 record.update(httpStatus=r.status,response=json.loads(r.read()))
except urllib.error.HTTPError as e:record.update(httpStatus=e.code,error=str(e),body=e.read().decode())
except Exception as e:record['error']=str(e)
record['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
(p/'raw-probe.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record,indent=2))
