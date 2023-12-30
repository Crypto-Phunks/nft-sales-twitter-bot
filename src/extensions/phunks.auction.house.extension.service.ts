import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
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
  currentBlock:number = -1
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

  async startProvider() {

    const CHUNK_SIZE = 20
    this.initDiscordClient()
    
    // Listen for auction settled event
    const tokenContract = new ethers.Contract(this.contractAddress, phunksAuctionHouse, this.provider);
    let filter = tokenContract.filters.AuctionSettled();

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

        console.log(`checking (phunk auction module) ${this.currentBlock}`)
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
        if (retryCount > 5) {
          console.log(`stop retrying, failing on ${latestTweetedTx}, moving to next block`)
          this.currentBlock = latestTweetedBlock + 1 
          retryCount = 0
        }
      }
    }
        
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

  getPositionFile() {
    return 'phunks.auction.house.position.txt'
  }

}

function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}