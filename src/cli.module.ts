import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Erc721SalesService } from "./erc721sales.service";
import { exit } from "process";
import { config } from "./config";
import { ethers } from "ethers";
import erc721abi from './abi/erc721.json'
import { StatisticsService } from "./extensions/statistics.extension.service";

async function bootstrap() {
  const args = require('yargs')
    .option('contract', { string: true })
    .option('tx', { string: true })
    .argv;

  if (!args.action) {
    console.log('missing --action=[index or tweet] parameter')
    return
  }
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

  const saleService = app.get(Erc721SalesService);
  const statService = app.get(StatisticsService);

  saleService.startProvider()
  await delay(5000)

  const provider = saleService.getWeb3Provider()

  if (args.contract)
    config.contract_address = args.contract
  
  const tokenContract = new ethers.Contract(config.contract_address, erc721abi, provider);
  let filter = tokenContract.filters.Transfer();
  const block = args.block

  if (!args.dryRun || args.dryRun !== 'true') {

    const events = (await tokenContract.queryFilter(filter, 
      block, 
      block)).filter(e => e.transactionHash === args.tx)
        
    if (args.action === 'tweet') {
      const results = await Promise.all(
        events.map(async (e) => await saleService.getTransactionDetails(e))
      )
      
      let logs = ''
      results.filter(r => r !== undefined).forEach(r => {
        logs += `${r.tokenId} sold for ${r.alternateValue}\n`
      })
      console.log(logs)      
      for (let r of results) {
          await saleService.dispatch(r)
      }
    } else {
      statService.prepareStatements()
      await statService.handleEvents(events)
    }
  } else {
    console.log('not dispatching event ')
  }
  
  console.log('shuting down')

  await app.close();
  console.log('end')
  exit(0)
}
bootstrap();


function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}