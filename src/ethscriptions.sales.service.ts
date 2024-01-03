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

const logger = createLogger('ethscriptions.sales.service')

// This can be an array if you want to filter by multiple topics
// 'ethscriptions_protocol_TransferEthscriptionForPreviousOwner' topic
const topics = '0xf1d95ed4d1680e6f665104f19c296ae52c1f64cd8114e84d55dc6349dbdafea3';

@Injectable()
export class EthscriptionsSalesService extends BaseService {
  
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
      //const t = await this.getTransactionDetails(e)
      // this.dispatch(t)
    }    
  }
  
  async startProvider() {

    this.initDiscordClient();
    
    const CHUNK_SIZE = 10
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
        const block = await this.provider.getBlock(this.currentBlock, true)
        block.prefetchedTransactions.forEach(async (t) => {
          
          if (t.hash.toLowerCase() === '0x0bd942eb2a1a173967971f8c800c49ff6d49c9ba307bb44e59e6d2299b2da7a3') {
            const r = await this.provider.getTransactionReceipt(t.hash)
            const rr = await this.provider.getTransaction(t.hash)

            r.logs.filter(l => l.topics[0] === topics).forEach(l => {
              console.log('found tx')
              this.dispatch({
                ether: parseInt(ethers.formatEther(t.value)),
                platform: 'unknown',
                transactionHash: t.hash,
                logIndex: l.index,
                eventType: 'sale',
                initialFrom: t.from,
                from: t.from,
                tokenId: '1',
                to: t.to,
                alternateValue: 0,
                transactionDate: new Date(block.timestamp * 1000).toString(),
                erc20Token: 'ethereum',
              })
            })
            console.log(`${t.hash} —> ${t.data}`)
            
          }
        })
        // block.getPrefetchedTransaction()
        //await tokenContract.queryFilter(filter, this.currentBlock, this.currentBlock + CHUNK_SIZE)

        /*
        for (let event of events) {
          latestTweetedBlock = event.blockNumber
          latestTweetedTx = event.transactionHash
          await this.handleEvent(event)
        }
        */

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

  getContractAddress() {
    return config.contract_address    
  }

  getForcedPlatform() {
    return undefined
  }  

  getPositionFile() {
    return 'ethscriptions.position.txt'
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