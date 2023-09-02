import { Log, TransactionResponse, ethers } from "ethers";
import { LogParser } from "./parser.definition";
import { config } from "../config";
import looksRareABI from '../abi/looksRareABI.json';

const looksInterface = new ethers.Interface(looksRareABI);
const looksRareContractAddress = '0x59728544b08ab483533076417fbbb2fd0b17ce3a'; // Don't change unless deprecated

export class LooksRareParser implements LogParser {
    
    platform: string = 'looksrare';
    
    async parseLogs(transaction:TransactionResponse, logs: Log[], tokenId: string): Promise<number> {
        const result = logs.map((log: any) => {
          if (log.address.toLowerCase() === looksRareContractAddress.toLowerCase()) {  
            return looksInterface.parseLog(log);
          }
        }).filter((log: any) => (log?.name === 'TakerAsk' || log?.name === 'TakerBid') &&
          log?.args.tokenId == tokenId);
        if (result.length) {
          const weiValue = (result[0]?.args?.price)?.toString();
          const value = ethers.formatEther(weiValue);
          return parseFloat(value)
        }
        return undefined
    }

}