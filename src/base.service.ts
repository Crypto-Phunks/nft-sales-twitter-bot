import { Injectable } from '@nestjs/common';
import fetch from 'node-fetch';
import { promises as asyncfs } from 'fs';
import { HttpService } from '@nestjs/axios';
import fs from 'fs';
import fiatSymbols from './fiat-symobols.json';
import { ethers } from 'ethers';
import { catchError, defaultIfEmpty, EMPTY, firstValueFrom, map, Observable, of, switchMap, tap, timer } from 'rxjs';
import currency from 'currency.js';

import dotenv from 'dotenv';
dotenv.config();

import { config } from './config';
import TwitterClient from './clients/twitter';
import { EUploadMimeType } from 'twitter-api-v2';
import DiscordClient from './clients/discord';
import { createLogger } from './logging.utils';
import { HexColorString, MessageAttachment, MessageEmbed } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { formatDistance } from 'date-fns';

export const alchemyAPIUrl = 'https://eth-mainnet.alchemyapi.io/v2/';
export const alchemyAPIKey = process.env.ALCHEMY_API_KEY;

//const provider = ethers.getDefaultProvider(alchemyAPIUrl + alchemyAPIKey);
const provider = global.providerForceHTTPS ? 
  ethers.getDefaultProvider(process.env.GETH_NODE_ENDPOINT_HTTP) :
  ethers.getDefaultProvider(process.env.GETH_NODE_ENDPOINT);


const pendingTransactions = []
const MAX_PENDING_TRANSACTIONS = 20000

const logger = createLogger('base.service')
let pendingTransactionWatcherStarted = false

let fiatValues = {}
getCryptoToFiat()

async function getCryptoToFiat() {
  logger.info('refreshing fiat values')
  const endpoint = `https://api.coingecko.com/api/v3/simple/price?ids=ethereum,dai,usdc&vs_currencies=usd`;
  const res = await fetch(endpoint)  
  const data = await res.json() as any
  fiatValues = { 'usdc': { 'usd': 1 }, ...data }
  logger.info(`fiat values set to ${JSON.stringify(fiatValues)}`)

  setTimeout(() => getCryptoToFiat(), 300000)
}

if (!global.noWatchdog && !global.doNotStartAutomatically) {
  startWatchdog()
}
if (config.enable_flashbot_detection && !global.doNotStartAutomatically) {
  watchPendingTransactions()
}

function startWatchdog() {
  return setTimeout(async () => {
    const timeoutInterval = setTimeout(() => {
      logger.warn(`Websocket connection hanged! Killing myself.`)
      process.exit(1)
    }, 20000);
    logger.info(`Checking websocket connection...`)
    const block = await provider.getBlockNumber()
    logger.info(`Websocket connection alive: ${block} !`)
    clearInterval(timeoutInterval)
    startWatchdog()
  }, 30000)  
}

function watchPendingTransactions() {
  if (!pendingTransactionWatcherStarted) {
    pendingTransactionWatcherStarted = true
    
    provider.on('pending', (txHash) => {
      pendingTransactions.push({
        time: new Date().getTime(),
        hash: txHash
      })
    });

    setInterval(() => {
      if (pendingTransactions.length) {
        if (pendingTransactions.length > MAX_PENDING_TRANSACTIONS) {
          pendingTransactions.splice(0, pendingTransactions.length - MAX_PENDING_TRANSACTIONS)
        }
        const distanceFrom = formatDistance(pendingTransactions[0].time, new Date(), { addSuffix: true })
        const distanceTo = formatDistance(pendingTransactions[pendingTransactions.length-1].time, new Date(), { addSuffix: true })
        logger.info(`Analyzed ${pendingTransactions.length} pending transactions between ${distanceFrom} and ${distanceTo}...`)
  
        if (new Date().getTime() - pendingTransactions[pendingTransactions.length-1].time > 60000*5) {
          logger.info(`Last pending transaction is older than 5 minutes, killing myself...`)
          process.exit(1)
        }
      }
    }, 5000)    
  }
}

