import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BaseService, TweetRequest } from '../base.service';
import needle from 'needle';
import { config } from '../config';
import { createLogger } from 'src/logging.utils';

const logger = createLogger('phunksauction.service')

const url = `https://api.twitter.com/2/users/${config.gifModuleMentionnedUserId}/mentions`;

@Injectable()
export class PhunksGifTwitterService extends BaseService {


  constructor(
    protected readonly http: HttpService,
  ) {
    super(http)
    logger.info('creating PhunksGifTwitterService')
    this.getUserMentions()

  }


  // this is the ID for @TwitterDev
  async getUserMentions() {
    await new Promise( resolve => setTimeout(resolve, 1000) );
    const t = this.twitterClient.client.v2.getActiveTokens()
    //const u = await this.twitterClient.client.v2.
    const r = await this.twitterClient.client.v2.userMentionTimeline(''+config.gifModuleMentionnedUserId)
    console.log(r)
    return
    let userMentions = [];
    let params = {
      "max_results": 100,
      "tweet.fields": "created_at"
    }

    const options = {
      headers: {
        "User-Agent": "v2UserMentionssJS",
        "authorization": `Bearer ${process.env.TWITTER_API_BEARER_TOKEN}`
      }
    }

    let hasNextPage = true;
    let nextToken = null;
    console.log("Retrieving mentions...");
    while (hasNextPage) {
      let resp = await this.getPage(params, options, nextToken);
      if (resp && resp.meta && resp.meta.result_count && resp.meta.result_count > 0) {
        if (resp.data) {
          userMentions.push.apply(userMentions, resp.data);
        }
        if (resp.meta.next_token) {
          nextToken = resp.meta.next_token;
        } else {
          hasNextPage = false;
        }
      } else {
        hasNextPage = false;
      }
    }

    console.dir(userMentions, {
      depth: null
    });

    console.log(`Got ${userMentions.length} mentions for user ID ${config.gifModuleMentionnedUserId}!`);

  }

  async getPage(params, options, nextToken) {
    if (nextToken) {
      params.pagination_token = nextToken;
    }

    try {
      const resp = await needle('get', url, params, options);

      if (resp.statusCode != 200) {
        console.log(`${resp.statusCode} ${resp.statusMessage}:\n${resp.body}`);
        return;
      }
      return resp.body;
    } catch (err) {
      throw new Error(`Request failed: ${err}`);
    }
  }

}
