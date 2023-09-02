import { AbiCoder, JsonRpcProvider, Log, TransactionResponse, ethers } from "ethers";
import { LogParser } from "./parser.definition";
import { config } from "../config";
import blurABI from '../abi/blur.json';
import { Alchemy, DebugTracerType, Network } from 'alchemy-sdk'


console.log(process.env.GETH_NODE_ENDPOINT_HTTP)
console.log(process.env.GETH_NODE_ENDPOINT)

const provider = (global.providerForceHTTPS ? 
  ethers.getDefaultProvider(process.env.GETH_NODE_ENDPOINT_HTTP) :
  ethers.getDefaultProvider(process.env.GETH_NODE_ENDPOINT)) as JsonRpcProvider;

const blurMarketplaceAddress = '0x39da41747a83aeE658334415666f3EF92DD0D541';
const blurBiddingContractAddress = '0x0000000000a39bb272e79075ade125fd351887ac';
const blurSalesContractAddressV2 = '0x39da41747a83aeE658334415666f3EF92DD0D541';
const blurSalesContractAddressV3 = '0xb2ecfe4e4d61f8790bbb9de2d1259b9e2410cea5';

export class BlurIOSweepParser implements LogParser {

    platform: string = 'blurio';
    
    async parseLogs(transaction:TransactionResponse, logs: Log[], tokenId: string): Promise<number> {
        
      const result = (transaction.to.toLowerCase() != blurSalesContractAddressV3.toLowerCase() && 
          transaction.to.toLowerCase() != blurSalesContractAddressV2.toLowerCase() && 
          transaction.to.toLowerCase() != blurMarketplaceAddress.toLowerCase()) ? [] :
          logs.filter(l => l.address.toLowerCase() === blurSalesContractAddressV3.toLowerCase() ||
            l.address.toLowerCase() === blurSalesContractAddressV2.toLowerCase())

        if (result.length) {
          // if we're here, we weren't able to get the exact price, determinate it 
          // using the overall price and the ether spent in tx
          // the only way to get an accurate result would be to run an EVM to track
          // internal txs
          const count = logs
            .filter(l => l.address.toLowerCase() === config.contract_address.toLowerCase() && 
              l.topics[0].toLowerCase() === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef').length

          // look for blur.io custom ERC20 token if the ether amount is empty
          const { value } = transaction;
        
          const l = logs.filter(l => l.address.toLowerCase() === blurBiddingContractAddress.toLowerCase())
            .reduce((previous, current) => {
              const relevantData = current.data.substring(2);
              const relevantDataSlice = relevantData.match(/.{1,64}/g);
              const value = BigInt(`0x${relevantDataSlice[0]}`);
              return previous + value
            }, BigInt(0))
          
          // add it all inner transactions targetting the seller 
            
          /*
          try {
            const settings = {
              apiKey: process.env.ALCHEMY_API_KEY ?? 'demo', 
              network: Network.ETH_MAINNET, // Replace with your network.
            };
            
            // Creating a new Alchemy instance to interact with the Alchemy APIs
            const alchemy = new Alchemy(settings);
            let txTrace = await alchemy.debug.traceTransaction(transaction.hash, {
              type: DebugTracerType.CALL_TRACER,
            });
            console.log(txTrace)
          } catch (error) {
            console.log(error)
          }
          */
          const r = await provider.send("debug_traceTransaction", 
              ['0x3fac854179691e377fc1aa180b71a4033b6bb3bde2a7ef00bc8e78f849ad356e', {
                tracer: 'callTracer'
              }])

          console.log(r)
          console.log(r)
        
          const ether = (parseFloat((l / BigInt('10000000000000000')).toString())/100).toString()
          return parseFloat(ether)/count          
        }
        return undefined
    }

}