export interface TweetRequest {
  platform: string,
  logIndex: number,
  eventType: string,
  initialFrom:string, 
  initialTo?:string, 
  from: any;
  to?: any;
  tokenId: string;
  ether?: number;
  erc20Token: string;
  transactionHash: string;
  transactionDate: string;
  alternateValue: number;
  imageUrl?: string;
  additionalText?: string;
}

@Injectable()
export class BaseService {
  
  twitterClient: TwitterClient;
  discordClient: DiscordClient;

  constructor(
    protected readonly http: HttpService
  ) {
    this.twitterClient = new TwitterClient()
    this.discordClient = new DiscordClient()
  }

  isTransactionFlashbotted(hash:string) {
    if (pendingTransactions.length < MAX_PENDING_TRANSACTIONS) {
      logger.warn(`cannot determinate if the transaction used a flashbot because the pool is not full: ${pendingTransactions.length}`)
      return false
    }
    for (let tx of pendingTransactions) {
      if (tx.hash.toLowerCase() == hash.toLowerCase()) {
        return false
      }
    }
    return true
  }

  initDiscordClient() {
    this.discordClient.init()
  }

  getDiscordInteractionsListeners() {
    return this.discordClient.getInteractionsListener()
  }

  getDiscordCommands() {
    return this.discordClient.getDiscordCommands()
  }

  getWeb3Provider() {
      return provider
  }

  shortenAddress(address: string): string {
    const shortAddress = `${address.slice(0, 5)}...${address.slice(address.length - 5, address.length)}`;
    if (address.startsWith('0x')) return shortAddress;
    return address;
  }

  async getTokenMetadata(tokenId: string, onlyImage:boolean=true): Promise<any> {
    // check cache 
    const metadataPath = `${config.token_metadata_cache_path}/${tokenId}.json`
    const url = alchemyAPIUrl + alchemyAPIKey + '/getNFTMetadata';
    const hadCacheData = fs.existsSync(metadataPath)
    let dataObserver = hadCacheData ? 
      of({
        data: JSON.parse(fs.readFileSync(metadataPath).toString())
      }) :
      this.http.get(url, {
        params: {
          contractAddress: config.contract_address,
          tokenId,
          tokenType: 'erc721'
        }
      })

    return await firstValueFrom(
      dataObserver.pipe(
        tap(async (res:any) => {
          if (!hadCacheData && config.token_metadata_cache_path) {
            logger.info(`populating metadata cache for ${tokenId}`)
            await asyncfs.writeFile(metadataPath, JSON.stringify(res?.data))
          }
        }),
        map((res: any) => {
          return onlyImage ? res?.data?.metadata?.image_url || res?.data?.metadata?.image || res?.data?.tokenUri?.gateway : res?.data;
        }),
        catchError(() => {
          return of(null);
        })
      )
    );
  }

  async dispatch(data: TweetRequest) {
    let tweetId = '-1'
    if (process.env.DISABLE_TWEETS !== 'true') {
      try {
        const tweet = await this.tweet(data)
        tweetId = tweet.id
      } catch (error) {
        logger.error(`error while tweeting ${error}`, error)
      }
    }
    if (process.env.DISABLE_DISCORD === 'true') return
    await this.discord(data, tweetId)
  }
  
