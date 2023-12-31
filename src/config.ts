import { DAORoleConfigurationDto } from "./extensions/dao/models";
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
  discord_channels: '919681244537716767,968448656221011981',
  discord_client_id: '1139547496033558561',
  discord_guild_ids: '880485569652740136,968448656221011978',
  dao_requires_encryption_key: false,
  dao_web_vote_requirements: [
    {
      name: 'Owned 1 Phunk for 30 days',
      roleId: '1190002144544305262',
      minOwnedCount: 1,
      minOwnedTime: 30, // in days
    },   
  ],
  dao_roles: [
    /*
    {
      guildId: '880485569652740136',
      roleId: '1157766800629563452',
      gracePeriod: 60*60*24, // in seconds (1 day)
      minOwnedCount: 1,
      minOwnedTime: 30, // in days
      disallowAll: false,
    },
    */

    {
      guildId: '968448656221011978',
      roleId: '1190002144544305262',
      minOwnedCount: 1,
      minOwnedTime: 30, // in days
    },   

    {
      guildId: '880485569652740136',
      roleId: '1170695892723056650',
      specificTrait: {
        count: 6
      }
    },   
/*
    {
      guildId: '880485569652740136',
      roleId: '1158041885454127284',
      minted: true
    },
    {
      guildId: '880485569652740136',
      roleId: '1170695892723056650',
      specificTrait: {
        traitType: 'Eyes',
        traitValue: 'Big Shades'
      }
    },
    */
   /*
    {
      guildId: '880485569652740136',
      roleId: '1175862565490921542',
      twitter: {
        verified: true,
        age: 60*60*24*30, // in seconds (1 month)
      }
    }
    */
  ] as DAORoleConfigurationDto[],
  discord_empty_wallet_gifs: ['https://media.tenor.com/J3mNIbj6A4wAAAAd/empty-shelves-john-travolta.gif', 'https://media.tenor.com/NteLNqDJB2QAAAAd/out-of-stock-this-is-happening.gif'],
  //
  // uncomment the 2 lines above to use local images instead of retrieving images from ipfs for each tweet
  use_local_images: true,
  local_image_path: './wrapped_punks/punk',
  use_forced_remote_image_path: false,
  forced_remote_image_path: 'https://cryptopunks.app/public/images/cryptopunks/punk<tokenId>.png',
  enable_flashbot_detection: true,
  // 
  // this is a configuration for the phunk bid demo extension
  local_bids_image_path: './bids_images/Phunk_',
  discord_owned_tokens_image_path: 'http://70.34.216.182/token_images/phunk<tokenId>.png',
  discord_footer_text: 'FLIP!',
  // this is a configuration for the phunk auction house demo extension
  local_auction_image_path: './auction_images/phunk',
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
  ownedTokensMessageDiscord: 'Here are the <count> tokens owned by the wallet(s): <wallet>!\n\n-- Indexing in progress, last event indexed: `<last_event>`',
  graphStatisticsMessageDiscord: 'Here is the graph you requested (wallet: `<wallet>)`!\n\n-- Indexing in progress, last event indexed: `<last_event>`',
  userStatisticsMessageDiscord: 'Hey, here are the stats you requested about `<wallet>` <user_mention>!\n\n⏳ It holded a Cryptophunks for the first time <holder_since> days ago.\n💰 It executed <tx_count> transactions involving phunks with a total volume of <volume>Ξ.\n🧮 It is currently holding <owned_tokens> tokens.\n\n-- Indexing in progress, last event indexed: `<last_event>`',
  globalStatisticsMessageDiscord: 'Hey, here are the volume per platform (time window: <window>) ! 💰\n\n```<per_platform_stats>```\n— Indexing in progress, last event indexed: `<last_event>`',
  saleMessageDiscord: '[Phunk #<tokenId>](<tweetLink>) was flipped for [<ethPrice> (<fiatPrice>)](<https://etherscan.io/tx/<txHash>>)\nfrom: [<from>](https://notlarvalabs.com/cryptophunks/phunkbox?address=<initialFrom>)\nto: [<to>](https://notlarvalabs.com/cryptophunks/phunkbox?address=<initialTo>)',
  saleMessage: '🚨 Cryptophunks #<tokenId> was sold for 💰 <ethPrice> (<fiatPrice>)\n\nfrom: <from>\nto: <to>\n\nhttps://etherscan.io/tx/<txHash>\nhttps://opensea.io/assets/0xf07468ead8cf26c752c676e43c814fee9c8cf402/<tokenId>\nhttps://looksrare.org/collections/0xf07468ead8cf26c752c676e43c814fee9c8cf402/<tokenId>\n',
  bidMessageDiscord: '[Phunk #<tokenId>](<tweetLink>) has a bid for [<ethPrice> (<fiatPrice>)](<https://etherscan.io/tx/<txHash>>)\nfrom: [<from>](<https://notlarvalabs.com/cryptophunks/phunkbox?address=<initialFrom>>)',
  bidMessage: '🚨 Cryptophunks #<tokenId> received a bid for 💰 <ethPrice> (<fiatPrice>)\n\nfrom: <from>\n\nhttps://etherscan.io/tx/<txHash>\nhttps://opensea.io/assets/0xf07468ead8cf26c752c676e43c814fee9c8cf402/<tokenId>\nhttps://looksrare.org/collections/0xf07468ead8cf26c752c676e43c814fee9c8cf402/<tokenId>\n',
  flywheelMessageDiscord: '🚨 Cryptophunks #<tokenId> has been sold to the auction flywheel for 💰 <ethPrice> (<fiatPrice>)\n\nfrom: <from>\n\nhttps://etherscan.io/tx/<txHash>\nhttps://opensea.io/assets/0xf07468ead8cf26c752c676e43c814fee9c8cf402/<tokenId>\nhttps://looksrare.org/collections/0xf07468ead8cf26c752c676e43c814fee9c8cf402/<tokenId>\nhttps://www.phunks.pro/\n',
  flywheelMessage: '🚨 Cryptophunks #<tokenId> has been sold to the auction flywheel for 💰 <ethPrice> (<fiatPrice>)\n\nfrom: <from>\n\nhttps://etherscan.io/tx/<txHash>\nhttps://opensea.io/assets/0xf07468ead8cf26c752c676e43c814fee9c8cf402/<tokenId>\nhttps://looksrare.org/collections/0xf07468ead8cf26c752c676e43c814fee9c8cf402/<tokenId>\nhttps://www.phunks.pro/\n',
  auctionMessageDiscord: '🚨 Cryptophunks #<tokenId> has been auctioned for 💰 <ethPrice> (<fiatPrice>)\n\nto: <to>\n\nhttps://etherscan.io/tx/<txHash>\nhttps://opensea.io/assets/0xf07468ead8cf26c752c676e43c814fee9c8cf402/<tokenId>\n<additionalText>\n',
  auctionMessage: '🚨 Cryptophunks #<tokenId> has been auctioned for 💰 <ethPrice> (<fiatPrice>)\n\nto: <to>\n\nhttps://etherscan.io/tx/<txHash>\nhttps://opensea.io/assets/0xf07468ead8cf26c752c676e43c814fee9c8cf402/<tokenId>\n<additionalText>\n',
  loanMessage: '🚨 Cryptophunks #<tokenId> has been auctioned for 💰 <ethPrice> (<fiatPrice>)\n\nto: <to>\n\nhttps://etherscan.io/tx/<txHash>\nhttps://opensea.io/assets/0xf07468ead8cf26c752c676e43c814fee9c8cf402/<tokenId>\n<additionalText>\n',
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
  daoModuleListenAddress: 'localhost',
  twitterAPIRedirectURL: `http://localhost:3000/twitter/`
};
