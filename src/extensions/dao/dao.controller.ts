import { Body, Controller, Get, Post } from '@nestjs/common';
import fetch from "node-fetch";
import { BindTwitterRequestDto, BindWeb3RequestDto } from './models';
import { DAOService } from './dao.extension.service';
import { SignatureError } from './errors';
import { encrypt } from './crypto';

@Controller('dao')
export class DAOController {

  constructor(private daoService:DAOService) {

  }
  
  @Get('status')
  status(): string {
    return 'ok';
  }

  @Post('bind/twitter')
  bindTwitter(@Body() request: BindTwitterRequestDto): any {
    console.log(request)
    try {
      this.daoService.bindTwitterAccount(request)
    } catch (error) {
      console.log('error', error)
      return {result: 'ko'};
    }
    return {result: 'ok'};
  }

  @Post('bind/web3')
  bind(@Body() request: BindWeb3RequestDto): any {
    console.log(request)
    try {
      // TODO handle guildId
      this.daoService.bindWeb3Account(request)
    } catch (error) {
      console.log('error', error)
      return {result: 'ko'};
    }
    return {result: 'ok'};
  }
}
