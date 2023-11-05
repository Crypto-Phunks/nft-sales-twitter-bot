import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseService, TweetRequest } from '../base.service';
import { ethers } from 'ethers';
import phunksAuctionHouse from '../abi/phunkAuctionHouse.json';
import { config } from '../config';
import { createLogger } from 'src/logging.utils';

const logger = createLogger('phunksauctionhouse.service')

@Injectable()
export class PhunksAuctionHouseService extends BaseService {
  
  provider = this.getWeb3Provider();
  contractAddress = '0x0e7f7d8007c0fccac2a813a25f205b9030697856'

  constructor(
    protected readonly http: HttpService,
  ) {
    super(http)
    logger.info('creating PhunksAuctionHouseService')
    if (!global.doNotStartAutomatically) {
      this.startProvider()
    }
  }

  startProvider() {

    this.initDiscordClient()
    
    // Listen for auction settled event
    const tokenContract = new ethers.Contract(this.contractAddress, phunksAuctionHouse, this.provider);
    let filter = tokenContract.filters.AuctionSettled();
    tokenContract.on(filter, (async (event) => {
      await this.handleEvent(event)
    }))    
  }

  async handleEvent(event) {
    const { phunkId, winner, amount, auctionId } =  ( event as any).args
    const imageUrl = `${config.local_auction_image_path}${phunkId.toString().padStart(4, '0')}.png`;
    const value = ethers.formatEther(amount)
    // If ens is configured, get ens addresses
    let ensTo: string;
    if (config.ens) {
      ensTo = await this.provider.lookupAddress(`${winner}`);
    }      
    const block = await this.provider.getBlock(event.blockNumber)
    const transactionDate = block.date.toISOString()

    const request:TweetRequest = {
      logIndex: event.index,
      eventType: 'sale',
      platform: 'auctionhouse',
      transactionDate,
      erc20Token: 'ethereum',
      initialFrom: '0x0e7f7d8007c0fccac2a813a25f205b9030697856',
      initialTo: winner,
      from: this.shortenAddress('0x0e7f7d8007c0fccac2a813a25f205b9030697856'),
      tokenId: phunkId,
      to: ensTo ?? this.shortenAddress(winner),
      ether: parseFloat(value),
      transactionHash: event.transactionHash,
      additionalText: `https://phunks.auction/auction/${auctionId}`,
      alternateValue: 0,
      imageUrl
    }
    const tweet = await this.tweet(request, config.auctionMessage);
    await this.discord(request, tweet.id, config.auctionMessageDiscord, '#FF04B4', 'AUCTION!');
  }

}
