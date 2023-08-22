import { Test, TestingModule } from '@nestjs/testing';
import { Erc721SalesService } from './erc721sales.service';
import { HttpModule } from '@nestjs/axios';
import { ethers } from 'ethers';
import { config } from './config';
import erc721abi from './abi/erc721.json'

const COOLDOWN_BETWEEN_TESTS = 1500

describe('Erc721SalesService', () => {
  let service: Erc721SalesService;

  jest.setTimeout(60000) 

  beforeEach(async () => {
    //jest.useFakeTimers()

    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [Erc721SalesService],
    }).compile()

    service = module.get<Erc721SalesService>(Erc721SalesService)
  });

  it('should be defined', () => {
    expect(service).toBeDefined()
  });

  it('0xc4ac7389ff1f636c523cafb395629c7a897d1ab8895f7871ef2a4ec9c6700f89 - multiple nftx swaps', async () => {
    await delay(COOLDOWN_BETWEEN_TESTS)
    const provider = service.getWeb3Provider()
    config.contract_address = '0xf07468eAd8cf26c752C676E43C814FEe9c8CF402'
    const tokenContract = new ethers.Contract('0xf07468eAd8cf26c752C676E43C814FEe9c8CF402', erc721abi, provider);
    let filter = tokenContract.filters.Transfer();
    const startingBlock = 17967815    
    const events = await tokenContract.queryFilter(filter, 
      startingBlock, 
      startingBlock+1)
    const results = await Promise.all(events.map(async (e) => await service.getTransactionDetails(e)))
    //expect(results[0].alternateValue).toBe(0.31)
    let logs = ''
    results.forEach(r => {
      logs += `${r.tokenId} sold for ${r.alternateValue}\n`
    })

    for (const event of events) {
      const result = await service.getTransactionDetails(event)
      expect(result.alternateValue).toBe(0.3443333333333333)
    }
    console.log(logs)
  })
  it('0x28b859639993604a9b6c060deddede3e63c396134640cd03a6373fdc6bb8a6eb - single bid on blurio', async () => {
    await delay(COOLDOWN_BETWEEN_TESTS)
    const provider = service.getWeb3Provider()
    config.contract_address = '0xf07468eAd8cf26c752C676E43C814FEe9c8CF402'
    const tokenContract = new ethers.Contract('0xf07468eAd8cf26c752C676E43C814FEe9c8CF402', erc721abi, provider);
    let filter = tokenContract.filters.Transfer();
    const startingBlock = 17911072    
    const events = await tokenContract.queryFilter(filter, 
      startingBlock, 
      startingBlock+1)
    const results = await Promise.all(events.map(async (e) => await service.getTransactionDetails(e)))
    //expect(results[0].alternateValue).toBe(0.31)
    let logs = ''
    results.forEach(r => {
      logs += `${r.tokenId} sold for ${r.alternateValue}\n`
    })

    for (const event of events) {
      const result = await service.getTransactionDetails(event)
      expect(result.alternateValue).toBe(0.41)
    }
    console.log(logs)
  })

  it('blur single sale with ERC20 payment - 0x2212e9d1f1861e83b840fd8b5d5f7818c59e9c1f896d361abfcedb3eb722a26e', async () => {
    await delay(COOLDOWN_BETWEEN_TESTS)
    const provider = service.getWeb3Provider()
    config.contract_address = '0xf07468eAd8cf26c752C676E43C814FEe9c8CF402'
    const tokenContract = new ethers.Contract('0xf07468eAd8cf26c752C676E43C814FEe9c8CF402', erc721abi, provider);
    let filter = tokenContract.filters.Transfer();
    const startingBlock = 17893015    
    const events = await tokenContract.queryFilter(filter, 
      startingBlock, 
      startingBlock+1)
    const results = await Promise.all(events.map(async (e) => await service.getTransactionDetails(e)))
    expect(results[0].alternateValue).toBe(0.31)
    let logs = ''
    results.forEach(r => {
      logs += `${r.tokenId} sold for ${r.alternateValue}\n`
    })
    console.log(logs)
  })

  it('0x28b859639993604a9b6c060deddede3e63c396134640cd03a6373fdc6bb8a6eb - single bid on blurio', async () => {
    await delay(COOLDOWN_BETWEEN_TESTS)
    const provider = service.getWeb3Provider()
    config.contract_address = '0xA6Cd272874Ee7C872Eb66801Eff62784C0b13285'
    const tokenContract = new ethers.Contract('0xA6Cd272874Ee7C872Eb66801Eff62784C0b13285', erc721abi, provider);
    let filter = tokenContract.filters.Transfer();
    const startingBlock = 17899376    
    const events = await tokenContract.queryFilter(filter, 
      startingBlock, 
      startingBlock+1)
    const results = await Promise.all(events.map(async (e) => await service.getTransactionDetails(e)))
    //expect(results[0].alternateValue).toBe(0.31)
    let logs = ''
    results.forEach(r => {
      logs += `${r.tokenId} sold for ${r.alternateValue}\n`
    })
    console.log(logs)
  })

  it('blur single sale with ERC20 payment - 0x2212e9d1f1861e83b840fd8b5d5f7818c59e9c1f896d361abfcedb3eb722a26e', async () => {
    await delay(COOLDOWN_BETWEEN_TESTS)
    const provider = service.getWeb3Provider()
    config.contract_address = '0xA6Cd272874Ee7C872Eb66801Eff62784C0b13285'
    const tokenContract = new ethers.Contract('0xA6Cd272874Ee7C872Eb66801Eff62784C0b13285', erc721abi, provider);
    let filter = tokenContract.filters.Transfer();
    const startingBlock = 17893514    
    const events = await tokenContract.queryFilter(filter, 
      startingBlock, 
      startingBlock+1)
    const results = await Promise.all(events.map(async (e) => await service.getTransactionDetails(e)))
    //expect(results[0].alternateValue).toBe(0.31)
    let logs = ''
    results.forEach(r => {
      logs += `${r.tokenId} sold for ${r.alternateValue}\n`
    })
    console.log(logs)
  })
  
  it('looksrare sweeps of 4 tokens - 0x49dd3280b321fde32f633ca547159e2f3ed5cc9ceaf9e99e9921cbfb47fdc33d', async () => {
    await delay(COOLDOWN_BETWEEN_TESTS)
    const provider = service.getWeb3Provider()
    const tokenContract = new ethers.Contract('0x2ee6af0dff3a1ce3f7e3414c52c48fd50d73691e', erc721abi, provider);
    let filter = tokenContract.filters.Transfer();
    const startingBlock = 17888814    
    const events = await tokenContract.queryFilter(filter, 
      startingBlock, 
      startingBlock+1)
    const results = await Promise.all(events.map(async (e) => await service.getTransactionDetails(e)))
    expect(results[0].alternateValue).toBe(0.06965)
    expect(results[3].alternateValue).toBe(0.074625)
    let logs = ''
    results.forEach(r => {
      logs += `${r.tokenId} sold for ${r.alternateValue}\n`
    })
    console.log(logs)
  })

  it('blurio sweeps of 4 tokens - 0x6018d9290709e7d34c820b23820aaacf960af9c4f073b661136d49fc0994d6c9', async () => {
    await delay(COOLDOWN_BETWEEN_TESTS)
    const provider = service.getWeb3Provider()
    config.contract_address = '0xA6Cd272874Ee7C872Eb66801Eff62784C0b13285'
    const tokenContract = new ethers.Contract('0xA6Cd272874Ee7C872Eb66801Eff62784C0b13285', erc721abi, provider);
    let filter = tokenContract.filters.Transfer();
    const startingBlock = 17886451    
    const events = await tokenContract.queryFilter(filter, 
      startingBlock, 
      startingBlock+1)
    for (const event of events) {
        const result = await service.getTransactionDetails(event)
        expect(result.alternateValue).toBe(0.0413)
    }
  })
  
  /*
  it('should be able to post on discord', async () => {

    const tweetData:TweetRequest =  {
      from: '0x787...Fe83d',
      to: '0x5Ba...dcb29',
      tokenId: '5682',
      ether: 0,
      transactionHash: '0xee4724d86a4e7c07117b6656267e1e0769879615a4dffdabb69a57d7786345b2',
      alternateValue: 0.03,
      type: 0,
      imageUrl: './token_images/prefix5682.png'
    }
    await delay(1000)
    await service.discord(tweetData)
    
  });
  */
});

function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}