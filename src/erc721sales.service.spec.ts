import { Test, TestingModule } from '@nestjs/testing';
import { Erc721SalesService } from './erc721sales.service';
import { HttpModule } from '@nestjs/axios';
import { ethers } from 'ethers';
import { config } from './config';
import erc721abi from './abi/erc721.json'

describe('Erc721SalesService', () => {
  let service: Erc721SalesService;

  jest.setTimeout(30000) 

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

  it('blurio sweeps of 4 tokens - 0x6018d9290709e7d34c820b23820aaacf960af9c4f073b661136d49fc0994d6c9', async () => {
    const provider = service.getWeb3Provider()
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
});
