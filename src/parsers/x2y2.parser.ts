import { Log, TransactionResponse, ethers } from "ethers";
import { LogParser } from "./parser.definition";
import looksRareABIv2 from '../abi/looksRareABIv2.json';

const looksRareContractAddressV2 = '0x0000000000e655fae4d56241588680f86e3b2377'; // Don't change unless deprecated
const looksInterfaceV2 = new ethers.Interface(looksRareABIv2);

export class X2Y2Parser implements LogParser {
    
    platform: string = 'x2y2';
    
    parseLogs(transaction:TransactionResponse, logs: Log[], tokenId: string): number {
        const result = logs.map((log: any, index:number) => {
          if (log.topics[0].toLowerCase() === '0x3cbb63f144840e5b1b0a38a7c19211d2e89de4d7c5faf8b2d3c1776c302d1d33') {
            const data = log.data.substring(2);
            const dataSlices = data.match(/.{1,64}/g);
            // find the right token
            if (BigInt(`0x${dataSlices[18]}`).toString() !== tokenId) return;
            let amount = BigInt(`0x${dataSlices[12]}`) / BigInt('1000000000000000');
            if (amount === BigInt(0)) {
              amount = BigInt(`0x${dataSlices[26]}`) / BigInt('1000000000000000');
            }
            return amount
          }
        }).filter(n => n !== undefined)  
        if (result.length) {
          return parseFloat(result[0].toString())/1000;
        }
        return undefined
    }

}