import { Log, TransactionResponse, ethers } from "ethers";
import { LogParser } from "./parser.definition";
import { config } from "../config";
import openseaSeaportABI from '../abi/seaportABI.json';
import { createLogger } from "../logging.utils";

const seaportInterface = new ethers.Interface(openseaSeaportABI)
const logger = createLogger('openseaseaport.parser')

export class OpenSeaSeaportParser implements LogParser {
    
    platform: string = 'opensea';
    
    parseLogs(transaction:TransactionResponse, logs: Log[], tokenId: string): number {
        const result = logs.map((log: any) => {
          if (log.topics[0].toLowerCase() === '0x9d9af8e38d66c62e2c12f0225249fd9d721c54b83f48d9352c97c6cacdcb6f31') {

            const logDescription = seaportInterface.parseLog(log);
            
            if (logDescription.args.offer.filter( o => o.identifier.toString() !== '0').length && 
                logDescription.args.consideration.filter( o => o.identifier.toString() !== '0').length) {
              // complex opensea trade detected, ignore
              logger.info(`complex opensea trade detected for ${transaction.hash} log ${log.index}, ignoring...`)
              return
            }
                        
            const matchingOffers = logDescription.args.offer.filter(
              o => o.identifier.toString() === tokenId || 
              o.identifier.toString() === '0');
            
            const tokenCount = logDescription.args.offer.length;
            
            if (matchingOffers.length === 0) {
              return
            }
            let amounts = logDescription.args.consideration.map(c => BigInt(c.amount))
            // add weth
            const wethOffers = matchingOffers.map(o => o.token === '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' && o.amount > 0 ? BigInt(o.amount) : BigInt(0));
            if (wethOffers.length > 0 && wethOffers[0] != BigInt(0)) {
              amounts = wethOffers
            }
            const amount = amounts.reduce((previous,current) => previous + current, BigInt(0))
            return amount / BigInt('1000000000000000') / BigInt(tokenCount)
          }
        }).filter(n => n !== undefined)  
        if (result.length) return parseFloat(result.reduce((previous,current) => previous + current, BigInt(0)).toString())/1000;
        return undefined
    }

}