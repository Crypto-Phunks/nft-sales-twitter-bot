import { Log, TransactionResponse, ethers } from "ethers";
import { LogParser } from "./parser.definition";
import { config } from "../config";
import openseaWyvernABI from '../abi/opensea_wyvern.json';

const openseaWyvernInterface = new ethers.Interface(openseaWyvernABI);

export class OpenSeaWyvernParser implements LogParser {
    
    platform: string = 'opensea';
    
    async parseLogs(transaction:TransactionResponse, logs: Log[], tokenId: string): Promise<number> {
        const result = logs.map((log: any) => {
            if (log.topics[0].toLowerCase() === '0xc4109843e0b7d514e4c093114b863f8e7d8d9a458c372cd51bfe526b588006c9') {
              const logDescription = openseaWyvernInterface.parseLog(log);
              const price = logDescription.args.price
              const tokenCount = logs
                .filter(l => l.address.toLowerCase() === config.contract_address.toLowerCase() && 
                  l.topics[0].toLowerCase() === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef')
                  .map(l => l.topics[3])
                  // take unique value
                  .filter((value, index, array) => array.indexOf(value) === index)
                  .length
              return ethers.formatEther(price / BigInt(tokenCount));
            }
          }).filter(n => n !== undefined)
        if (result.length) return parseFloat(result[0])
        return undefined
    }

}