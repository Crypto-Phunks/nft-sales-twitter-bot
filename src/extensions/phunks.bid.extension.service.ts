import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseService, TweetRequest } from '../base.service';
import { ethers } from 'ethers';
import notLarvaLabsAbi from '../abi/notlarvalabs.json';
import { config } from '../config';
import { createLogger } from 'src/logging.utils';

const logger = createLogger('phunks.bid.extension.service')

@Injectable()
export class PhunksBidService extends BaseService {
  
  provider = this.getWeb3Provider();

  constructor(
    protected readonly http: HttpService,
  ) {
    super(http)
    logger.info('creating PhunksBidService')

    this.initDiscordClient()
    
    // Listen for Bid event
    const tokenContract = new ethers.Contract('0xd6c037bE7FA60587e174db7A6710f7635d2971e7', notLarvaLabsAbi, this.provider);
    let filter = tokenContract.filters.PhunkBidEntered();
    tokenContract.on(filter, (async (event) => {
      const token = event.args.phunkIndex
      const amount = event.args.value
      const from = event?.args[2];

      const imageUrl = `${config.local_bids_image_path}${token}.png`;
      const value = ethers.formatEther(amount)
      // If ens is configured, get ens addresses
      let ensFrom: string;
      if (config.ens) {
        ensFrom = await this.provider.lookupAddress(`${from}`);
      }      
      const block = await this.provider.getBlock(event.blockNumber)
      const transactionDate = block.date.toISOString()

      const request:TweetRequest = {
        logIndex: event.index,
        eventType: 'bid',
        platform: 'notlarvalabs',
        initialFrom: from,
        transactionDate,
        from: ensFrom ?? this.shortenAddress(from),
        tokenId: token,
        ether: parseFloat(value),
        transactionHash: event.transactionHash,
        alternateValue: 0,
        imageUrl
      }
      const tweet = await this.tweet(request, config.bidMessage);
      await this.discord(request, tweet.id, config.bidMessageDiscord, '#9856B7', 'BID!');
    }))

    // uncomment this to test the plugin
    return
    tokenContract.queryFilter(filter, 
      17936542, 
      17936542).then(async (events:any) => {
      for (const event of events) {
        if (event?.args.length < 3) return
        const from = event?.args[2];
        // If ens is configured, get ens addresses
        let ensFrom: string;
        if (config.ens) {
          ensFrom = await this.provider.lookupAddress(`${from}`);
        }
        const value = ethers.formatEther(event.args.value);
        const imageUrl = `${config.local_bids_image_path}${event.args.phunkIndex}.png`;
        const block = await this.provider.getBlock(event.blockNumber)
        const transactionDate = block.date.toISOString()
  
        const request:TweetRequest = {
          logIndex: event.index,
          eventType: 'bid',
          platform: 'notlarvalabs',
          initialFrom: from,
          transactionDate,
          from: ensFrom ?? this.shortenAddress(from),
          tokenId: event.args.phunkIndex,
          ether: parseFloat(value),
          transactionHash: event.transactionHash,
          alternateValue: 0,
          imageUrl
        }
        const tweet = await this.tweet(request, config.bidMessage);
        await this.discord(request, tweet.id, config.bidMessageDiscord);
      }
    });
    
  }

}
