import { JsonRpcProvider, Network, ethers } from "ethers";

process.env['NODE_TLS_REJECT_UNAUTHORIZED']='0'
const provider = ethers.getDefaultProvider("https://geth.ef3aaeddd3281ebe.dyndns.dappnode.io") as JsonRpcProvider;


  provider.send("debug_traceTransaction", 
  ['0x28b859639993604a9b6c060deddede3e63c396134640cd03a6373fdc6bb8a6eb', {
    tracer: 'callTracer'
  }]).then(r => console.log(r))