import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { Erc721SalesService } from './erc721sales.service';
// import { PhunksBidService } from './extensions/phunks.bid.extension.service';
// import { PhunksAuctionHouseService } from './extensions/phunks.auction.house.extension.service';
import { PhunksAuctionFlywheelService } from './extensions/phunks.auction.flywheel.extension.service';
import { StatisticsService } from './extensions/statistics.extension.service';
import { PhunksBidService } from './extensions/phunks.bid.extension.service';
import { PhunksAuctionHouseService } from './extensions/phunks.auction.house.extension.service';
import { PhunksErc721SpecialisedSalesService } from './extensions/phunks.erc721.specialised.service/phunks.erc721.specialised.service';
import { PhunksGifTwitterService } from './extensions/phunks.gif.twitter.extension.service';
import { DAOService } from './extensions/dao/dao.extension.service';
import { DAOController } from './extensions/dao/dao.controller';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

export const providers = [
  Erc721SalesService,
  //PhunksErc721SpecialisedSalesService,
  ////
  // Below is a simple example of how to create and plug a custom 
  // extension to the bot
  ////
  //
  // PhunksBidService,
  // PhunksAuctionHouseService,
  // PhunksAuctionFlywheelService, 
  StatisticsService,
  DAOService,
  // PhunksGifTwitterService
]

@Module({
  imports: [
    HttpModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client'),
    })],
    providers,
    controllers: [
      DAOController
    ],

})

export class AppModule {

}
