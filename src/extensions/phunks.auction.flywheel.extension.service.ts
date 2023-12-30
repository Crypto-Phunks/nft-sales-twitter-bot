import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseService, TweetRequest } from '../base.service';
import { ethers } from 'ethers';
import phunkAuctionFlywheel from '../abi/phunkAuctionFlywheel.json';
import { config } from '../config';
import { createLogger } from 'src/logging.utils';

const logger = createLogger('phunksauction.service')

@Injectable()
export class PhunksAuctionFlywheelService extends BaseService {
  
  provider = this.getWeb3Provider();
  contractAddress = '0x86b525ab8c5c9b8852f3a1bc79376335bcd2f962'

  constructor(
    protected readonly http: HttpService,
  ) {
    super(http)
    logger.info('creating PhunksAuctionFlywheelService')
    if (!global.doNotStartAutomatically) {
      this.startProvider()
    }    
  }

  startProvider() {

    this.initDiscordClient()
    
    // Listen for auction settled event
    const tokenContract = new ethers.Contract(this.contractAddress, phunkAuctionFlywheel, this.provider);
    let filter = tokenContract.filters.PhunkSoldViaSignature();
    tokenContract.on(filter, (async (event) => {
      await this.handleEvent(event)
    }))
        
  }

  async handleEvent(event:any) {
    const { phunkId, minSalePrice, seller, auctionId } = (event as any).args
    const imageUrl = `${config.local_auction_image_path}${phunkId.toString().padStart(4, '0')}.png`;
    const value = ethers.formatEther(minSalePrice)
    // If ens is configured, get ens addresses
    let ensTo: string;
    if (config.ens) {
      ensTo = await this.provider.lookupAddress(`${seller}`);
    }
    const block = await this.provider.getBlock(event.blockNumber)
    const transactionDate = block.date.toISOString()

    const request:TweetRequest = {
      logIndex: event.index,
      eventType: 'sale',
      platform: 'flywheel',
      transactionDate,
      initialFrom: seller,
      erc20Token: 'ethereum',
      from: this.shortenAddress('0x0e7f7d8007c0fccac2a813a25f205b9030697856'),
      tokenId: phunkId,
      to: ensTo ?? this.shortenAddress(seller),
      ether: parseFloat(value),
      transactionHash: event.transactionHash,
      alternateValue: 0,
      imageUrl
    }
    const tweet = await this.tweet(request, config.flywheelMessage);
    await this.discord(request, tweet.id, config.flywheelMessageDiscord, '#F99C1C', 'FLYWHEEL!');
  }

}
