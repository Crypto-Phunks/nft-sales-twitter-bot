import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseService, TweetRequest } from '../base.service';
import { ethers } from 'ethers';
import phunkAuctionFlywheel from '../abi/phunkAuctionFlywheel.json';
import { config } from '../config';

@Injectable()
export class PhunksAuctionFlywheelService extends BaseService {
  
  provider = this.getWeb3Provider();

  constructor(
    protected readonly http: HttpService,
  ) {
    super(http)
    console.log('creating PhunksAuctionFlywheelService')

    // Listen for auction settled event
    const tokenContract = new ethers.Contract('0x86b525ab8c5c9b8852f3a1bc79376335bcd2f962', phunkAuctionFlywheel, this.provider);
    let filter = tokenContract.filters.PhunkSoldViaSignature();
    tokenContract.on(filter, (async (event) => {
      const { phunkId, minSalePrice, seller, auctionId } = (event as any).args
      const imageUrl = `${config.local_auction_image_path}${phunkId}.png`;
      const value = ethers.formatEther(minSalePrice)
      // If ens is configured, get ens addresses
      let ensTo: string;
      if (config.ens) {
        ensTo = await this.provider.lookupAddress(`${seller}`);
      }      
      const request:TweetRequest = {
        from: this.shortenAddress('0x0e7f7d8007c0fccac2a813a25f205b9030697856'),
        tokenId: phunkId,
        to: ensTo ?? this.shortenAddress(seller),
        ether: parseFloat(value),
        transactionHash: event.transactionHash,
        alternateValue: 0,
        imageUrl
      }
      const tweet = await this.tweet(request, config.flywheelMessage);
      await this.discord(request, tweet.id, config.flywheelMessageDiscord);
    }))
    
    // uncomment the `return` below to test a specific block
    return
    tokenContract.queryFilter(filter, 
      17616760, 
      17616760).then(async (events) => {
      for (const event of events) {
        const { phunkId, minSalePrice, seller, auctionId } = (event as any).args
        const imageUrl = `${config.local_auction_image_path}${phunkId}.png`;
        const value = ethers.formatEther(minSalePrice)
        // If ens is configured, get ens addresses
        let ensTo: string;
        if (config.ens) {
          ensTo = await this.provider.lookupAddress(`${seller}`);
        }      
        const request:TweetRequest = {
          from: this.shortenAddress('0x0e7f7d8007c0fccac2a813a25f205b9030697856'),
          tokenId: phunkId,
          to: ensTo ?? this.shortenAddress(seller),
          ether: parseFloat(value),
          transactionHash: event.transactionHash,
          alternateValue: 0,
          imageUrl
        }
        const tweet = await this.tweet(request, config.flywheelMessage);
        await this.discord(request, tweet.id, config.flywheelMessageDiscord);
      }
    });
  }

}
