import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  TransactionReceipt
} from "@ethersproject/abstract-provider";
import { BigNumber, ethers } from 'ethers';
import { hexToNumberString } from 'web3-utils';
import erc721abi from './abi/erc721.json'
import dotenv from 'dotenv';
dotenv.config();

import looksRareABI from './abi/looksRareABI.json';
import looksRareABIv2 from './abi/looksRareABIv2.json';
import blurABI from './abi/blur.json';
import nftxABI from './abi/nftxABI.json';
import openseaSeaportABI from './abi/seaportABI.json';

import { config } from './config';
import { BaseService, TweetRequest, TweetType } from './base.service';

const looksRareContractAddress = '0x59728544b08ab483533076417fbbb2fd0b17ce3a'; // Don't change unless deprecated
const looksRareContractAddressV2 = '0x0000000000e655fae4d56241588680f86e3b2377'; // Don't change unless deprecated

const blurContractAddress = '0x000000000000ad05ccc4f10045630fb830b95127';

const looksInterface = new ethers.utils.Interface(looksRareABI);
const looksInterfaceV2 = new ethers.utils.Interface(looksRareABIv2);
const blurInterface = new ethers.utils.Interface(blurABI);
const nftxInterface = new ethers.utils.Interface(nftxABI);
const seaportInterface = new ethers.utils.Interface(openseaSeaportABI);

// This can be an array if you want to filter by multiple topics
// 'Transfer' topic
const topics = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

@Injectable()
export class Erc721SalesService extends BaseService {
  
  provider = this.getWeb3Provider();

  constructor(
    protected readonly http: HttpService
  ) {
    super(http)
    // Listen for Transfer event
    this.provider.on({ address: config.contract_address, topics: [topics] }, (event) => {
      this.getTransactionDetails(event).then((res) => {
        if (!res) return
        // Only tweet transfers with value (Ignore w2w transfers)
        if (res?.ether || res?.alternateValue) this.tweet(res);
        // If free mint is enabled we can tweet 0 value
        else if (config.includeFreeMint) this.tweet(res);
      });
    });

    // this code snippet can be useful to test a specific transaction //
    return
    const tokenContract = new ethers.Contract(config.contract_address, erc721abi, this.provider);
    let filter = tokenContract.filters.Transfer();
    const startingBlock = 15710313  
    tokenContract.queryFilter(filter, 
      startingBlock, 
      startingBlock+1).then(events => {
      for (const event of events) {
        this.getTransactionDetails(event).then((res) => {
          if (!res) return
          console.log(res)
          return
          // Only tweet transfers with value (Ignore w2w transfers)
          if (res?.ether || res?.alternateValue) this.tweet(res);
          // If free mint is enabled we can tweet 0 value
          else if (config.includeFreeMint) this.tweet(res);
          // console.log(res);
        });     
      }
    });
  }

