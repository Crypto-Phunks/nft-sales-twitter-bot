import { Log, TransactionResponse, ethers } from "ethers";
import { LogParser } from "./parser.definition";

export class NotLarvaLabsParser implements LogParser {
    
    platform: string = 'notlarvalabs';
    
    parseLogs(transaction:TransactionResponse, logs: Log[], tokenId: string): number {
        const result = logs.map((log: any) => {
          if (log.topics[0].toLowerCase() === '0x975c7be5322a86cddffed1e3e0e55471a764ac2764d25176ceb8e17feef9392c') {
            const relevantData = log.data.substring(2);
            if (tokenId !== parseInt(log.topics[1], 16).toString()) {
              return
            }
            return BigInt(`0x${relevantData}`) / BigInt('1000000000000000')
          }
        }).filter(n => n !== undefined)
        if (result.length) {
          return parseFloat(result[0].toString())/1000;
        }
        return undefined
    }

}