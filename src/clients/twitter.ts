import { EUploadMimeType, TwitterApi } from 'twitter-api-v2';

export default class TwitterClient {
  
  client: TwitterApi;

  constructor() {
    this.client = process.env.hasOwnProperty('TWITTER_ACCESS_TOKEN_KEY') ? new TwitterApi({
      accessToken: process.env.TWITTER_ACCESS_TOKEN_KEY,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_KEY_SECRET,
    }) : undefined;    
  }
  
  uploadMedia(processedImage: Buffer, options: { mimeType: EUploadMimeType; }): string | PromiseLike<string> {
    return this.client.v1.uploadMedia(processedImage, options);
  }
  
  tweet(tweetText: string, options:any): any {
    return this.client.v2.tweet(tweetText, options)
  }
  
}