import { Log, TransactionResponse, ethers } from "ethers";
import { LogParser } from "./parser.definition";
import { config } from "../config";
import phunkAuctionFlywheel from '../abi/phunkAuctionFlywheel.json';

const flywheelContract = '0x86B525AB8c5c9B8852F3A1BC79376335bCD2f962';
const flywheelInterface = new ethers.Interface(phunkAuctionFlywheel);

export class PhunkFlywheelParser implements LogParser {
    
    platform: string = 'phunkflywheel';
    
    parseLogs(transaction:TransactionResponse, logs: Log[], tokenId: string): number {
        const result = logs.map((log: any) => {
          if (log.address.toLowerCase() === flywheelContract.toLowerCase()) {  
            return flywheelInterface.parseLog(log);
          }
        }).filter(l => l?.name === 'PhunkSoldViaSignature' && l?.args.phunkId.toString() === tokenId)
        if (result.length) {
          const weiValue = (result[0]?.args?.minSalePrice)?.toString();
          const value = ethers.formatEther(weiValue);
          return parseFloat(value);          
        }        
        return undefined
    }

}