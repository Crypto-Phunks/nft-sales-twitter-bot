import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import fs from 'fs';
import fiatSymbols from './fiat-symobols.json';
import { EUploadMimeType, TwitterApi } from 'twitter-api-v2';

import { ethers } from 'ethers';

import { catchError, firstValueFrom, map, Observable, of, switchMap, timer } from 'rxjs';

import currency from 'currency.js';

import dotenv from 'dotenv';
dotenv.config();

import looksRareABI from './abi/looksRareABI.json';

import { config } from './config';
import { Client, TextChannel } from 'discord.js';

export const alchemyAPIUrl = 'https://eth-mainnet.alchemyapi.io/v2/';
export const alchemyAPIKey = process.env.ALCHEMY_API_KEY;

const tokenContractAddress = config.contract_address;

const provider = ethers.getDefaultProvider(alchemyAPIUrl + alchemyAPIKey);

const v2Client = process.env.hasOwnProperty('TWITTER_ACCESS_TOKEN_KEY') ? new TwitterApi({
  accessToken: process.env.TWITTER_ACCESS_TOKEN_KEY,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_KEY_SECRET,
}) : undefined;

export enum TweetType {
  SALE,
  AUCTION_SETTLED,
  FLYWHEEL_SOLD,
  BID_ENTERED
}

export interface TweetRequest {
  from: any;
  to?: any;
  tokenId: string;
  ether: number;
  transactionHash: string;
  alternateValue: number;
  imageUrl?: string;
  additionalText?: string;
  type:TweetType;
}

@Injectable()
export class BaseService {
  
  fiatValues: any;

  client:Client;
  channel: TextChannel;
  discordSetup: boolean = false;

  constructor(
    protected readonly http: HttpService
  ) {

    this.getEthToFiat().subscribe((fiat) => {
      if (fiat && fiat.ethereum && Object.values(fiat.ethereum).length)
        this.fiatValues = fiat.ethereum
    });

  }

  setupDiscordClient() {
    this.client = new Client({ intents: [] });
    this.client.once('ready', async c => {
        console.log(`Ready! Logged in as ${c.user.tag}`);
        this.channel = await this.client.channels.fetch(config.discord_channel) as TextChannel
    });
    this.client.login(process.env.DISCORD_TOKEN);
    this.discordSetup = true;    
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
          contractAddress: tokenContractAddress,
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

  async discord(data: TweetRequest, tweetId:string) {
    if (!this.discordSetup) return
    
    let template = config.saleMessageDiscord
    template = template.replace(new RegExp('<tweetLink>', 'g'), `<https://twitter.com/i/web/status/${tweetId}>`);
    const image = config.use_local_images ? data.imageUrl : this.transformImage(data.imageUrl);
    const tweetText = this.formatText(data, template)
    await this.channel.send({
        content: tweetText,
        files: [image]
    });
  }

  async tweet(data: TweetRequest) {

    let template: string = data.type === TweetType.SALE ? config.saleMessage : 
                            data.type === TweetType.BID_ENTERED ? config.bidMessage : 
                            data.type === TweetType.FLYWHEEL_SOLD ? config.flywheelMessage : config.auctionMessage;

    const tweetText = this.formatText(data, template)
    
    // Format our image to base64
    const image = config.use_local_images ? data.imageUrl : this.transformImage(data.imageUrl);

    let processedImage: Buffer | undefined;
    if (image) processedImage = await this.getImageFile(image);

    let media_id: string;
    if (processedImage) {
      // Upload the item's image to Twitter & retrieve a reference to it
      media_id = await v2Client.v1.uploadMedia(processedImage, {
        mimeType: EUploadMimeType.Png,
      });
    }

    // Post the tweet 👇
    // If you need access to this endpoint, you’ll need to apply for Elevated access via the Developer Portal. You can learn more here: https://developer.twitter.com/en/docs/twitter-api/getting-started/about-twitter-api#v2-access-leve
    const { data: createdTweet, errors: errors } = await v2Client.v2.tweet(
      tweetText,
      { media: { media_ids: [media_id] } },
    );
    if (!errors) {
      console.log(
        `Successfully tweeted: ${createdTweet.id} -> ${createdTweet.text}`,
      );
      return createdTweet;
    } else {
      console.error(errors);
      return null;
    }
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
    template = template.replace(new RegExp('<to>', 'g'), data.to);
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
        console.warn('coin gecko call failed, ignoring fiat price', err.toString());
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

