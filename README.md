<h1>Twitter NFT sales bot</h1>

[![coverage](https://crypto-phunks.github.io/nft-sales-twitter-bot/badge-lines.svg?update)](https://crypto-phunks.github.io/nft-sales-twitter-bot/)
 
## Description

Tweets real-time NFT sales for ERC721 Smart contracts

In order to use this you’ll need to apply for Elevated access via the Twitter Developer Portal. You can learn more [here](https://developer.twitter.com/en/docs/twitter-api/getting-started/about-twitter-api#v2-access-leve).

## Installation

```bash
$ npm install
```

1. Create `.env` file & add contents from `example.env` -- Add your API credentials.
2. Edit the `src/config.ts` file to add your smart contract & customize the tweet parameters.
3. Edit `src/erc721sales.service.ts` to customize for your use (Experienced users only & not a requirement).
4. Build & Deploy `npm run build`
5. Feel free to reach out on twitter

## Use local images

If you want to improve performances, you may want to use local images, to do so, simply
set the following variables in the configuration:

```
  use_local_images: true,
  local_image_path: './token_images/tokens',
```

The `local_image_path` will be suffixed with the token number, ie, here, it will seek for an image
named `./token_images/tokens0034.png` if the token #34 is sold.

## Plugins / extendability

You can create custom interactions by implementing custom extensions by extending the `BaseService` base
class, an example is provided in  the `extensions/phunks.bid.extension.service.ts`. Once implemented, you can activate an extension by importing it in the `AppModule` service providers, ie:

```
@Module({
  imports: [HttpModule],
  controllers: [],
  providers: [
    Erc721SalesService, 
    PhunksBidService,
  ],
})
```

## Discord support

Just add a `DISCORD_TOKEN` in your `.env` file, also add `saleMessageDiscord` and `discord_channel` keys. The later must contain the identifier of the channel you want the bot to post the sale events in. You'll also need the `local_image_path` containing tokens images.

You can add a link to the tweet that's been generated in the discord message using `<tweetLink>` in your `saleMessageDiscord` template.

To setup the bot, lead to https://discord.com/developers and create an application and a bot, then invite the bot you just created using the following link: https://discord.com/api/oauth2/authorize?client_id=[yourDiscordAppclientId]&permissions=2048&scope=bot then ensure that the invited bot is allowed to access the channel ID you want your bot to post into.

## CLI mode

You can use this app as a standalone cli using the following command line along with the `block` and `tx` parameter. The optional `contract` parameter can be used to override the contract from the configuration. ie:

```
npm run cli -- --contract=0xA6Cd272874Ee7C872Eb66801Eff62784C0b13285 --block=17886451 --tx=0x6018d9290709e7d34c820b23820aaacf960af9c4f073b661136d49fc0994d6c9
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Created by

The phunk community to serve the NFT space.

## License

Created using [Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.
Nest is [MIT licensed](LICENSE).
