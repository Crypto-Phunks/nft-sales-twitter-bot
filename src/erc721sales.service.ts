import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AbiCoder, TransactionReceipt, ethers } from 'ethers';
import { hexToNumberString } from 'web3-utils';
import dotenv from 'dotenv';
dotenv.config();

import { config } from './config';
import { BaseService, TweetRequest } from './base.service';
import { createLogger } from './logging.utils';

const logger = createLogger('erc721sales.service')

const botMevAddress = '0x00000000000A6D473a66abe3DBAab9E1388223Bd'
const nftxVaultBeaconProxyAddress = '0xB39185e33E8c28e0BB3DbBCe24DA5dEA6379Ae91'


// This can be an array if you want to filter by multiple topics
// 'Transfer' topic
const topics = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

@Injectable()
export class Erc721SalesService extends BaseService {
  
  provider = this.getWeb3Provider();

  constructor(
    protected readonly http: HttpService,
  ) {
    super(http)
  }
  
  startProvider() {

    this.initDiscordClient()
    
    // Listen for Transfer event
    this.provider.on({ address: config.contract_address, topics: [topics] }, (event) => {
      this.getTransactionDetails(event, false, true).then((res) => {
        if (!res) return
        // Only tweet transfers with value (Ignore w2w transfers)
        if (res?.ether || res?.alternateValue) this.dispatch(res);
        // If free mint is enabled we can tweet 0 value
        else if (config.includeFreeMint) this.tweet(res);
      });
    });

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
        if (to !== nftxVaultBeaconProxyAddress && code !== '0x' && ignoreContracts) {
          logger.info(`contract detected for ${tx.transactionHash} event index ${tx.index}`)
          return
        }
        
        // not an erc721 transfer
        if (!tx?.topics[3]) return

        // Get tokenId from topics
        tokenId = hexToNumberString(tx?.topics[3]);

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

        // Get transaction receipt
        const receipt: TransactionReceipt = await this.provider.getTransactionReceipt(transactionHash);

        // Get token image
        const imageUrl = config.use_local_images 
          ? `${config.local_image_path}${tokenId.padStart(4, '0')}.png`
          : await this.getTokenMetadata(tokenId);

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
          const result = parser.parseLogs(transaction, receipt.logs, tokenId)
          if (result) {
            tweetRequest.alternateValue = result
            tweetRequest.platform = parser.platform
            break
          }
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

}