  async getTransactionDetails(tx: ethers.Event): Promise<any> {
    // uncomment this to test a specific transaction
    // if (tx.transactionHash !== '0xcee5c725e2234fd0704e1408cdf7f71d881e67f8bf5d6696a98fdd7c0bcf52f3') return;
    
    let tokenId: string;

    try {

      // Get addresses of seller / buyer from topics
      let from = ethers.utils.defaultAbiCoder.decode(['address'], tx?.topics[1])[0];
      let to = ethers.utils.defaultAbiCoder.decode(['address'], tx?.topics[2])[0];
      
      // ignore internal transfers to contract, another transfer event will handle this 
      // transaction afterward (the one that'll go to the buyer wallet)
      const code = await this.provider.getCode(to)
      if (code !== '0x') {
        console.log(`contract detected for ${tx.transactionHash} event index ${tx.logIndex}`)
        return
      }

      // not an erc721 transfer
      if (!tx?.topics[3]) return

      // Get tokenId from topics
      tokenId = hexToNumberString(tx?.topics[3]);

      // Get transaction hash
      const { transactionHash } = tx;
      console.log(`handling ${transactionHash}`)
      const isMint = BigNumber.from(from).isZero();

      // Get transaction
      const transaction = await this.provider.getTransaction(transactionHash);
      const { value } = transaction;
      const ether = ethers.utils.formatEther(value.toString());

      // Get transaction receipt
      const receipt: TransactionReceipt = await this.provider.getTransactionReceipt(transactionHash);

      // Get token image
      const imageUrl = config.use_local_images 
        ? `${config.local_image_path}${tokenId.padStart(4, '0')}.png`
        : await this.getTokenMetadata(tokenId);

      // Check if LooksRare & parse the event & get the value
      let alternateValue = 0;
      const LR = receipt.logs.map((log: any) => {
        if (log.address.toLowerCase() === looksRareContractAddress.toLowerCase()) {  
          return looksInterface.parseLog(log);
        }
      }).filter((log: any) => (log?.name === 'TakerAsk' || log?.name === 'TakerBid') &&
        log?.args.tokenId == tokenId);
      
      const LRV2 = receipt.logs.map((log: any) => {
        if (log.address.toLowerCase() === looksRareContractAddressV2.toLowerCase()) {  
          return looksInterfaceV2.parseLog(log);
        }
      }).filter((log: any) => (log?.name === 'TakerAsk' || log?.name === 'TakerBid') &&
        log?.args.itemIds.indexOf(tokenId));        
      
      const NFTX = receipt.logs.map((log: any) => {
        // direct buy from vault
        if (log.topics[0].toLowerCase() === '0x1cdb5ee3c47e1a706ac452b89698e5e3f2ff4f835ca72dde8936d0f4fcf37d81') {  
          const relevantData = log.data.substring(2);
          const relevantDataSlice = relevantData.match(/.{1,64}/g);
          return BigInt(`0x${relevantDataSlice[1]}`) / BigInt('1000000000000000');
        } else if (log.topics[0].toLowerCase() === '0x63b13f6307f284441e029836b0c22eb91eb62a7ad555670061157930ce884f4e') {
          const parsedLog = nftxInterface.parseLog(log)
          
          // check that the current transfer is NFTX related
          if (!parsedLog.args.nftIds.filter(n => BigInt(n).toString() === tokenId).length) {
            return
          }
          
          // redeem, find corresponding token bought
          const swaps = receipt.logs.filter((log2: any) => log2.topics[0].toLowerCase() === '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822')
            .map(b => {
              const relevantData = b.data.substring(2);
              const relevantDataSlice = relevantData.match(/.{1,64}/g);
              const moneyIn = BigInt(`0x${relevantDataSlice[0]}`)
              if (moneyIn > BigInt(0))
                return moneyIn / BigInt('1000000000000000');
              else return BigInt('0')
            })
          if (swaps.length) return swaps.reduce((previous, current) => previous + current, BigInt(0))
        }
      }).filter(n => n !== undefined)

      // Check all marketplaces specific events to find an alternate price
      // in case of sweep, multiple buy, or bid

      const NLL = receipt.logs.map((log: any) => {
        if (log.topics[0].toLowerCase() === '0x975c7be5322a86cddffed1e3e0e55471a764ac2764d25176ceb8e17feef9392c') {
          const relevantData = log.data.substring(2);
          if (tokenId !== parseInt(log.topics[1], 16).toString()) {
            return
          }
          return BigInt(`0x${relevantData}`) / BigInt('1000000000000000')
        }
      }).filter(n => n !== undefined)

      const X2Y2 = receipt.logs.map((log: any, index:number) => {
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

      const BLUR_IO = receipt.logs.map((log: any) => {
        if (log.address.toLowerCase() === blurContractAddress.toLowerCase()) {  
          return blurInterface.parseLog(log);
        }
      }).filter(l => l?.name === 'OrdersMatched' && l?.args.buy.tokenId.toString() === tokenId)
      
      const OPENSEA_SEAPORT = receipt.logs.map((log: any) => {
        if (log.topics[0].toLowerCase() === '0x9d9af8e38d66c62e2c12f0225249fd9d721c54b83f48d9352c97c6cacdcb6f31') {
          const logDescription = seaportInterface.parseLog(log);
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
            console.log('found weth offer, using it as amount')
            amounts = wethOffers
          }
          console.log(amounts)
          const amount = amounts.reduce((previous,current) => previous + current, BigInt(0))
          return amount / BigInt('1000000000000000') / BigInt(tokenCount)
        }
      }).filter(n => n !== undefined)      

      if (LR.length) {
        const weiValue = (LR[0]?.args?.price)?.toString();
        const value = ethers.utils.formatEther(weiValue);
        alternateValue = parseFloat(value);
      } else if (LRV2.length) {
        const weiValue = (LRV2[0]?.args?.feeAmounts[0])?.toString();
        const value = ethers.utils.formatEther(weiValue);
        alternateValue = parseFloat(value);
      } else if (NFTX.length) {
        // find the number of token transferred to adjust amount per token
        const redeemLog = receipt.logs.filter((log: any) => log.topics[0].toLowerCase() === '0x63b13f6307f284441e029836b0c22eb91eb62a7ad555670061157930ce884f4e')[0]
        const parsedLog = nftxInterface.parseLog(redeemLog)
        const tokenCount = Math.max(parsedLog.args.nftIds.length, 1)
        alternateValue = parseFloat(NFTX[0].toString())/tokenCount/1000;
      } else if (NLL.length) {
        alternateValue = parseFloat(NLL[0].toString())/1000;
      } else if (X2Y2.length) {
        alternateValue = parseFloat(X2Y2[0].toString())/1000;
      } else if (OPENSEA_SEAPORT.length) {
        alternateValue = parseFloat(OPENSEA_SEAPORT[0].toString())/1000;
      } else if (BLUR_IO.length) {
        const weiValue = (BLUR_IO[0]?.args?.buy.price)?.toString();
        const value = ethers.utils.formatEther(weiValue);
        alternateValue = parseFloat(value);
      }


      // if there is an NFTX swap involved, ignore this transfer
      const swaps = receipt.logs.filter((log2: any) => log2.topics[0].toLowerCase() === '0x7af2bc3f8ec800c569b6555feaf16589d96a9d04a49d1645fd456d75fa0b372b')
      if (swaps.length) {
        console.log('nftx swap involved in this transaction, ignoring it')
        return
      }

      // If ens is configured, get ens addresses
      let ensTo: string;
      let ensFrom: string;
      if (config.ens) {
        ensTo = await this.provider.lookupAddress(`${to}`);
        ensFrom = await this.provider.lookupAddress(`${from}`);
      }

      // Set the values for address to & from -- Shorten non ens
      to = config.ens ? (ensTo ? ensTo : this.shortenAddress(to)) : this.shortenAddress(to);
      from = (isMint && config.includeFreeMint) ? 'Mint' : config.ens ? (ensFrom ? ensFrom : this.shortenAddress(from)) : this.shortenAddress(from);

      // Create response object
      const tweetRequest: TweetRequest = {
        from,
        to,
        tokenId,
        ether: parseFloat(ether),
        transactionHash,
        alternateValue,
        type: TweetType.SALE
      };

      // If the image was successfully obtained
      if (imageUrl) tweetRequest.imageUrl = imageUrl;

      return tweetRequest;

    } catch (err) {
      console.log(`${tokenId} failed to send`, err);
      return null;
    }
  }

}