  async discord(data: TweetRequest, 
                tweetId:string|undefined=undefined, 
                template:string=config.saleMessageDiscord, 
                color:string='#0084CA',
                footerTextParam:string|undefined=undefined) {
    if (!this.discordClient.setup) return
    if (tweetId) template = template.replace(new RegExp('<tweetLink>', 'g'), `<https://twitter.com/i/web/status/${tweetId}>`);
    const image = config.use_local_images ? data.imageUrl : this.transformImage(data.imageUrl);
    
    const platformImage = data.platform === 'nftx' ? 'NFTX.png' :
      data.platform === 'opensea' ? 'OPENSEA.png' :
      data.platform === 'looksrare' ? 'LOOKSRARE.png' :
      data.platform === 'x2y2' ? 'X2Y2.png' :
      data.platform === 'rarible' ? 'RARIBLE.png' :
      data.platform === 'notlarvalabs' ? 'NLL.png' :
      data.platform === 'phunkauction' ? 'AUCTION.png' :
      data.platform === 'phunkflywheel' ? 'FLYWHEEL.png' :
      data.platform === 'blurio' ? 'BLUR.png' :
      'ETHERSCAN.png';
    const sentText = this.formatText(data, template)
    const footerText = footerTextParam ?? config.discord_footer_text
    const embed = new MessageEmbed()
      .setColor(color as HexColorString)
      .setImage(`attachment://token.png`)
      .setDescription(sentText)
      .setTimestamp()
      .setFooter({ text: footerText, iconURL: 'attachment://platform.png' });
  
    let processedImage: Buffer | undefined;
    if (image) processedImage = await this.getImageFile(image);
    processedImage = await this.decorateImage(processedImage, data)
    await this.discordClient.sendEmbed(embed, processedImage, `platform_images/${platformImage}`);
  }

  async tweet(data: TweetRequest, template:string=config.saleMessage) {

    let tweetText = this.formatText(data, template)

    // Delay tweets when running live
    if (!global.doNotStartAutomatically)
      await new Promise( resolve => setTimeout(resolve, 30000) );
    
    // Format our image to base64
    const image = config.use_local_images || config.use_forced_remote_image_path ? data.imageUrl : this.transformImage(data.imageUrl);

    let processedImage: Buffer | undefined;
    if (image) processedImage = await this.getImageFile(image);

    processedImage = await this.decorateImage(processedImage, data)

    let media_id: string;
    if (processedImage) {
      // Upload the item's image to Twitter & retrieve a reference to it
      media_id = await this.twitterClient.uploadMedia(processedImage, {
        mimeType: EUploadMimeType.Png,
      });
    }

    // Post the tweet 👇
    // If you need access to this endpoint, you’ll need to apply for Elevated access via the Developer Portal. You can learn more here: https://developer.twitter.com/en/docs/twitter-api/getting-started/about-twitter-api#v2-access-leve
    const { data: createdTweet, errors: errors } = await this.twitterClient.tweet(
      tweetText,
      { media: { media_ids: [media_id] } },
    );
    if (!errors) {
      logger.info(
        `Successfully tweeted: ${createdTweet.id} -> ${createdTweet.text}`,
      );
      return createdTweet;
    } else {
      logger.error(errors);
      return null;
    }
  }
  
  async decorateImage(processedImage: Buffer, data:TweetRequest): Promise<Buffer> {
    // Do nothing but can be overriden by subclasses
    return processedImage
  }

  formatText(data: TweetRequest, template:string) {
    if (!data) return template

    // Cash value
    const value = data.alternateValue && data.alternateValue > 0 ? data.alternateValue : data.ether
    
    const fiat = this.getFiatValue(value, data.erc20Token)
    const eth = this.getERC20Value(data.alternateValue ? data.alternateValue : data.ether, data.erc20Token)
    
    // Replace tokens from config file
    template = template.replace(new RegExp('<tokenId>', 'g'), data.tokenId);
    template = template.replace(new RegExp('<ethPrice>', 'g'), eth.format());
    template = template.replace(new RegExp('<txHash>', 'g'), data.transactionHash);
    template = template.replace(new RegExp('<from>', 'g'), data.from);
    template = template.replace(new RegExp('<initialFrom>', 'g'), data.initialFrom);
    template = template.replace(new RegExp('<to>', 'g'), data.to);
    template = template.replace(new RegExp('<initialTo>', 'g'), data.initialTo);
    template = template.replace(new RegExp('<fiatPrice>', 'g'), fiat ? fiat.format() : '-');
    const platform = data.platform === 'blurio' ? 'Blur marketplace' : 
      data.platform === 'opensea' ? 'OpenSea marketplace' : 
      data.platform === 'looksrare' ? 'Looks Rare' : 
      data.platform === 'arcadexyz' ? 'Arcade' : 
      data.platform === 'nftfi' ? 'NFTfi' : 
      data.platform === 'benddao' ? 'Bend DAO' : 
      data.platform === 'metastreet' ? 'Metastreet' : 
      data.platform === 'punksmarketplace' ? 'CryptoPunks marketplace' : 
      data.platform
    template = template.replace(new RegExp('<platform>', 'g'), platform);
    template = template.replace(new RegExp('<additionalText>', 'g'), data.additionalText);


    if (config.enable_flashbot_detection && data.eventType !== 'loans')
      template += ` — Flashbots Protect RPC: ${this.isTransactionFlashbotted(data.transactionHash) ? 'Yes' : 'No'}`

    return template
  }

