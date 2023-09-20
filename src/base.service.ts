import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import fs from 'fs';
import fiatSymbols from './fiat-symobols.json';
import { ethers } from 'ethers';
import { catchError, firstValueFrom, map, Observable, of, switchMap, timer } from 'rxjs';
import currency from 'currency.js';

import dotenv from 'dotenv';
dotenv.config();

import { config } from './config';
import TwitterClient from './clients/twitter';
import { EUploadMimeType } from 'twitter-api-v2';
import DiscordClient from './clients/discord';
import { createLogger } from './logging.utils';
import { HexColorString, MessageAttachment, MessageEmbed } from 'discord.js';

export const alchemyAPIUrl = 'https://eth-mainnet.alchemyapi.io/v2/';
export const alchemyAPIKey = process.env.ALCHEMY_API_KEY;
//const provider = ethers.getDefaultProvider(alchemyAPIUrl + alchemyAPIKey);
const provider = global.providerForceHTTPS ? 
  ethers.getDefaultProvider(process.env.GETH_NODE_ENDPOINT_HTTP) :
  ethers.getDefaultProvider(process.env.GETH_NODE_ENDPOINT);

const logger = createLogger('base.service')

if (!global.noWatchdog) {
  startWatchdog()
}

function startWatchdog() {
  return setTimeout(async () => {
    const timeoutInterval = setTimeout(() => {
      logger.warn(`Websocket connection hanged! Killing myself.`)
      process.exit(1)
    }, 10000);
    logger.info(`Checking websocket connection...`)
    const block = await provider.getBlockNumber()
    logger.info(`Websocket connection alive: ${block} !`)
    clearInterval(timeoutInterval)
    startWatchdog()
  }, 30000)  
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
  ether: number;
  transactionHash: string;
  transactionDate: string;
  alternateValue: number;
  imageUrl?: string;
  additionalText?: string;

}

@Injectable()
export class BaseService {
  
  fiatValues: any;

  twitterClient: TwitterClient;
  discordClient: DiscordClient;

  constructor(
    protected readonly http: HttpService
  ) {

    this.getEthToFiat().subscribe((fiat) => {
      if (fiat && fiat.ethereum && Object.values(fiat.ethereum).length)
        this.fiatValues = fiat.ethereum
    });
    this.twitterClient = new TwitterClient()
    this.discordClient = new DiscordClient()

  }

  initDiscordClient() {
    this.discordClient.init()
  }

  getWeb3Provider() {
      return provider
  }

  shortenAddress(address: string): string {
    const shortAddress = `${address.slice(0, 5)}...${address.slice(address.length - 5, address.length)}`;
    if (address.startsWith('0x')) return shortAddress;
    return address;
  }

  async getTokenMetadata(tokenId: string): Promise<any> {
    const url = alchemyAPIUrl + alchemyAPIKey + '/getNFTMetadata';
    return await firstValueFrom(
      this.http.get(url, {
        params: {
          contractAddress: config.contract_address,
          tokenId,
          tokenType: 'erc721'
        }
      }).pipe(
        map((res: any) => {
          return res?.data?.metadata?.image_url || res?.data?.metadata?.image || res?.data?.tokenUri?.gateway;
        }),
        catchError(() => {
          return of(null);
        })
      )
    );
  }

  async dispatch(data: TweetRequest) {
    const tweet = await this.tweet(data)
    await this.discord(data, tweet.id)
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

    const tweetText = this.formatText(data, template)
    
    // Format our image to base64
    const image = config.use_local_images ? data.imageUrl : this.transformImage(data.imageUrl);

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

    // Cash value
    const value = data.alternateValue && data.alternateValue > 0 ? data.alternateValue : data.ether
    const fiatValue = this.fiatValues && Object.values(this.fiatValues).length ? this.fiatValues[config.currency] * value : undefined;
    const fiat = fiatValue != null ? currency(fiatValue, { symbol: fiatSymbols[config.currency].symbol, precision: 0 }) : undefined;

    const ethValue = data.alternateValue ? data.alternateValue : data.ether;
    const eth = currency(ethValue, { symbol: 'Ξ', precision: 3 });

    // Replace tokens from config file
    template = template.replace(new RegExp('<tokenId>', 'g'), data.tokenId);
    template = template.replace(new RegExp('<ethPrice>', 'g'), eth.format());
    template = template.replace(new RegExp('<txHash>', 'g'), data.transactionHash);
    template = template.replace(new RegExp('<from>', 'g'), data.from);
    template = template.replace(new RegExp('<initialFrom>', 'g'), data.initialFrom);
    template = template.replace(new RegExp('<to>', 'g'), data.to);
    template = template.replace(new RegExp('<initialTo>', 'g'), data.initialTo);
    template = template.replace(new RegExp('<fiatPrice>', 'g'), fiat ? fiat.format() : '???');
    template = template.replace(new RegExp('<additionalText>', 'g'), data.additionalText);

    return template
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
  
  getEthToFiat(): Observable<any> {
    const endpoint = `https://api.coingecko.com/api/v3/simple/price`;
    const params = {
      ids: 'ethereum',
      vs_currencies: 'usd,aud,gbp,eur,cad,jpy,cny'
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

}

