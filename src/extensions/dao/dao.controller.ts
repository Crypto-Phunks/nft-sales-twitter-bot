import { Body, Request, Controller, Get, Post, UseGuards, Param } from '@nestjs/common';
import { BindTwitterRequestDto, BindWeb3RequestDto } from './models';
import { DAOService } from './dao.extension.service';
import { JwtService } from '@nestjs/jwt';
import { Signature } from 'ethers';
import { MissingRequirementsError, SignatureError } from './errors';
import { Wallet } from 'alchemy-sdk';
import { AuthGuard } from './auth.guard';
import { config } from '../../config';

@Controller('dao')
export class DAOController {
  
  constructor(private daoService:DAOService,
    private jwtService: JwtService) {
  }
  
  @Get('status')
  status(): string {
    return 'ok';
  }
  
  @Get('config')
  config() {
    return {
      discord: config.discord_connect,
    };
  }

  @Get('polls')
  polls(): string {
    const polls = this.daoService.getAllPolls({withoutRepost: true})
    polls.forEach(element => {
      element.allowed_emojis = element.allowed_emojis.split(" ")
      if (element.revealed) {
        element.results = this.daoService.getPollResults(element.id)
      }
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
    const { emoji, pollId } = req.query
    console.log('vote', emoji, pollId)
    try {
      await this.daoService.createPollVote('web', pollId, req.user.sub, emoji, req.ip)
    } catch (error: any) {
      console.log('error', error.message)
      if (error instanceof MissingRequirementsError)
        return {result: 'ko', requirements: error.requirements};
      return {result: 'ko', error: error.message};
    }
    return req.user;
  }  
  
  @Post('signin/web3')
  async web3Signin(@Body() request: {wallet:string, signature:string}): Promise<any> {
    await this.daoService.checkWeb3Signature(request)

    let user = this.daoService.getUserByWeb3Wallet(request.wallet)
    if (!user) {
      this.daoService.bindWeb3Account({
        account: request.wallet
      })
      user = this.daoService.getUserByWeb3Wallet(request.wallet)
    }
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

  @UseGuards(AuthGuard)
  @Post('bind/web3')
  bind(@Request() req, @Body() request: BindWeb3RequestDto): any {
    console.log(request)
    try {
      request.account = req.user.wallet
      this.daoService.bindWeb3Account(request)
    } catch (error) {
      console.log('error', error)
      return {result: 'ko'};
    }
    return {result: 'ok'};
  }
}
