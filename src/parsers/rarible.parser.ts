import { Log, TransactionResponse, ethers } from "ethers";
import { LogParser } from "./parser.definition";
import { config } from "../config";
import looksRareABI from '../abi/looksRareABI.json';

const raribleTopicIdentifier = '0x268820db288a211986b26a8fda86b1e0046281b21206936bb0e61c67b5c79ef4'

export class RaribleParser implements LogParser {
    
    platform: string = 'rarible';
    
    parseLogs(transaction:TransactionResponse, logs: Log[], tokenId: string): number {
        const result = logs.map((log: any) => {
          if (log.topics[0] === raribleTopicIdentifier ) {
            const nftData = log.data.substring(2);
            const nftDataSlices = nftData.match(/.{1,64}/g);

            if (nftDataSlices.length !== 16) {
              // invalid slice
              return undefined
            }
            
            if (BigInt(`0x${nftDataSlices[12]}`).toString() !== tokenId) return;

            // rarible sale
            return BigInt(`0x${nftDataSlices[4]}`);
          }
          return undefined
        }).filter(r => r !== undefined)
        if (result.length) {
          const amount = result.reduce((previous,current) => previous + current, BigInt(0));
          return (parseFloat((amount / BigInt('10000000000000000')).toString())/100)
        }
        return undefined
    }

}