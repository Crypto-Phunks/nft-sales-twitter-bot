import { config } from '../config';
import { BindTwitterRequestDto, BindTwitterResultDto } from 'src/extensions/dao/models';
import { EUploadMimeType, TwitterApi, UserV2Result } from 'twitter-api-v2';

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

  async startLogin() {
    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET
    })
    const result = client.generateOAuth2AuthLink(config.twitterAPIRedirectURL, {
        scope: ['tweet.read', 'users.read']
    })

    return result
  }

  async finalizeLogin(infos: any, request: BindTwitterRequestDto):Promise<BindTwitterResultDto> {
    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET
    })
    const { client: userClient, accessToken, refreshToken } = await client.loginWithOAuth2({
      code: request.code,
      codeVerifier: infos.codeVerifier,
      redirectUri: `${config.twitterAPIRedirectURL}`
    })
    console.log('client: ', userClient)
    const user = await userClient.currentUserV2()
    console.log('user', user)
    const currentUser = await userClient.v2.me({
      "user.fields": "created_at"
    })
    console.log('currentUser', currentUser)
    return {
      createdAt: currentUser.data.created_at,
      id: currentUser.data.id,
      name: currentUser.data.name,
      username: currentUser.data.username,
      accessToken,
      refreshToken
    }
    /*

currentUser {
  data: {
    created_at: '2021-08-11T19:58:06.000Z',
    id: '1425547057486520329',
    name: 'tat2bu.eth',
    username: 'tat2bu'
  }
}*/
  }
  
  uploadMedia(processedImage: Buffer, options: { mimeType: EUploadMimeType; }): string | PromiseLike<string> {
    this.client.appLogin
    return this.client.v1.uploadMedia(processedImage, options);
  }
  
  tweet(tweetText: string, options:any): any {
    return this.client.v2.tweet(tweetText, options)
  }
  
}