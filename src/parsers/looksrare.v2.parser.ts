import { Log, TransactionResponse, ethers } from "ethers";
import { LogParser } from "./parser.definition";
import looksRareABIv2 from '../abi/looksRareABIv2.json';

const looksRareContractAddressV2 = '0x0000000000e655fae4d56241588680f86e3b2377'; // Don't change unless deprecated
const looksInterfaceV2 = new ethers.Interface(looksRareABIv2);

export class LooksRareV2Parser implements LogParser {
    
    platform: string = 'looksrare';
    
    parseLogs(transaction:TransactionResponse, logs: Log[], tokenId: string): number {
        const result = logs.map((log: any) => {
            if (log.address.toLowerCase() === looksRareContractAddressV2.toLowerCase()) {  
              return looksInterfaceV2.parseLog(log);
            }
          })
          .filter(log => log !== undefined)
          .filter((log: any) => {
            return (log?.name === 'TakerAsk' || log?.name === 'TakerBid') &&
            log?.args.itemIds.map(i => i.toString()).indexOf(tokenId) > -1
          });
        if (result.length) {
          const weiValue = (result[0]?.args?.feeAmounts[0])?.toString();
          const value = ethers.formatEther(weiValue);
          return parseFloat(value)
        }
        return undefined
    }

}