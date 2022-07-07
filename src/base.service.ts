import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import fs from 'fs';
import twit from 'twit';

import { ethers } from 'ethers';

import { catchError, firstValueFrom, map, Observable, of, switchMap, timer } from 'rxjs';

import currency from 'currency.js';

import dotenv from 'dotenv';
dotenv.config();

import looksRareABI from './abi/looksRareABI.json';

import { config } from './config';
import fiatSymbols from './fiat-symobols.json';

export const alchemyAPIUrl = 'https://eth-mainnet.alchemyapi.io/v2/';
export const alchemyAPIKey = process.env.ALCHEMY_API_KEY;

const tokenContractAddress = config.contract_address;

const provider = new ethers.providers.JsonRpcProvider(alchemyAPIUrl + alchemyAPIKey);

const twitterConfig = {
  consumer_key: process.env.TW_CONSUMER_KEY,
  consumer_secret: process.env.TW_CONSUMER_SECRET,
  access_token: process.env.TW_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TW_ACCESS_TOKEN_SECRET,
};

const twitterClient = new twit(twitterConfig);

export enum TweetType {
  SALE,
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
  type:TweetType;
}

@Injectable()
export class BaseService {
  
  fiatValues: any;

  constructor(
    protected readonly http: HttpService
  ) {

    this.getEthToFiat().subscribe((fiat) => this.fiatValues = fiat.ethereum);
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

  async tweet(data: TweetRequest) {

    let tweetText: string = data.type === TweetType.SALE ? config.saleMessage : config.bidMessage;

    // Cash value
    const fiatValue = this.fiatValues[config.currency] * (data.alternateValue ? data.alternateValue : data.ether);
    const fiat = currency(fiatValue, { symbol: fiatSymbols[config.currency].symbol, precision: 0 });

    const ethValue = data.alternateValue ? data.alternateValue : data.ether;
    const eth = currency(ethValue, { symbol: 'Ξ', precision: 3 });

    // Replace tokens from config file
    tweetText = tweetText.replace(new RegExp('<tokenId>', 'g'), data.tokenId);
    tweetText = tweetText.replace(new RegExp('<ethPrice>', 'g'), eth.format());
    tweetText = tweetText.replace(new RegExp('<txHash>', 'g'), data.transactionHash);
    tweetText = tweetText.replace(new RegExp('<from>', 'g'), data.from);
    tweetText = tweetText.replace(new RegExp('<to>', 'g'), data.to);
    tweetText = tweetText.replace(new RegExp('<fiatPrice>', 'g'), fiat.format());

    // Format our image to base64
    const image = config.use_local_images ? data.imageUrl : this.transformImage(data.imageUrl);

    let processedImage: string;
    if (image) processedImage = await this.getBase64(image);

    let media_ids: Array<string>;
    if (processedImage) {
      // Upload the item's image to Twitter & retrieve a reference to it
      media_ids = await new Promise((resolve) => {
        twitterClient.post('media/upload', { media_data: processedImage }, (error, media: any) => {
          resolve(error ? null : [media.media_id_string]);
        });
      });
    }

    let tweet: any = { status: tweetText };
    if (media_ids) tweet.media_ids = media_ids;

    // Post the tweet 👇
    // If you need access to this endpoint, you’ll need to apply for Elevated access via the Developer Portal. You can learn more here: https://developer.twitter.com/en/docs/twitter-api/getting-started/about-twitter-api#v2-access-leve
    twitterClient.post('statuses/update', tweet, (error) => {
      if (!error) console.log(`Successfully tweeted: ${tweetText}`);
      else console.error(error);
    });
  }

  async getBase64(url: string) {
    if (url.startsWith('http')) {
      return await firstValueFrom(
        this.http.get(url, { responseType: 'arraybuffer' }).pipe(
          map((res) => Buffer.from(res.data, 'binary').toString('base64')),
          catchError(() => of(null))
        )
      );
    } else {
      return fs.readFileSync(url, {encoding: 'base64'});
    }
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
        console.log(err);
        return of({});
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
