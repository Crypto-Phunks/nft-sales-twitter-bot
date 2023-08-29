import { Log, TransactionResponse, ethers } from "ethers";
import { LogParser } from "./parser.definition";
import nftxABI from '../abi/nftxABI.json';
import { config } from "../config";

const nftxInterface = new ethers.Interface(nftxABI);

export class NFTXParser implements LogParser {
    
    platform: string = 'nftx';
    
    parseLogs(transaction:TransactionResponse, logs: Log[], tokenId: string): number {
        const result = logs.map((log: any) => {

          // direct buy from vault
          if (log.topics[0].toLowerCase() === '0x1cdb5ee3c47e1a706ac452b89698e5e3f2ff4f835ca72dde8936d0f4fcf37d81') {  
            const relevantData = log.data.substring(2);
            const relevantDataSlice = relevantData.match(/.{1,64}/g);
            return BigInt(`0x${relevantDataSlice[1]}`) / BigInt('1000000000000000');
          } else if (log.topics[0].toLowerCase() === '0x63b13f6307f284441e029836b0c22eb91eb62a7ad555670061157930ce884f4e') {
            const parsedLog = nftxInterface.parseLog(log)
            
            // check that the current transfer is NFTX related
            if (!parsedLog.args.nftIds.filter(n => BigInt(n).toString() === tokenId).length) {
              return
            }
            
            // redeem, find corresponding token bought
            const swaps = logs.filter((log2: any) => log2.topics[0].toLowerCase() === '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822')
              .map(b => {
                const relevantData = b.data.substring(2);
                const relevantDataSlice = relevantData.match(/.{1,64}/g);
                const moneyIn = BigInt(`0x${relevantDataSlice[0]}`)
                if (moneyIn > BigInt(0))
                  return moneyIn / BigInt('1000000000000000');
                else {
                  const moneyIn2 = BigInt(`0x${relevantDataSlice[1]}`)
                  return moneyIn2 / BigInt('1000000000000000');
                }
              })
            if (swaps.length) return swaps.reduce((previous, current) => previous + current, BigInt(0))
          }
        }).filter(n => n !== undefined)

        if (result.length) {
          // find the number of token transferred to adjust amount per token
          const redeemLog = logs.filter((log: any) => log.topics[0].toLowerCase() === '0x63b13f6307f284441e029836b0c22eb91eb62a7ad555670061157930ce884f4e')[0] as any
          let tokenCount = 1
          if (redeemLog) {
            const parsedLog = nftxInterface.parseLog(redeemLog)
            tokenCount = Math.max(parsedLog.args.nftIds.length, 1)
          } else {
            // count the number of tokens transfered
            tokenCount = logs
              .filter(l => l.address.toLowerCase() === config.contract_address.toLowerCase() && 
                l.topics[0].toLowerCase() === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef')
                .map(l => l.topics[3])
                // take unique value
                .filter((value, index, array) => array.indexOf(value) === index)
                .length
          }
          return parseFloat(result[0].toString())/tokenCount/1000;
        }
        return undefined
    }

}