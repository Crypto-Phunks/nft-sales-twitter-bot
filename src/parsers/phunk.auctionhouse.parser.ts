import { Log, TransactionResponse, ethers } from "ethers";
import { LogParser } from "./parser.definition";
import { config } from "../config";
import phunkAuctionHouse from '../abi/phunkAuctionHouse.json';

const auctionHouseContract = '0x0e7f7d8007c0fccac2a813a25f205b9030697856';
const auctionHouseInterface = new ethers.Interface(phunkAuctionHouse);

export class PhunkAuctionHouseParser implements LogParser {
    
    platform: string = 'phunkauctionhouse';
    
    parseLogs(transaction:TransactionResponse, logs: Log[], tokenId: string): number {
        const result = logs.map((log: any) => {
          if (log.address.toLowerCase() === auctionHouseContract.toLowerCase() 
            && parseInt(log.topics[1], 16).toString() === tokenId) {  
            return auctionHouseInterface.parseLog(log);
          }
        }).filter(l => l?.name === 'AuctionSettled')
        if (result.length) {
          const weiValue = (result[0]?.args?.amount)?.toString();
          const value = ethers.formatEther(weiValue);
          return parseFloat(value);          
        }        
        return undefined
    }

}