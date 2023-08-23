export const config = {
  // Contract Address ======================================== //
  contract_address: '0xf07468eAd8cf26c752C676E43C814FEe9c8CF402',
  // Enter the block where your contract has been created
  statistic_initial_block: 12674389,
  //
  discord_channels: '919681244537716767,968448656221011981',
  discord_client_id: '1139547496033558561',
  discord_guild_ids: '880485569652740136,968448656221011978',
  discord_empty_wallet_gifs: ['https://media.tenor.com/J3mNIbj6A4wAAAAd/empty-shelves-john-travolta.gif', 'https://media.tenor.com/NteLNqDJB2QAAAAd/out-of-stock-this-is-happening.gif'],
  //
  // uncomment the 2 lines above to use local images instead of retrieving images from ipfs for each tweet
  use_local_images: true,
  local_image_path: './token_images/phunk',
  // 
  // this is a configuration for the phunk bid demo extension
  local_bids_image_path: './bids_images/Phunk_',
  discord_owned_tokens_image_path: 'http://70.34.216.182/token_images/phunk<tokenId>.png',
  discord_footer_text: 'FLIP!',
  // this is a configuration for the phunk auction house demo extension
  local_auction_image_path: './auction_images/phunk',
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
  ownedTokensMessageDiscord: 'Here are the <count> tokens owned by the wallet: `<wallet>`!\n\n-- Indexing in progress, last event indexed: `<last_event>`',
  graphStatisticsMessageDiscord: 'Here is the graph you requested (wallet: `<wallet>)`!\n\n-- Indexing in progress, last event indexed: `<last_event>`',
  userStatisticsMessageDiscord: 'Hey, here are the stats you requested about `<wallet>`!\n\n⏳ It holded a Cryptophunks for the first time <holder_since> days ago.\n💰 It executed <tx_count> transactions involving phunks with a total volume of <volume>Ξ.\n🧮 It is currently holding <owned_tokens> tokens.\n\n-- Indexing in progress, last event indexed: `<last_event>`',
  globalStatisticsMessageDiscord: 'Hey, here are the volume per platform (time window: <window>) ! 💰\n\nNot larva labs: <nll_volume>Ξ\nLooks rare: <lr_volume>Ξ\nBlur IO: <blurio_volume>Ξ\nNFTX: <nftx_volume>Ξ\nX2Y2: <x2y2_volume>Ξ\nOpensea: <os_volume>Ξ\nCargo: <cargo_volume>Ξ\nRarible: <rarible_volume>Ξ\nUnknown: <unknown_volume>Ξ\n—\nTotal: <total_volume>Ξ\n\n— Indexing in progress, last event indexed: `<last_event>`',
  saleMessageDiscord: '[Phunk #<tokenId>](<tweetLink>) was flipped for [<ethPrice> (<fiatPrice>)](<https://etherscan.io/tx/<txHash>>)\nfrom: [<from>](https://notlarvalabs.com/cryptophunks/phunkbox?address=<initialFrom>)\nto: [<to>](https://notlarvalabs.com/cryptophunks/phunkbox?address=<initialTo>)',
  saleMessage: '🚨 Cryptophunks #<tokenId> was sold for 💰 <ethPrice> (<fiatPrice>)\n\nfrom: <from>\nto: <to>\n\nhttps://etherscan.io/tx/<txHash>\nhttps://opensea.io/assets/0xf07468ead8cf26c752c676e43c814fee9c8cf402/<tokenId>\nhttps://looksrare.org/collections/0xf07468ead8cf26c752c676e43c814fee9c8cf402/<tokenId>\n',
  bidMessageDiscord: '🚨 Cryptophunks #<tokenId> received a bid for 💰 <ethPrice> (<fiatPrice>)\n\nfrom: <from>\n\nhttps://etherscan.io/tx/<txHash>\nhttps://opensea.io/assets/0xf07468ead8cf26c752c676e43c814fee9c8cf402/<tokenId>\nhttps://looksrare.org/collections/0xf07468ead8cf26c752c676e43c814fee9c8cf402/<tokenId>\n',
  bidMessage: '🚨 Cryptophunks #<tokenId> received a bid for 💰 <ethPrice> (<fiatPrice>)\n\nfrom: <from>\n\nhttps://etherscan.io/tx/<txHash>\nhttps://opensea.io/assets/0xf07468ead8cf26c752c676e43c814fee9c8cf402/<tokenId>\nhttps://looksrare.org/collections/0xf07468ead8cf26c752c676e43c814fee9c8cf402/<tokenId>\n',
  flywheelMessageDiscord: '🚨 Cryptophunks #<tokenId> has been sold to the auction flywheel for 💰 <ethPrice> (<fiatPrice>)\n\nfrom: <from>\n\nhttps://etherscan.io/tx/<txHash>\nhttps://opensea.io/assets/0xf07468ead8cf26c752c676e43c814fee9c8cf402/<tokenId>\nhttps://looksrare.org/collections/0xf07468ead8cf26c752c676e43c814fee9c8cf402/<tokenId>\nhttps://www.phunks.pro/\n',
  flywheelMessage: '🚨 Cryptophunks #<tokenId> has been sold to the auction flywheel for 💰 <ethPrice> (<fiatPrice>)\n\nfrom: <from>\n\nhttps://etherscan.io/tx/<txHash>\nhttps://opensea.io/assets/0xf07468ead8cf26c752c676e43c814fee9c8cf402/<tokenId>\nhttps://looksrare.org/collections/0xf07468ead8cf26c752c676e43c814fee9c8cf402/<tokenId>\nhttps://www.phunks.pro/\n',
  auctionMessageDiscord: '🚨 Cryptophunks #<tokenId> has been auctioned for 💰 <ethPrice> (<fiatPrice>)\n\nto: <to>\n\nhttps://etherscan.io/tx/<txHash>\nhttps://opensea.io/assets/0xf07468ead8cf26c752c676e43c814fee9c8cf402/<tokenId>\n<additionalText>\n',
  auctionMessage: '🚨 Cryptophunks #<tokenId> has been auctioned for 💰 <ethPrice> (<fiatPrice>)\n\nto: <to>\n\nhttps://etherscan.io/tx/<txHash>\nhttps://opensea.io/assets/0xf07468ead8cf26c752c676e43c814fee9c8cf402/<tokenId>\n<additionalText>\n',
  // Prefer ENS over 0x address (Uses more Alchemy requests) = //
  // Available Options: ====================================== //
  // true, false ============================================= //
  ens: true,
  // Include free mints in tweets ============================ //
  // Available Options: ====================================== //
  // true, false ============================================= //
  includeFreeMint: false,
};
