import { Body, Request, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { BindTwitterRequestDto, BindWeb3RequestDto } from './models';
import { DAOService } from './dao.extension.service';
import { JwtService } from '@nestjs/jwt';
import { Signature } from 'ethers';
import { SignatureError } from './errors';
import { Wallet } from 'alchemy-sdk';
import { AuthGuard } from './auth.guard';

@Controller('dao')
export class DAOController {
  
  constructor(private daoService:DAOService,
    private jwtService: JwtService) {
  }
  
  @Get('status')
  status(): string {
    return 'ok';
  }

  @Get('polls')
  polls(): string {
    const polls = this.daoService.getAllPolls()
    polls.forEach(element => {
      element.allowed_emojis = element.allowed_emojis.split(" ")
    });
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

  @UseGuards(AuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(AuthGuard)
  @Post('vote')
  async vote(@Request() req) {
    return req.user;
  }  
  
  @Post('signin/web3')
  async web3Signin(@Body() request: {wallet:string, signature:string}): Promise<any> {
    await this.daoService.checkWeb3Signature(request)

    const user = this.daoService.getUserByWeb3Wallet(request.wallet)
    const payload = { sub: user.id, 
      wallet: request.wallet
    };    
    const result = {
      accessToken: await this.jwtService.signAsync(payload),
    };
    return result;
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
