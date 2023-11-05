import { BlurIOBasicParser } from "./parsers/blur.io.basic.parser";
import { BlurIOSalesParser } from "./parsers/blur.io.sales.parser";
import { BlurIOSweepParser } from "./parsers/blur.io.sweep.parser";
import { CargoParser } from "./parsers/cargo.parser";
import { LooksRareParser } from "./parsers/looksrare.parser";
import { LooksRareV2Parser } from "./parsers/looksrare.v2.parser";
import { NFTXParser } from "./parsers/nftx.parser";
import { NotLarvaLabsParser } from "./parsers/notlarvalabs.parser";
import { OpenSeaSeaportParser } from "./parsers/opensea.seaport.parser";
import { OpenSeaWyvernParser } from "./parsers/opensea.wyvern.parser";
import { LogParser } from "./parsers/parser.definition";
import { RaribleParser } from "./parsers/rarible.parser";
import { X2Y2Parser } from "./parsers/x2y2.parser";

export const config = {
  // Contract Address ======================================== //
  arcade_api_key: '4C77emHoAhekTX2Tf9DMHIRhTn39E2zKQDGTyV1ExWRaNzslW',
  contract_address: '0xf07468ead8cf26c752c676e43c814fee9c8cf402',
  nftx_vault_contract_address: '0xB39185e33E8c28e0BB3DbBCe24DA5dEA6379Ae91',
  // Enter the block where your contract has been created
  statistic_initial_block: 18035326,
  //
  discord_channels: '873564453227094081,840362318033846336',
  discord_client_id: '1140380440230887557',
  discord_guild_ids: '873564453227094078,840362318033846333',
  dao_requires_encryption_key: false,
  dao_roles: [
    {
      guildId: '873564453227094078',
      roleId: '1165395609499475979',
      gracePeriod: 60*60*24, // in seconds (1 day)
      minOwnedCount: 1,
      disallowAll: false,
    },
    {
      guildId: '873564453227094078',
      roleId: '1165397858397200394',
      minted: true
    },
    {
      guildId: '873564453227094078',
      roleId: '1170800536468062299',
      specificTrait: {
        traitType: 'Sex',
        traitValue: 'Zombie'
      }
    },
    {
      guildId: '873564453227094078',
      roleId: '1170806022500257822',
      specificTrait: {
        traitType: 'Sex',
        traitValue: 'Ape'
      }
    },
    {
      guildId: '873564453227094078',
      roleId: '1170806760844570684',
      specificTrait: {
        traitType: 'Sex',
        traitValue: 'Alien'
      },          
    }
  ],
  discord_empty_wallet_gifs: ['https://media.tenor.com/J3mNIbj6A4wAAAAd/empty-shelves-john-travolta.gif', 'https://media.tenor.com/NteLNqDJB2QAAAAd/out-of-stock-this-is-happening.gif'],
  //
  // uncomment the 2 lines above to use local images instead of retrieving images from ipfs for each tweet
  use_local_images: true,
  local_image_path: './token_images/phunk',
  use_forced_remote_image_path: false,
  forced_remote_image_path: 'https://cryptopunks.app/public/images/cryptopunks/punk<tokenId>.png',
  enable_flashbot_detection: true,
  // 
  // this is a configuration for the phunk bid demo extension
  local_bids_image_path: './bids_images/Phunk_',
  discord_owned_tokens_image_path: 'http://70.34.216.182/token_images/phunk<tokenId>.png',
  discord_footer_text: 'FLIP!',
  // this is a configuration for the phunk auction house demo extension
  local_auction_image_path: './token_images/phunk',
  token_metadata_cache_path: './token_metadatas_cache',
  //
  // Fiat Conversion Currency ================================ //
  // Available Options: ====================================== //
  // usd, aud, gbp, eur, cad, jpy, cny ======================= //
  currency: 'usd',
  // Message ================================================= //
  // Available Parameters: =================================== //
  // <tokenId> ==================== Token ID of transfered NFT //
  // <ethPrice> ================= Value of transactions in eth //
  // <fiatPrice> =============== Value of transactions in fiat //
  // <txHash> =========================== The transaction hash //
  // <from> ===================================== From address //
  // <to> ========================================= To address //
  ownedTokensMessageDiscord: '<wallet> owns <count> Phunks!',
  graphStatisticsMessageDiscord: '```fix\nHere is the graph you requested for [<wallet>]!```',
  userStatisticsMessageDiscord: 'Stats for <wallet>!\n```fix\n⏳ Flipped to Phunk for the first time [<holder_since>] days ago.\n💰 Flipped Phunks [<tx_count>] times with a total volume of [Ξ<volume>]\n💎 Is currently holding [<owned_tokens>] Phunks.```',
  globalStatisticsMessageDiscord: '```fix\nHere are volume stats for [<window>]! 💰\n\n<per_platform_stats>```\n```fix\nlast tx fetched [<last_event>]```',
  saleMessageDiscord: '[Phunk #<tokenId>](<tweetLink>) was flipped for [<ethPrice> (<fiatPrice>)](<https://etherscan.io/tx/<txHash>>)\nfrom: [<from>](<https://notlarvalabs.com/cryptophunks/phunkbox?address=<initialFrom>>)\nto: [<to>](<https://notlarvalabs.com/cryptophunks/phunkbox?address=<initialTo>>)',
  saleMessage: 'Phunk #<tokenId> was flipped for <ethPrice> (<fiatPrice>) by <to>\n| https://notlarvalabs.com/cryptophunks/details/<tokenId>\n',
  bidMessageDiscord: '[Phunk #<tokenId>](<tweetLink>) has a bid for [<ethPrice> (<fiatPrice>)](https://notlarvalabs.com/cryptophunks/details/<tokenId>)\nfrom: [<from>](<https://notlarvalabs.com/cryptophunks/phunkbox?address=<initialFrom>>)',
  bidMessage: 'Phunk #<tokenId> has a bid for <ethPrice> (<fiatPrice>) from <from>\n| https://notlarvalabs.com/cryptophunks/details/<tokenId>\n',
  flywheelMessageDiscord: '[Phunk #<tokenId>](<tweetLink>) was flipped to FlyWheel for [<ethPrice> (<fiatPrice>)](<https://etherscan.io/tx/<txHash>>)\nby: [<to>](<https://notlarvalabs.com/cryptophunks/phunkbox?address=<initialTo>>)',
  flywheelMessage: 'Phunk #<tokenId> was flipped to FlyWheel for <ethPrice> (<fiatPrice>) by <to>\n| https://notlarvalabs.com/cryptophunks/details/<tokenId>\n| https://phunks.pro',
  auctionMessageDiscord: '[Phunk #<tokenId>](<tweetLink>) was Auctioned for [<ethPrice> (<fiatPrice>)](<additionalText>)\nto: [<to>](<https://notlarvalabs.com/cryptophunks/phunkbox?address=<initialTo>>)',
  auctionMessage: 'Phunk #<tokenId> was Auctioned for <ethPrice> (<fiatPrice>) to <to>\n| https://notlarvalabs.com/cryptophunks/details/<tokenId>\n| <additionalText>',
  loanMessage: 'Phunk #<tokenId> was flipped for <ethPrice> (<fiatPrice>) by <to>\n| https://notlarvalabs.com/cryptophunks/details/<tokenId>\n',
  // Prefer ENS over 0x address (Uses more Alchemy requests) = //
  // Available Options: ====================================== //
  // true, false ============================================= //
  ens: true,
  // Include free mints in tweets ============================ //
  // Available Options: ====================================== //
  // true, false ============================================= //
  includeFreeMint: false,
  gifModuleMentionnedUserId: 1540024208255754241, 
  parsers: [
    new OpenSeaWyvernParser(),
    new OpenSeaSeaportParser(),
    new LooksRareParser(),
    new LooksRareV2Parser(),
    new NotLarvaLabsParser(),
    new X2Y2Parser(),
    new RaribleParser(),
    new CargoParser(),
    new NFTXParser(),
    new BlurIOBasicParser(),
    new BlurIOSalesParser(),
    new BlurIOSweepParser(), // must be the last blurio parsers
  ] as LogParser[],
  daoModuleListenAddress: 'phunk.cc' 
};