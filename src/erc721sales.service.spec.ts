import fetch from "node-fetch";

global.fetch = fetch as any

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

  afterAll(() => {
    if (service && service.getWeb3Provider())
      service.getWeb3Provider().destroy()
  });

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

  it('0x7f2f3801e01c10e22ea7d2f2e000b4c3925398f4d744e2a45c84bbe5edf4977e - weth sales seaport', async () => {
    await delay(COOLDOWN_BETWEEN_TESTS)
    const provider = service.getWeb3Provider()
    config.contract_address = '0xf07468eAd8cf26c752C676E43C814FEe9c8CF402'
    const tokenContract = new ethers.Contract('0xf07468eAd8cf26c752C676E43C814FEe9c8CF402', erc721abi, provider);
    let filter = tokenContract.filters.Transfer();
    const startingBlock = 18045958    
    const events = await tokenContract.queryFilter(filter, 
      startingBlock, 
      startingBlock+1)
    const results = await Promise.all(events.map(async (e) => await service.getTransactionDetails(e)))
    //expect(results[0].alternateValue).toBe(0.31)
    let logs = ''
    results.forEach(r => {
      logs += `${r.tokenId} sold for ${r.alternateValue}\n`
    })

    for (const result of results) {
      expect(result.alternateValue).toBe(0.281)
    }
    console.log(logs)
  })  

  it('0x7f2f3801e01c10e22ea7d2f2e000b4c3925398f4d744e2a45c84bbe5edf4977e - weth sales seaport', async () => {
    await delay(COOLDOWN_BETWEEN_TESTS)
    const provider = service.getWeb3Provider()
    config.contract_address = '0xf07468eAd8cf26c752C676E43C814FEe9c8CF402'
    const tokenContract = new ethers.Contract('0xf07468eAd8cf26c752C676E43C814FEe9c8CF402', erc721abi, provider);
    let filter = tokenContract.filters.Transfer();
    const startingBlock = 18049609    
    const events = await tokenContract.queryFilter(filter, 
      startingBlock, 
      startingBlock+1)
    const results = await Promise.all(events.map(async (e) => await service.getTransactionDetails(e)))
    //expect(results[0].alternateValue).toBe(0.31)
    let logs = ''
    results.forEach(r => {
      logs += `${r.tokenId} sold for ${r.alternateValue}\n`
    })

    for (const result of results) {
      //expect(result.alternateValue).toBe(0.281)
    }
    console.log(logs)
  })


  it('0xdb1487ac0e684123b22c3259e6971f5592f44c175b9e95b397228aca7330af00  - opensea flagged unknown', async () => {
    await delay(COOLDOWN_BETWEEN_TESTS)
    const provider = service.getWeb3Provider()
    config.contract_address = '0xf07468eAd8cf26c752C676E43C814FEe9c8CF402'
    const tokenContract = new ethers.Contract('0xf07468eAd8cf26c752C676E43C814FEe9c8CF402', erc721abi, provider);
    let filter = tokenContract.filters.Transfer();
    const startingBlock = 18143271        
    const events = await tokenContract.queryFilter(filter, 
      startingBlock, 
      startingBlock+1)
    const results = await Promise.all(events.map(async (e) => await service.getTransactionDetails(e)))
    //expect(results[0].alternateValue).toBe(0.31)
    let logs = ''
    const tweets = results.filter(t => t !== undefined)

    tweets.forEach(r => {
      logs += `${r.tokenId} sold for ${r.alternateValue}\n`
      expect(r.platform).toBe('opensea')
    })
    
    console.log(logs)
  })

  it('0x1d0b3582255e00ceffd75cbb9fff119fc719e074fb904147fa012cf9380b4536  - opensea exchange', async () => {
    await delay(COOLDOWN_BETWEEN_TESTS)
    const provider = service.getWeb3Provider()
    config.contract_address = '0xf07468eAd8cf26c752C676E43C814FEe9c8CF402'
    const tokenContract = new ethers.Contract('0xf07468eAd8cf26c752C676E43C814FEe9c8CF402', erc721abi, provider);
    let filter = tokenContract.filters.Transfer();
    const startingBlock = 18129140        
    const events = await tokenContract.queryFilter(filter, 
      startingBlock, 
      startingBlock+1)
    const results = await Promise.all(events.map(async (e) => await service.getTransactionDetails(e)))
    //expect(results[0].alternateValue).toBe(0.31)
    let logs = ''
    const tweets = results.filter(t => t !== undefined)

    // must be 0 to be ignored
    tweets.forEach(r => {
      expect(r.alternateValue).toBe(0)
      expect(r.ether).toBe(0)
    })
    
    console.log(logs)
  })

  it('0xa13c09a4b0dc88f5e1914aca92675a2f19498d173d0ea2ada5df4652467b9e5b  - nftx transaction involving swap', async () => {
    await delay(COOLDOWN_BETWEEN_TESTS)
    const provider = service.getWeb3Provider()
    config.contract_address = '0xf07468eAd8cf26c752C676E43C814FEe9c8CF402'
    const tokenContract = new ethers.Contract('0xf07468eAd8cf26c752C676E43C814FEe9c8CF402', erc721abi, provider);
    let filter = tokenContract.filters.Transfer();
    const startingBlock = 18124761        
    const events = await tokenContract.queryFilter(filter, 
      startingBlock, 
      startingBlock+1)
    const results = await Promise.all(events.map(async (e) => await service.getTransactionDetails(e)))
    //expect(results[0].alternateValue).toBe(0.31)
    let logs = ''
    const tweets = results.filter(t => t !== undefined)
    expect(tweets.length).toBe(0)

    console.log(logs)
  })

  it('0xa13c09a4b0dc88f5e1914aca92675a2f19498d173d0ea2ada5df4652467b9e5b  - nftx transaction involving swap', async () => {
    await delay(COOLDOWN_BETWEEN_TESTS)
    const provider = service.getWeb3Provider()
    config.contract_address = '0xf07468eAd8cf26c752C676E43C814FEe9c8CF402'
    const tokenContract = new ethers.Contract('0xf07468eAd8cf26c752C676E43C814FEe9c8CF402', erc721abi, provider);
    let filter = tokenContract.filters.Transfer();
    const startingBlock = 17968015        
    const events = await tokenContract.queryFilter(filter, 
      startingBlock, 
      startingBlock+1)
    const results = await Promise.all(events.map(async (e) => await service.getTransactionDetails(e)))
    //expect(results[0].alternateValue).toBe(0.31)
    let logs = ''
    results.forEach(r => {
      console.log(r)
      logs += `${r.tokenId} sold for ${r.alternateValue}\n`
      expect(r.alternateValue).toBe(0.3205)
    })

    console.log(logs)
  })

  it('0x5464119779617b8b270bd0defa3cc4aa69661afb71d9360b82ae7247d56aa231 - NFTX sale to vault', async () => {
    await delay(COOLDOWN_BETWEEN_TESTS)
    const provider = service.getWeb3Provider()
    config.contract_address = '0xf07468eAd8cf26c752C676E43C814FEe9c8CF402'
    const tokenContract = new ethers.Contract('0xf07468eAd8cf26c752C676E43C814FEe9c8CF402', erc721abi, provider);
    let filter = tokenContract.filters.Transfer();
    const startingBlock = 17994239                
    const events = await tokenContract.queryFilter(filter, 
      startingBlock, 
      startingBlock+1)
    const results = (await Promise.all(events.map(async (e) => await service.getTransactionDetails(e)))).filter(r => r !== undefined)

    let logs = ''
    results.forEach(r => {
      logs += `${r.tokenId} sold for ${r.alternateValue} to ${r.to}\n`
      expect(r.alternateValue).toBe(0.265)
    })
    expect(results.length).toBe(1)

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

    for (const result of results) {
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

  it('0xa467493e37f3058bcedce8314571b7c840cd3fbcfdb80b4a79fb63fe35fce6e5 - rarible', async () => {
    await delay(COOLDOWN_BETWEEN_TESTS)
    const provider = service.getWeb3Provider()
    config.contract_address = '0xf07468eAd8cf26c752C676E43C814FEe9c8CF402'
    const tokenContract = new ethers.Contract('0xf07468eAd8cf26c752C676E43C814FEe9c8CF402', erc721abi, provider);
    let filter = tokenContract.filters.Transfer();
    const startingBlock = 13810779    
    const events = await tokenContract.queryFilter(filter, 
      startingBlock, 
      startingBlock)
    const results = await Promise.all(events.map(async (e) => await service.getTransactionDetails(e)))
    //expect(results[0].alternateValue).toBe(0.31)
    let logs = ''
    results.filter(r => r !== undefined).forEach(r => {
      console.log(r)
      logs += `${r.tokenId} sold for ${r.alternateValue}\n`
      expect(r.alternateValue).toBe(3.1)
      expect(r.platform).toBe('rarible')
    })

    console.log(logs)
  })

  it('0x2ba78d3ad929320f02305a3ba19c0fcae3e51b542fd3050e350b6901482763e0 - cargo', async () => {
    await delay(COOLDOWN_BETWEEN_TESTS)
    const provider = service.getWeb3Provider()
    config.contract_address = '0xf07468eAd8cf26c752C676E43C814FEe9c8CF402'
    const tokenContract = new ethers.Contract('0xf07468eAd8cf26c752C676E43C814FEe9c8CF402', erc721abi, provider);
    let filter = tokenContract.filters.Transfer();
    const startingBlock = 13668889
    const events = await tokenContract.queryFilter(filter, 
      startingBlock, 
      startingBlock)
    const results = await Promise.all(events.map(async (e) => await service.getTransactionDetails(e)))
    //expect(results[0].alternateValue).toBe(0.31)
    let logs = ''
    results.filter(r => r !== undefined).forEach(r => {
      console.log(r)
      logs += `${r.tokenId} sold for ${r.alternateValue}\n`
      expect(r.alternateValue).toBe(3.69)
      expect(r.platform).toBe('cargo')
    })

    console.log(logs)
  })

  it('0x6a4c0b93d4efa39bcb3cb415886d1fcad6225aaf237243ce9f1b4daf0973844d  - x2y2', async () => {
    await delay(COOLDOWN_BETWEEN_TESTS)
    const provider = service.getWeb3Provider()
    config.contract_address = '0xf07468eAd8cf26c752C676E43C814FEe9c8CF402'
    const tokenContract = new ethers.Contract('0xf07468eAd8cf26c752C676E43C814FEe9c8CF402', erc721abi, provider);
    let filter = tokenContract.filters.Transfer();
    const startingBlock = 14573441
    const events = await tokenContract.queryFilter(filter, 
      startingBlock, 
      startingBlock+1)
    const results = await Promise.all(events.map(async (e) => await service.getTransactionDetails(e)))
    //expect(results[0].alternateValue).toBe(0.31)
    let logs = ''
    results.filter(r => r !== undefined).forEach(r => {
      console.log(r)
      logs += `${r.tokenId} sold for ${r.alternateValue}\n`
      expect(r.alternateValue).toBe(0.401)
      expect(r.platform).toBe('x2y2')
    })

    console.log(logs)
  })

  it('0xc97ef35170bb6b990c9e90a7df720741ba7a895c87a153e1d2d2ebd87c6b8913  - not larva labs', async () => {
    await delay(COOLDOWN_BETWEEN_TESTS)
    const provider = service.getWeb3Provider()
    config.contract_address = '0xf07468eAd8cf26c752C676E43C814FEe9c8CF402'
    const tokenContract = new ethers.Contract('0xf07468eAd8cf26c752C676E43C814FEe9c8CF402', erc721abi, provider);
    let filter = tokenContract.filters.Transfer();
    const startingBlock = 17750543
    const events = await tokenContract.queryFilter(filter, 
      startingBlock, 
      startingBlock+1)
    const results = await Promise.all(events.map(async (e) => await service.getTransactionDetails(e)))
    //expect(results[0].alternateValue).toBe(0.31)
    let logs = ''
    results.filter(r => r !== undefined).forEach(r => {
      console.log(r)
      logs += `${r.tokenId} sold for ${r.alternateValue}\n`
      expect(r.alternateValue).toBe(0.48)
      expect(r.platform).toBe('notlarvalabs')
    })

    console.log(logs)
  })
  
  it('0x5464119779617b8b270bd0defa3cc4aa69661afb71d9360b82ae7247d56aa231  - nftx transaction involving swap', async () => {
    await delay(COOLDOWN_BETWEEN_TESTS)
    const provider = service.getWeb3Provider()
    config.contract_address = '0xf07468eAd8cf26c752C676E43C814FEe9c8CF402'
    const tokenContract = new ethers.Contract('0xf07468eAd8cf26c752C676E43C814FEe9c8CF402', erc721abi, provider);
    let filter = tokenContract.filters.Transfer();
    const startingBlock = 17994239
    const events = await tokenContract.queryFilter(filter, 
      startingBlock, 
      startingBlock+1)
    const results = await Promise.all(events.map(async (e) => await service.getTransactionDetails(e)))
    //expect(results[0].alternateValue).toBe(0.31)
    let logs = ''
    results.filter(r => r !== undefined).forEach(r => {
      console.log(r)
      logs += `${r.tokenId} sold for ${r.alternateValue}\n`
      expect(r.alternateValue).toBe(0.265)
    })

    console.log(logs)
  })

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

  it('looksrare v2 sweeps of 4 tokens - 0x49dd3280b321fde32f633ca547159e2f3ed5cc9ceaf9e99e9921cbfb47fdc33d', async () => {
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

  it('0x10909724626f31751dd01c688525b78c3fb0fe425eddd78eea3c68ad8822b257 - looksrare v1', async () => {
    await delay(COOLDOWN_BETWEEN_TESTS)
    const provider = service.getWeb3Provider()
    config.contract_address = '0xf07468eAd8cf26c752C676E43C814FEe9c8CF402'
    const tokenContract = new ethers.Contract('0xf07468eAd8cf26c752C676E43C814FEe9c8CF402', erc721abi, provider);
    let filter = tokenContract.filters.Transfer();
    const startingBlock = 14083044
    const events = await tokenContract.queryFilter(filter, 
      startingBlock, 
      startingBlock)
    const results = await Promise.all(events.map(async (e) => await service.getTransactionDetails(e)))
    //expect(results[0].alternateValue).toBe(0.31)
    let logs = ''
    results.filter(r => r !== undefined).forEach(r => {
      console.log(r)
      logs += `${r.tokenId} sold for ${r.alternateValue}\n`
      expect(r.alternateValue).toBe(0.89)
      expect(r.platform).toBe('looksrare')
    })

    console.log(logs)
  })

  it('0x687cb0edb8c70e8d1317158fcf11b6c574786a89de7e8161617c5f12b01d0a67 - wyvern eth', async () => {
    await delay(COOLDOWN_BETWEEN_TESTS)
    const provider = service.getWeb3Provider()
    config.contract_address = '0xf07468eAd8cf26c752C676E43C814FEe9c8CF402'
    const tokenContract = new ethers.Contract('0xf07468eAd8cf26c752C676E43C814FEe9c8CF402', erc721abi, provider);
    let filter = tokenContract.filters.Transfer();
    const startingBlock = 12761067
    const events = await tokenContract.queryFilter(filter, 
      startingBlock, 
      startingBlock+1)
    const results = await Promise.all(events.map(async (e) => await service.getTransactionDetails(e)))
    //expect(results[0].alternateValue).toBe(0.31)
    let logs = ''
    results.filter(r => r !== undefined).forEach(r => {
      console.log(r)
      logs += `${r.tokenId} sold for ${r.alternateValue}\n`
      expect(r.alternateValue).toBe(0.04)
      expect(r.platform).toBe('opensea')
    })

    console.log(logs)
  })

  it('0x41bdc1e67cea96ede001bc76a48735a69db6e02c16ea823664e8f39f17e6835d - wyvern weth', async () => {
    await delay(COOLDOWN_BETWEEN_TESTS)
    const provider = service.getWeb3Provider()
    config.contract_address = '0xf07468eAd8cf26c752C676E43C814FEe9c8CF402'
    const tokenContract = new ethers.Contract('0xf07468eAd8cf26c752C676E43C814FEe9c8CF402', erc721abi, provider);
    let filter = tokenContract.filters.Transfer();
    const startingBlock = 12815010
    const events = await tokenContract.queryFilter(filter, 
      startingBlock, 
      startingBlock+1)
    const results = await Promise.all(events.map(async (e) => await service.getTransactionDetails(e)))
    //expect(results[0].alternateValue).toBe(0.31)
    let logs = ''
    results.filter(r => r !== undefined).forEach(r => {
      console.log(r)
      logs += `${r.tokenId} sold for ${r.alternateValue}\n`
      expect(r.alternateValue).toBe(2.0)
    })

    console.log(logs)
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