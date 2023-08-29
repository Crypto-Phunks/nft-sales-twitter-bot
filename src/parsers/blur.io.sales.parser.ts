import { AbiCoder, Log, TransactionResponse, ethers } from "ethers";
import { LogParser } from "./parser.definition";
import { config } from "../config";
import blurABI from '../abi/blur.json';

const blurBiddingContractAddress = '0x0000000000a39bb272e79075ade125fd351887ac';
const blurInterface = new ethers.Interface(blurABI);
const blurSalesContractAddressV2 = '0x39da41747a83aeE658334415666f3EF92DD0D541';
const blurSalesContractAddressV3 = '0xb2ecfe4e4d61f8790bbb9de2d1259b9e2410cea5';

export class BlurIOSalesParser implements LogParser {
    
    platform: string = 'blurio';
    
    parseLogs(transaction:TransactionResponse, logs: Log[], tokenId: string): number {
        const result = logs
        .filter(l => l.address.toLowerCase() === blurBiddingContractAddress.toLowerCase())
        .filter(l => {
          // find payment to blur
          const address = AbiCoder.defaultAbiCoder().decode(['address'], l?.topics[2])[0].toLowerCase()
          return address === blurSalesContractAddressV3.toLowerCase() || address === blurSalesContractAddressV2.toLowerCase()
        })
        .map(l => {
          const relevantData = l.data.substring(2);
          const relevantDataSlice = relevantData.match(/.{1,64}/g);
          const amount = BigInt(`0x${relevantDataSlice[0]}`)

          return amount
        })
        if (result.length) {
          const weiValue = result.reduce((previous,current) => previous + current, BigInt(0));
          const count = logs
            .filter(l => l.address.toLowerCase() === config.contract_address.toLowerCase() && 
              l.topics[0].toLowerCase() === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef').length
          const value = ethers.formatEther(weiValue/BigInt(count));

          return parseFloat(value);
        }
        return undefined
    }

}