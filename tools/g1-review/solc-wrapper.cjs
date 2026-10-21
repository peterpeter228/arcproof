#!/usr/bin/env node
// Dynamic import preserves this CommonJS command-line entrypoint without require.
async function main() {
const { default: solc } = await import('solc');
if(process.argv.includes('--version')) { console.log('solc, the solidity compiler commandline interface\nVersion: '+solc.version()); }
else if(process.argv.includes('--standard-json')) { let data=''; process.stdin.setEncoding('utf8'); process.stdin.on('data',x=>data+=x); process.stdin.on('end',()=>process.stdout.write(solc.compile(data))); }
else {console.error('Unsupported solc wrapper args');process.exitCode=1;}

}
main().catch(error => { console.error(error); process.exitCode = 1; });
