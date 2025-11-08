import erc721abi from './abi/erc721.json';
import fetch from "node-fetch";
import { promises as fs } from 'fs';
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AbiCoder, JsonRpcProvider, Transaction, TransactionDescription, TransactionReceipt, ethers } from 'ethers';
import { hexToNumberString } from 'web3-utils';

import dotenv from 'dotenv';
dotenv.config();

import { config } from './config';
import { BaseService, TweetRequest } from './base.service';
import { createLogger } from './logging.utils';

const logger = createLogger('erc721sales.service')

// This can be an array if you want to filter by multiple topics
// 'Transfer' topic
const topics = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

@Injectable()
export class Erc721SalesService extends BaseService {
  
  provider = this.getWeb3Provider();
  currentBlock:number = -1

  constructor(
    protected readonly http: HttpService,
  ) {
    super(http)

    if (!global.doNotStartAutomatically) {
      this.startProvider()
    }
    //this.test()
  }

  async test() {
    const tokenContract = new ethers.Contract(this.getContractAddress(), erc721abi, this.provider);
    let filter = tokenContract.filters.Transfer();
    const events = await tokenContract.queryFilter(filter, 
      18247007, 
      18247007)
    for (let e of events) {
      const t = await this.getTransactionDetails(e)
      this.dispatch(t)
    }    
  }
  
  async startProvider() {

    this.initDiscordClient();
    
    const CHUNK_SIZE = 10
    const tokenContract = new ethers.Contract(this.getContractAddress(), erc721abi, this.provider);
    const filter = [topics];
    
    try {
      this.currentBlock = parseInt(await fs.readFile(this.getPositionFile(), { encoding: 'utf8' }))
    } catch (err) {
    }
    if (isNaN(this.currentBlock) || this.currentBlock <= 0) {
      this.currentBlock = await this.getWeb3Provider().getBlockNumber()      
      await this.updatePosition(this.currentBlock)
    }
    console.log(`position: ${this.currentBlock}`)

    let retryCount = 0
    let latestTweetedBlock = 0
    let latestTweetedTx = ''
    while (true) {
      try {
        const latestAvailableBlock = await this.provider.getBlockNumber()
        if (this.currentBlock >= latestAvailableBlock) {
          logger.info(`latest block reached (${latestAvailableBlock}), waiting the next available block...`)
          await delay(10000)
          continue
        }

        console.log(`checking ${this.currentBlock}`)
        const events = await tokenContract.queryFilter(filter, this.currentBlock, this.currentBlock + CHUNK_SIZE)

        for (let event of events) {
          latestTweetedBlock = event.blockNumber
          latestTweetedTx = event.transactionHash
          await this.handleEvent(event)
        }

        this.currentBlock += CHUNK_SIZE
        if (this.currentBlock > latestAvailableBlock) this.currentBlock = latestAvailableBlock + 1
        await this.updatePosition(latestAvailableBlock)
      } catch (err) {
        console.log(err)
        retryCount++
        await new Promise( resolve => setTimeout(resolve, 500*retryCount) )
        if (retryCount > 5) {
          console.log(`stop retrying, failing on ${latestTweetedTx}, moving to next block`)
          this.currentBlock = latestTweetedBlock + 1 
          retryCount = 0
        }
      }
    }
    
  }

  async handleEvent(event) {
    const res = await this.getTransactionDetails(event, false, true)
    if (!res) return
    // Only tweet transfers with value (Ignore w2w transfers)
    if (res?.ether || res?.alternateValue) this.dispatch(res);
    // If free mint is enabled we can tweet 0 value
    else if (config.includeFreeMint) this.tweet(res);;
  }

