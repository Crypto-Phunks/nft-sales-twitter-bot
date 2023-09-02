import { Log, TransactionResponse, ethers } from "ethers";
import { LogParser } from "./parser.definition";
import { config } from "../config";

const cargoTopicIdentifier = '0x5535fa724c02f50c6fb4300412f937dbcdf655b0ebd4ecaca9a0d377d0c0d9cc'

export class CargoParser implements LogParser {
    
    platform: string = 'cargo';
    
    async parseLogs(transaction:TransactionResponse, logs: Log[], tokenId: string): Promise<number> {
        const result = logs.map((log: any) => {
          if (log.topics[0] === cargoTopicIdentifier) {
            // cargo sale
            const data = log.data.substring(2);
            const dataSlices = data.match(/.{1,64}/g);
            const amount = BigInt(`0x${dataSlices[15]}`);
            const saleTokenId = `${parseInt(dataSlices[10], 16)}`;
            const commission = BigInt(`0x${dataSlices[16]}`)

            if (saleTokenId === tokenId)
              return amount + commission
          }
          return undefined
        }).filter(r => r !== undefined)
        if (result.length) {
          return (parseFloat((result[0] / BigInt('10000000000000000')).toString())/100)
        }
        return undefined
    }

}