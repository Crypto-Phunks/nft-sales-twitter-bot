import { Body, Controller, Get, Post } from '@nestjs/common';
import fetch from "node-fetch";
import { BindTwitterRequestDto, BindWeb3RequestDto } from './models';
import { DAOService } from './dao.extension.service';
import { SignatureError } from './errors';
import { encrypt } from './crypto';
import TwitterClient from 'src/clients/twitter';

@Controller('dao')
export class DAOController {
  
  constructor(private daoService:DAOService) {
  }
  
  @Get('status')
  status(): string {
    return 'ok';
  }

  @Get('polls')
  polls(): string {
    const polls = this.daoService.getAllPolls()
    return polls;
  }

  @Post('bind/twitter')
  async bindTwitter(@Body() request: BindTwitterRequestDto):Promise<any> {
    console.log(request)
    try {
      const result = {result: 'ok'}
      const infos = await this.daoService.bindTwitterAccount(request)
      result['twitterId'] = infos.id
      result['twitterUsername'] = infos.username
      result['discordUserId'] = infos.discordUserId
      return result
    } catch (error) {
      console.log('error', error)
      return {result: 'ko'};
    }
  }

  @Post('bind/twitter/url')
  async getTwitterURL(): Promise<any> {
    const result = await this.daoService.startTwitterLogin() as any
    return {url: result.url};
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