  async getTransactionDetails(tx: any, ignoreENS:boolean=false, ignoreContracts:boolean=true): Promise<any> {
    // uncomment this to test a specific transaction
    // if (tx.transactionHash !== '0xcee5c725e2234fd0704e1408cdf7f71d881e67f8bf5d6696a98fdd7c0bcf52f3') return;
    
    let tokenId: string;
    let retryCount: number = 0

    while (true) {
      try {

        // Get addresses of seller / buyer from topics
        const coder = AbiCoder.defaultAbiCoder()
        let from = coder.decode(['address'], tx?.topics[1])[0];
        let to = coder.decode(['address'], tx?.topics[2])[0];
        
        // ignore internal transfers to contract, another transfer event will handle this 
        // transaction afterward (the one that'll go to the buyer wallet)
        const code = await this.provider.getCode(to)
        // the ignoreContracts flag make the MEV bots like transaction ignored by the twitter
        // bot, but not for statistics
        if (to !== config.nftx_vault_contract_address && code !== '0x' 
          && ignoreContracts && !config.allowed_contracts.includes(to)) {
          logger.info(`contract detected for ${tx.transactionHash} event index ${tx.index} to ${to}, ignoring...`)
          return
        }
        
        // not an erc721 transfer
        // Get transaction receipt
        const receipt: TransactionReceipt = await this.provider.getTransactionReceipt(tx.transactionHash);

        // Get tokenId from topics
        tokenId = this.getTokenId(tx, receipt);
        if (!tokenId) break

        // Get transaction hash
        const { transactionHash } = tx;
        const isMint = BigInt(from) === BigInt(0);

        // Get transaction
        const transaction = await this.provider.getTransaction(transactionHash);
        const block = await this.provider.getBlock(transaction.blockNumber)
        const transactionDate = block.date.toISOString()      
        logger.info(`handling ${transactionHash} token ${tokenId} log ${tx.index} — ${transactionDate} - from ${tx.blockNumber}`)
        
        const { value } = transaction;
        let ether = ethers.formatEther(value.toString());

        // Get token image
        const imageUrl = await this.getImageUri(tokenId)

        // If ens is configured, get ens addresses
        let ensTo: string;
        let ensFrom: string;
        if (config.ens && !ignoreENS) {
          ensTo = await this.provider.lookupAddress(`${to}`);
          ensFrom = await this.provider.lookupAddress(`${from}`);
        }

        // Set the values for address to & from -- Shorten non ens
        const initialFrom = from
        const initialTo = to
        to = config.ens && !ignoreENS ? (ensTo ? ensTo : this.shortenAddress(to)) : this.shortenAddress(to);
        from = (isMint && config.includeFreeMint) ? 'Mint' : config.ens ? (ensFrom ? ensFrom : this.shortenAddress(from)) : this.shortenAddress(from);

        // Create response object
        const tweetRequest: TweetRequest = {
          logIndex: tx.index,
          eventType: isMint ? 'mint' : 'sale',
          initialFrom,
          initialTo,
          from,
          erc20Token: 'ethereum',
          to,
          tokenId,
          ether: parseFloat(ether),
          transactionHash,
          transactionDate,
          alternateValue: 0,
          platform: 'unknown',
        };

        // If the image was successfully obtained
        if (imageUrl) tweetRequest.imageUrl = imageUrl;
       
        // Try to use custom parsers
        for (let parser of config.parsers) {
          const result = await parser.parseLogs(transaction, receipt.logs, tokenId)
          if (result) {
            tweetRequest.alternateValue = result
            tweetRequest.platform = parser.platform
            break
          }
        }
        
        if (this.getForcedPlatform()) {
          tweetRequest.platform = this.getForcedPlatform()
        }

        if (transaction.to === '0x941A6d105802CCCaa06DE58a13a6F49ebDCD481C' && !tweetRequest.alternateValue) {
          // nftx swap of "inner token" that weren't bought in the same transaction ignore this
          logger.info(`nftx swap detected without ETH buy, ignoring ${tx.transactionHash} event index ${tx.index}`)
          return
        }
        return tweetRequest

      } catch (err) {
        logger.info(`${tokenId} failed to send, retryCount: ${retryCount}`, err);
        retryCount++
        if (retryCount >= 10) {
          logger.info("retried 10 times, giving up")
          return null;
        }
        logger.info(`will retry after a delay ${retryCount}...`)
        await new Promise( resolve => setTimeout(resolve, 500*retryCount) )
      }
    }
  }

  getTokenId(tx:any, receipt:TransactionReceipt) {
    return hexToNumberString(tx?.topics[3])    
  }

  getContractAddress() {
    return config.contract_address    
  }

  getForcedPlatform() {
    return undefined
  }  

  getPositionFile() {
    return 'erc721.position.txt'
  }

  async getImageUri(tokenId) {
    return config.use_forced_remote_image_path ? 
          config.forced_remote_image_path.replace(new RegExp('<tokenId>', 'g'), tokenId.padStart(4, '0'))
          : config.use_local_images 
          ? `${config.local_image_path}${tokenId.padStart(4, '0')}.png`
          : await this.getTokenMetadata(tokenId);    
  }

}

function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}