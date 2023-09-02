import { Log, TransactionResponse, ethers } from "ethers";
import { LogParser } from "./parser.definition";
import { config } from "../config";
import blurABI from '../abi/blur.json';

const blurContractAddress = '0x000000000000ad05ccc4f10045630fb830b95127';
const blurInterface = new ethers.Interface(blurABI);

export class BlurIOBasicParser implements LogParser {
    
    platform: string = 'blurio';
    
    async parseLogs(transaction:TransactionResponse, logs: Log[], tokenId: string): Promise<number> {
        const result = logs.map((log: any) => {
          if (log.address.toLowerCase() === blurContractAddress.toLowerCase()) {  
            return blurInterface.parseLog(log);
          }
        }).filter(l => l?.name === 'OrdersMatched' && l?.args.buy.tokenId.toString() === tokenId)
        if (result.length) {
          const weiValue = (result[0]?.args?.buy.price)?.toString();
          const value = ethers.formatEther(weiValue);
          return parseFloat(value);          
        }
        return undefined
    }

}