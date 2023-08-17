import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { Erc721SalesService } from './erc721sales.service';
// import { PhunksBidService } from './extensions/phunks.bid.extension.service';
// import { PhunksAuctionHouseService } from './extensions/phunks.auction.house.extension.service';
import { PhunksAuctionFlywheelService } from './extensions/phunks.auction.flywheel.extension.service';
import { StatisticsService } from './extensions/statistics.extension.service';
import { PhunksBidService } from './extensions/phunks.bid.extension.service';
import { PhunksAuctionHouseService } from './extensions/phunks.auction.house.extension.service';

@Module({
  imports: [HttpModule],
  controllers: [],
  providers: [
    Erc721SalesService, 
    ////
    // Below is a simple example of how to create and plug a custom 
    // extension to the bot
    ////
    //
    // PhunksBidService,
    // PhunksAuctionHouseService,
    // PhunksAuctionFlywheelService, 
    // StatisticsService
  ],
})

export class AppModule {

  constructor(private saleService:Erc721SalesService) {
    if (!global.doNotStartAutomatically)
      this.saleService.startProvider()
  }
}