  getERC20Value(value: number, erc20Token: string, forcedSymbol:string|undefined=undefined) {
    const symbol = forcedSymbol !== undefined ? forcedSymbol 
      : erc20Token === 'dai' ? 'DAI' 
      : erc20Token === 'usdc' ? 'USDC' : 'Ξ'
    const precision = erc20Token === 'dai' ? 0 : erc20Token === 'usdc' ? 2 : 3
    const pattern = erc20Token === 'dai' ? '# !' : erc20Token === 'usdc' ? '# !' : '!#'
    const eth = currency(value, { symbol, precision, pattern });
    return eth
  }

  getFiatValue(value: number, erc20Token: string) {
    try {
      const fiatValue = fiatValues && Object.values(fiatValues).length ? 
        fiatValues[erc20Token][config.currency] * value : 
        undefined;
      return fiatValue != null ? currency(fiatValue, { symbol: fiatSymbols[config.currency].symbol, precision: 0 }) : undefined
    } catch (err) {
      logger.error(`cannot get fiat for ${erc20Token}`)
    }
    return undefined
  }
  
  async getImageFile(url: string): Promise<Buffer | undefined> {
    return new Promise((resolve, _) => {
      if (url.startsWith('http')) {
        this.http.get(url, { responseType: 'arraybuffer' }).subscribe((res) => {
          if (res.data) {
            const file = Buffer.from(res.data, 'binary');
            resolve(file);
          } else {
            resolve(undefined);
          }
        });
      } else {
        resolve(fs.readFileSync(url));
      }
    });
  }
  
  getCryptoToFiat(): Observable<any> {
    const endpoint = `https://api.coingecko.com/api/v3/simple/price`;
    const params = {
      ids: 'ethereum,dai,usdc',
      vs_currencies: 'usd'
    };
    return timer(0, 300000).pipe(
      switchMap(() => this.http.get(endpoint, {params})),
      map((res: any) => res.data),
      // tap((res) => console.log(res)),
      catchError((err: any) => {
        logger.warn('coin gecko call failed, ignoring fiat price', err.toString());
        return of(undefined);
      })
    );
  }

  transformImage(value: string): string {
    //return value.replace('https://gateway.pinata.cloud/ipfs/QmSv6qnW1zCqiYBHCJKbfBu8YAcJefUYtPsDea3TsG2PHz/notpunk', 'file://./token_images/phunk');
    let val: any = value;
    if (value?.includes('gateway.pinata.cloud')) {
      val = value.replace('gateway.pinata.cloud', 'cloudflare-ipfs.com');
    // } else if (value?.startsWith('data:image')) {
    //   val = `${value}`;
    } else if (value?.startsWith('ipfs://')) {
      val = value.replace('ipfs://', 'https://cloudflare-ipfs.com/ipfs/');
    }
    return val ? val : null;
  }

  async updatePosition(position) {
    await asyncfs.writeFile(this.getPositionFile(), `${position}`)    
  }

  getPositionFile():string {
    throw new Error('must be overriden')
  }

}

