import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Erc721SalesService } from "./erc721sales.service";
import { exit } from "process";
import { config } from "./config";
import { ethers } from "ethers";
import erc721abi from './abi/erc721.json'

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

  global.doNotStartProvider = true

  console.log('starting up')
  const app = await NestFactory.createApplicationContext(AppModule);

  const service = app.get(Erc721SalesService);
  service.startProvider()
  await delay(5000)

  const provider = service.getWeb3Provider()

  if (args.contract)
    config.contract_address = args.contract
  
  const tokenContract = new ethers.Contract(config.contract_address, erc721abi, provider);
  let filter = tokenContract.filters.Transfer();
  const block = args.block
  const events = (await tokenContract.queryFilter(filter, 
    block, 
    block+1)).filter(e => e.transactionHash === args.tx)
  const results = await Promise.all(events.map(async (e) => await service.getTransactionDetails(e)))
  //expect(results[0].alternateValue).toBe(0.31)
  let logs = ''
  results.forEach(r => {
    logs += `${r.tokenId} sold for ${r.alternateValue}\n`
  })
  console.log(logs)

  if (!args.dryRun || args.dryRun !== 'true')
    for (let r of results)
      await service.dispatch(r)
  else
    console.log('not dispatching event ')

  console.log('shuting down')

  await app.close();
  console.log('end')
  exit(0)
}
bootstrap();


function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}