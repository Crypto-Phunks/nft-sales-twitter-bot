import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { exit } from "process";
import { ethers } from "ethers";
import phunkAuctionFlywheel from '../abi/phunkAuctionFlywheel.json';
import phunksAuctionHouse from '../abi/phunkAuctionHouse.json';
import { PhunksAuctionHouseService } from "./phunks.auction.house.extension.service";

async function bootstrap() {
  const args = require('yargs')
    .option('contract', { string: true })
    .option('tx', { string: true })
    .argv;

  if (!args.block) {
    console.log('missing --block=[ethereum block number] parameter')
    return
  }
  if (!args.tx) {
    console.log('missing --tx=[ethereum tx hash] parameter')
    return
  }

  global.doNotStartAutomatically = true

  console.log('starting up')
  const app = await NestFactory.createApplicationContext(AppModule);

  const auctionHouse = app.get(PhunksAuctionHouseService);

  auctionHouse.startProvider()
  await delay(5000)

  const provider = auctionHouse.getWeb3Provider()

  const tokenContract = new ethers.Contract(auctionHouse.contractAddress, phunksAuctionHouse, provider);
  let filter = tokenContract.filters.AuctionSettled();
  const block = args.block

  if (!args.dryRun || args.dryRun !== 'true') {
    const events = (await tokenContract.queryFilter(filter, 
        block, 
        block))
        //.filter(e => e.transactionHash === args.tx)
        
    for (let event of events)
      await auctionHouse.handleEvent(event)

    console.log('shuting down')

    await app.close();
    console.log('end')
    await delay(5000)
    exit(0)
  }
}

bootstrap();

function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}