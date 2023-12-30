<h1>Discord and Twitter NFT sales bot</h1>

[![coverage](https://crypto-phunks.github.io/nft-sales-twitter-bot/badge-lines.svg?update2)](https://crypto-phunks.github.io/nft-sales-twitter-bot/)
 
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

To setup the bot, lead to https://discord.com/developers and create an application and a bot, then invite the bot you just created using the following link: https://discord.com/api/oauth2/authorize?client_id=[yourDiscordAppclientId]&permissions=268512336&scope=bot%20applications.commands, then ensure that the invited bot is allowed to access the channel ID you want your bot to post into.

## Statistics module

You can enable the optional statistics module in the `AppModule` definition file `app.module.ts`. When
enabled, it will index the blockchain for the specified contract in the configuration, starting at 
block `statistic_initial_block`. Once indexed, the discord bot will reply to the following commands: 

- `/owned <wallet>` will display a list of the owned tokens by a wallet.
- `/wallet <wallet>` will display some statistics for a given wallet (owned token, days since the first owned tokens, total volume of transaction)
- `/volume <window>` will display a volume of transactions per marketplace.
- `/graph <wallet>` will display a graph showing the average price and the volume of transaction over time, the `wallet` parameter is optional and will filter out the data on the specified wallet.
- `/traders <window> <wallet>` will display the top 20 traders for the tracked collection over the specified time window, the `wallet` parameter is optional and will force the given wallet to be displayed along it's rank if it has traded at least one NFT over the specified period.
- `/index <block> <tx>` force indexation by the statistic module of the given transaction within the given block.
- `/transaction <tx>` displays indexed informations about a given transaction, usefull for debugging purpose.

The message templates for each command can be customized through the configuration file.

## DAO module

You can enable the optional DAO module in the `AppModule` definition file `app.module.ts`, it requires
the statistics module to be enabled as well. When enabled, it will make available commands to let users 
bind their web3 wallets to their discord account through the `/bind` command ; creating a bridge between 
web3 ownership tracability and discord community management features.

This binding enable a lot of possibilities:

- The bounded wallets can be used to grant specific roles on the configured discord server, check out the 
[sample configuration file](https://github.com/Crypto-Phunks/nft-sales-twitter-bot/blob/main/src/config.ts) to see 
how to grant roles for users owning a token of the collection, for the ones who originally minted the collection, 
or the ones owning tokens with a specific trait.

- The DAO module includes a voting mechanism that let the discord administrators to create polls for the communities,
these votes are anonymous and administrable through the `/createpoll <description> <duration> <roles>`, `/pollresults <id>`, 
and `/listpolls` commands. 


## CLI mode

You can use this app as a standalone cli using the following command line along with the `block` and `tx` parameter. The optional `contract` parameter can be used to override the contract from the configuration. ie:

```
npm run cli -- --action=tweet --contract=0xA6Cd272874Ee7C872Eb66801Eff62784C0b13285 --block=17886451 --tx=0x6018d9290709e7d34c820b23820aaacf960af9c4f073b661136d49fc0994d6c9
```

Will replay the given transaction and trigger the tweets detected within it. And:

```
npm run cli -- --action=index --contract=0xf07468eAd8cf26c752C676E43C814FEe9c8CF402 --block=14763639 --tx=0x1e0667e75e4aba0f5cb303d79969a7514ed1248b91889d2bb553863992ddff7e
```

Will index the given transaction into the statistics module.

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
