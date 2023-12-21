import { SlashCommandBuilder } from '@discordjs/builders';
import fetch from "node-fetch";
import { HttpService } from '@nestjs/axios';
import { Injectable } from "@nestjs/common";
import { BaseService } from "../../base.service";
import { createLogger } from "src/logging.utils";
import Database from 'better-sqlite3'
import { REST } from '@discordjs/rest';
import { config } from '../../config';
import { PermissionFlagsBits, Routes } from 'discord-api-types/v9'
import { ethers } from 'ethers';
import { BindWeb3RequestDto, BindTwitterRequestDto, BindTwitterResultDto } from './models';
import { SignatureError } from './errors';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { StatisticsService } from '../statistics.extension.service';
import { ModuleRef } from '@nestjs/core';
import { providers } from 'src/app.module';
import { GuildMember, TextBasedChannel, TextChannel, ClientEvents, Interaction, Message, MessageEmbed, HexColorString } from 'discord.js';
import { format, formatDistance, parseISO } from 'date-fns';
import { unique } from 'src/utils/array.utils';
import { decrypt, encrypt } from './crypto';
import { de } from 'date-fns/locale';
import { utcToZonedTime } from 'date-fns-tz';

const logger = createLogger('dao.extension.service')

@Injectable()
export class DAOService extends BaseService {
  
  provider = this.getWeb3Provider();
  db = new Database(`${process.env.WORK_DIRECTORY || './'}dao.db.db` /*, { verbose: logger.info } */);  
  insert: any;
  positionCheck: any;
  positionUpdate: any;
  currentBlock: number;
  currentTwitterAuthRequests: Map<string, any> = new Map<string, any>();
  encryptionKeys: Map<string, string> = new Map<string,string>();

  constructor(
    protected readonly http: HttpService,
    private readonly moduleRef: ModuleRef
  ) {
    super(http)
    logger.info('created DAOService')
    
    this.discordClient.init(() => {
      this.registerCommands()
      this.start()


      if (config.dao_roles.length) {
        setTimeout(() => this.rebindActivePolls(), 3000)
        setTimeout(() => this.grantRoles(), 10000)
        setTimeout(() => this.handleEndedPolls(), 5000)
      }
    })
  }

  async rebindActivePolls() {
    const polls = this.getActivePolls()
    for (const poll of polls) {
      const channel = await this.discordClient.getClient().channels.fetch(poll.discord_channel_id.toString()) as TextChannel;
      console.log(`fetched ${poll.discord_channel_id} as ${channel}`)
      const voteMessage = await channel.messages.fetch(poll.discord_message_id)
      this.bindReactionCollector(voteMessage)
    }
  }

  async start() {

    if (config.dao_requires_encryption_key) {
      const guildsId = unique(config.dao_roles.map(r => r.guildId))
      for (const guildId of guildsId) {
        console.log(`fetching encryption key for ${guildId}`)
        
        const guild = this.discordClient.getClient().guilds.cache.get(guildId)
        const channels = await guild.channels.fetch()

        const channel = channels.find(channel => channel.name === 'setup-daoextension') as TextBasedChannel
        const lastMessage = await channel.messages.fetch(channel.lastMessageId)
        this.encryptionKeys.set(guildId, lastMessage.content)
        console.log(`fetched encryption key for ${guildId}`)
      }
    }
    this.db.prepare(
      `CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_user_id text NOT NULL,
        discord_username text NOT NULL,
        web3_public_key text NOT NULL UNIQUE
      );`,
    ).run();
    this.db.prepare(
      `CREATE TABLE IF NOT EXISTS twitter_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_user_id text NOT NULL UNIQUE,
        twitter_user_id text NOT NULL UNIQUE,
        twitter_created_at text NOT NULL,
        twitter_name text NOT NULL,
        twitter_username text NOT NULL,
        access_token text NOT NULL,
        refresh_token text
      );`,
    ).run();
    this.db.prepare(
      `CREATE TABLE IF NOT EXISTS polls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_guild_id text NOT NULL,
        discord_channel_id text NOT NULL,
        discord_message_id text NOT NULL,
        discord_role_id text,
        description text NOT NULL,
        until text NOT NULL,
        revealed boolean NOT NULL,
        allowed_emojis text NOT NULL,
        minimum_votes_required number,
        link text
      );`,
    ).run();
    this.db.prepare(
      `CREATE TABLE IF NOT EXISTS poll_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_guild_id text NOT NULL,
        discord_message_id text NOT NULL,
        discord_user_id text NOT NULL,
        vote_value text NOT NULL,
        voted_at text NOT NULL
      );`,
    ).run();
    this.db.prepare(
      `CREATE TABLE IF NOT EXISTS grace_periods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_guild_id text NOT NULL,
        discord_user_id text NOT NULL,
        discord_role_id text NOT NULL,
        until text NOT NULL
      );`,
    ).run();
  }

  async bounded(username:string) {

  }

  async grantRoles() {
    try {
      if (providers.indexOf(StatisticsService) >= 0) {
        // logger.info(`grantRoles()`)
        const statisticsService = this.moduleRef.get(StatisticsService);

        for (let conf of config.dao_roles) {
          const guild = await this.discordClient.getClient().guilds.fetch(conf.guildId)
          const role = await guild.roles.fetch(conf.roleId)
          const members = await guild.members.fetch({ force: true })
          for (const m of members) {
            const member = m[1]
            //logger.info(`checking ${member.displayName} for role ${role.name}`)
            const users = this.getUsersByDiscordUserId(member.id.toString()) ?? []
            const twitterUsers = this.getTwitterUsersByDiscordUserId(member.id.toString()) ?? []

            let conditionSucceeded = false            
            if (users.length || twitterUsers.length) {
              if (conf.minOwnedCount) {
                const owned = await statisticsService.getOwnedTokens(users.map(u => u.web3_public_key))
                conditionSucceeded = owned.length >= conf.minOwnedCount
                if (conditionSucceeded && conf.minOwnedTime) {
                  const maxOwnedTime = Math.max(...owned.map(o => o.owned_since))
                  
                  if (maxOwnedTime < conf.minOwnedTime) {
                    conditionSucceeded = false
                  }
                }
              } else if (conf.minted) {
                const numberMinted = await statisticsService.getMintedTokens(users.map(u => u.web3_public_key))
                conditionSucceeded = numberMinted.length > 0
              } else if (conf.twitter) {
                conditionSucceeded = true
                const twitterUser = this.getTwitterUsersByDiscordUserId(member.id.toString())
                if (!twitterUser.length) conditionSucceeded = false
                if (conditionSucceeded && conf.twitter.age) {
                  // check age
                  const beforeDate = format(new Date().getTime() - conf.twitter.age*1000, "yyyy-MM-dd'T'HH:mm:ss'Z'")

                  if (new Date(beforeDate).getTime() > new Date(twitterUser.twitter_created_at).getTime()) {
                    conditionSucceeded = false
                  }
                }
              } else if (conf.specificTrait) {
                const owned = await statisticsService.getOwnedTokens(users.map(u => u.web3_public_key))
                const matching = owned.map(async (o) => {
                  const tokenId = o.token_id.toString().padStart(4, '0')
                  const metadata = await this.getTokenMetadata(tokenId, false)
                  let result = false
                  if (conf.specificTrait.traitType) {
                    const toCheck = metadata.metadata.attributes.filter(a => a.trait_type === conf.specificTrait.traitType)
                    result = toCheck.length && toCheck[0].value === conf.specificTrait.traitValue
                  } else if (conf.specificTrait.hasOwnProperty('count')) {
                    result = metadata.metadata.attributes.length >= conf.specificTrait.count
                  }
                  return result ? o : undefined
                })
                let r = await Promise.all(matching)
                r = r.filter(o => o !== undefined)
                conditionSucceeded = r.length > 0
              }
            } 
            if (conditionSucceeded && !conf.disallowAll) {
              // console.log(`--> granting ${role.name} to ${member.displayName}`)
              await member.roles.add(role)  
              this.removeGracePeriod(conf.guildId, member.id, conf.roleId)
            } else {
              if (member.roles.cache.some(r => r.id === role.id)) {
                if (conf.gracePeriod) {
                  const existingGracePeriod = this.hasGracePeriod(conf.guildId, member.id, conf.roleId)
                  if (!existingGracePeriod) {
                    const endAt = format(new Date().getTime() + conf.gracePeriod*1000, "yyyy-MM-dd'T'HH:mm:ss'Z'")
                    this.setGracePeriod(conf.guildId, member.id, conf.roleId, endAt)
                  }
                } else {
                  if (conf.gracePeriod) {
                    this.removeGracePeriod(conf.guildId, member.id, conf.roleId)
                  }
                  if (member.roles.cache.some(r => r.id === role.id)) {
                    await member.roles.remove(role)
                  }
                }
              }
            }
          }
        }

        await this.handleGracePeriods()
        setTimeout(() => this.grantRoles(), 60000*5)        
      }
      /*
      guilds.roles.cache.find(role => role.name === "role name");
      member.roles.add(role);
      */
    } catch (err) {
      console.warn('cannot grant roles', err)
    }
  }
  
  async bindTwitterAccount(request: BindTwitterRequestDto) {
     const infos = this.currentTwitterAuthRequests.get(request.state)
     const twitterDatas = await this.twitterClient.finalizeLogin(infos, request)
     twitterDatas.discordUserId = infos.discord_user_id

    // encrypt datas
    if (config.dao_requires_encryption_key) {
      const key = this.encryptionKeys.values().next().value
      twitterDatas.id = encrypt(twitterDatas.id, key)
      twitterDatas.accessToken = encrypt(twitterDatas.accessToken, key)
      twitterDatas.refreshToken = encrypt(twitterDatas.refreshToken, key)
      twitterDatas.createdAt = encrypt(twitterDatas.createdAt, key)
      twitterDatas.name = encrypt(twitterDatas.name, key)
      twitterDatas.username = encrypt(twitterDatas.username, key)
      twitterDatas.discordUserId = encrypt(twitterDatas.discordUserId, key)
      twitterDatas.accessToken = encrypt(twitterDatas.accessToken, key)
      twitterDatas.refreshToken = encrypt(twitterDatas.refreshToken, key)
    }

    const stmt = this.db.prepare(`
      INSERT INTO twitter_accounts (discord_user_id, twitter_user_id, twitter_created_at, twitter_name, twitter_username, access_token, refresh_token)
      VALUES (@discordUserId, @id, @createdAt, @name, @username, @accessToken, @refreshToken)
      ON CONFLICT(discord_user_id) DO UPDATE 
      SET discord_user_id = excluded.discord_user_id, twitter_user_id = excluded.twitter_user_id,
          twitter_created_at = excluded.twitter_created_at, twitter_name = excluded.twitter_name,
          twitter_username = excluded.twitter_username, refresh_token = excluded.refresh_token,
          access_token = excluded.access_token
    `)
    stmt.run(twitterDatas)
  }

  async bindWeb3Account(request: BindWeb3RequestDto) {

    // TODO check discord account
    const { data } = await firstValueFrom(this.http.get('https://discord.com/api/users/@me', {
      headers: {
        authorization: `Bearer ${request.discordAccessToken}`,
      }
    }).pipe(
      catchError((error: AxiosError) => {
        logger.error(error)
        throw 'An error happened!';
      }),
    ))
    if (data.id != request.discordUserId) {
      throw new SignatureError('invalid discord user id')
    }
    const signerAddr = await ethers.verifyMessage('This signature is safe and will bind your wallet to your discord user ID.', request.signature);
    if (signerAddr.toLowerCase() !== request.account.toLowerCase()) {
      throw new SignatureError('invalid signature')
    }
    
    // encrypt datas
    if (config.dao_requires_encryption_key) {
      // TODO handle guild id
      const key = this.encryptionKeys.values().next().value
      request.account = encrypt(request.account, key)
      request.discordUsername = encrypt(request.discordUsername, key)
      request.discordUserId = encrypt(request.discordUserId, key)
    }

    //console.log('request', request)

    const stmt = this.db.prepare(`
      INSERT INTO accounts (discord_user_id, discord_username, web3_public_key)
      VALUES (@discordUserId, @discordUsername, @account)
      ON CONFLICT(web3_public_key) DO UPDATE SET discord_user_id = excluded.discord_user_id, discord_username = excluded.discord_username
    `)
    stmt.run(request)
  }

  hasGracePeriod(guildId: string, userId: string, roleId: string) {
    const stmt = this.db.prepare(`
      SELECT * FROM grace_periods
      WHERE discord_guild_id = @guildId AND
      discord_user_id = @userId AND
      discord_role_id = @roleId
    `)    
    return stmt.get({
      guildId, userId, roleId
    })
  }

  async handleGracePeriods() {
    const stmt = this.db.prepare(`
      SELECT * FROM grace_periods
      WHERE until < datetime()
    `)  
    const all = stmt.all()
    for (const row of all) {
      //console.log(row)
      const guild = await this.discordClient.getClient().guilds.fetch(row.discord_guild_id)
      const member = await guild.members.cache.get(row.discord_user_id)
      const role = await guild.roles.cache.get(row.discord_role_id)
      member.roles.remove(role)
      this.removeGracePeriod(row.discord_guild_id, row.discord_user_id, row.discord_role_id)
    }
    // logger.info('cleaned grace periods')
  }
  
  getActivePolls() {
    return this.db.prepare(`
      SELECT * FROM polls
      WHERE until > datetime() AND revealed = FALSE
    `).all()
  }

  getAllPolls() {
    return this.db.prepare(`
      SELECT * FROM polls ORDER BY until DESC
    `).all()
  }
  
  getPoll(messageId:string) {
    return this.db.prepare(`
      SELECT * FROM polls
      WHERE discord_message_id = :messageId
    `).get({messageId})
  }

  async closePoll(messageId:string) {
    this.db.prepare(`UPDATE polls SET until = DATETIME('now', '-5 minutes')
      WHERE discord_message_id = @messageId`)
      .run({messageId: messageId})
  }

  async deletePoll(messageId:string) {
    const poll = this.getPoll(messageId)
    if (poll === undefined) {
      logger.warn(`cannot find poll for message id ${messageId}`)
      return
    }
    this.db.prepare(`DELETE FROM polls
      WHERE discord_message_id = @messageId`)
      .run({messageId: messageId})
    const channel = await this.discordClient.getClient().channels.cache.get(poll.discord_channel_id) as TextChannel;      
    const voteMessage = await channel.messages.fetch(messageId)
    await voteMessage.edit(`Vote deleted.`)
    await voteMessage.reactions.removeAll()
  }

  async handleEndedPolls() {
    const stmt = this.db.prepare(`
      SELECT * FROM polls
      WHERE datetime(until) < datetime() AND revealed = FALSE
    `)  
    const all = stmt.all()
    for (const row of all) {
      //console.log(row)
      const votes = this.getPollResults(row.discord_message_id)
      let message = `${row.description}\n\nResults @everyone:\n———\n`
      votes.forEach(vote => {
        message += `${vote.vote_value}\t${vote.count}\n———\n`
      });
      message += `Poll ID: ${row.discord_message_id}\n`
      if (row.minimum_votes_required > 0) {
        message += `Minimum votes required was: ${row.minimum_votes_required}\n`
      }
      
      const channel = await this.discordClient.getClient().channels.cache.get(row.discord_channel_id) as TextChannel;
      if (!channel) {
        logger.warn(`cannot find channel for ended vote: ${row.discord_channel_id}`)
        continue
      }
      const titleText = `⏰ • Vote ended`
      const title = `${titleText} ${row.link ?? ''}` 

      const embed = new MessageEmbed()
        .setColor('#CCCCCC' as HexColorString)
        .setTitle(title)
        .setDescription(message)
        .setTimestamp();   
              
      const voteMessage = await channel.messages.fetch(row.discord_message_id)
      await voteMessage.edit({
        embeds: [embed]
      })
      await voteMessage.reactions.removeAll()
      this.db.prepare(`UPDATE polls SET revealed = TRUE WHERE discord_message_id = @messageId`).run({messageId: row.discord_message_id})
    }
    logger.info('cleaned end polls')
    setTimeout(() => this.handleEndedPolls(), 60000*10)
  }

  getPollResults(discord_message_id: any) {
    const votesStmt = this.db.prepare(`
        SELECT vote_value, count(*) as count FROM poll_votes
        WHERE discord_message_id = @messageId
        group by 1
      `)  
    return votesStmt.all({messageId: discord_message_id})
  }

  getDetailedPollResults(discord_message_id: any) {
    const votesStmt = this.db.prepare(`
        SELECT * FROM poll_votes
        WHERE discord_message_id = @messageId
        group by 1
      `)  
    return votesStmt.all({messageId: discord_message_id})
  }

  removeGracePeriod(guildId: string, userId: string, roleId: string) {
    const stmt = this.db.prepare(`
      DELETE FROM grace_periods 
      WHERE discord_guild_id = @guildId AND
      discord_user_id = @userId AND
      discord_role_id = @roleId
    `)    
    stmt.run({
      guildId, userId, roleId
    })
  }

  setGracePeriod(guildId:string, userId:string, roleId:string, until:string) {
    const stmt = this.db.prepare(`
      INSERT INTO grace_periods (discord_guild_id, discord_user_id, discord_role_id, until)
      VALUES (@guildId, @userId, @roleId, @until)
    `)    
    stmt.run({
      guildId, userId, roleId, until
    })
  }

  createPoll(guildId:string, channelId:string, messageId:string, roleId:string, description:string, until:Date, allowedEmojis:string, minimumVotesRequired:number, link:string) {
    const stmt = this.db.prepare(`
      INSERT INTO polls (discord_guild_id, discord_channel_id, discord_message_id, discord_role_id, description, until, revealed, allowed_emojis, minimum_votes_required, link)
      VALUES (@guildId, @channelId, @messageId, @roleId, @description, @until, false, @allowedEmojis, @minimumVotesRequired, @link)
    `)    
    const info = stmt.run({
      guildId, channelId, messageId, roleId, description, until: format(until, "yyyy-MM-dd'T'HH:mm:ss'Z'"), allowedEmojis, minimumVotesRequired, link
    })
    return info.lastInsertRowid
  }

  async createPollVote(guildId:string, messageId:string, userId:string, value:string) {
    const poll = this.db.prepare(`SELECT * FROM polls WHERE discord_message_id = @messageId`).get({messageId})
    if (poll.allowed_emojis.indexOf(value) === -1) {
      console.log('not an allowed emoji')
      return
    }
    const guild = this.discordClient.getClient().guilds.cache.get(guildId)
    const member = await guild.members.cache.get(userId)
    if (poll.discord_role_id && !member.roles.cache.has(poll.discord_role_id)) {
      try {
        const dm = await member.createDM(true)
        await dm.send("You don't have the required role to vote on this poll.")
      } catch (err) {
        // ignored, dm disabled by user
      }
      return
    } 
    this.db.prepare(`
      DELETE FROM poll_votes WHERE 
      discord_guild_id = @guildId AND
      discord_message_id = @messageId AND
      discord_user_id = @userId
    `).run({
      guildId, messageId, userId
    })
    const stmt = this.db.prepare(`
      INSERT INTO poll_votes (discord_guild_id, discord_message_id, discord_user_id, vote_value, voted_at)
      VALUES (@guildId, @messageId, @userId, @value, datetime())
    `)    
    stmt.run({
      guildId, messageId, userId, value
    })
    try {
      const dm = await member.createDM(true)
      await dm.send(`Your vote on https://discord.com/channels/${poll.discord_guild_id}/${poll.discord_channel_id}/${poll.discord_message_id} has been recorded.`)
    } catch (err) {
      // ignored, dm disabled by user
    }    

    // update poll message if a minimum number of votes is required
    const voteCount = this.getPollResults(messageId).reduce((a, b) => a + b.count, 0)
    const channel = await this.discordClient.getClient().channels.cache.get(poll.discord_channel_id) as TextChannel;
    if (!channel) {
      logger.warn(`cannot find channel for ended vote: ${poll.discord_channel_id}`)
      return
    }
    
    const until = parseISO(poll.until)
    const untilUTC = utcToZonedTime(until, 'Etc/UTC');

    const embed = this.formatVoteMessage(poll.description, untilUTC, poll.link, poll.discord_role_id, poll.minimum_votes_required, voteCount)
    const message = await channel.messages.fetch(poll.discord_message_id)
    await message.edit({
      embeds: [embed]
    })
  }

  async registerCommands() {
    
    const bindWeb3 = new SlashCommandBuilder()
      .setName('bindweb3')
      .setDescription('Bind your web3 wallet to your discord account')
    
    const bindTwitter = new SlashCommandBuilder()
      .setName('bindtwitter')
      .setDescription('Bind your twitter account to your discord account')
  
    const createPoll = new SlashCommandBuilder()
      .setName('createpoll')
      .setDescription('Create a new poll')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption(option => option.setName('description')
        .setDescription('The message displayed to other users')
        .setRequired(true))
      .addIntegerOption(option => option.setName('duration')
        .setDescription('The duration of the vote (in hours)')
        .setRequired(true))
      .addRoleOption(option => option.setName('role')
        .setDescription('The role required to cast a vote')
        .setRequired(false))
      .addStringOption(option => option.setName('emojis')
        .setDescription('The allowed emojis')
        .setRequired(false))
      .addStringOption(option => option.setName('link')
        .setDescription('An optional link')
        .setRequired(false))        
      .addStringOption(option => option.setName('minimumvotes')
        .setDescription('Requires a minimum number of votes')
        .setRequired(false))                
        
      const pollResults = new SlashCommandBuilder()
        .setName('pollresults')
        .setDescription('Get poll results')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => option.setName('id')
          .setDescription('The poll ID')
          .setRequired(true))

      const closePoll = new SlashCommandBuilder()
        .setName('closepoll')
        .setDescription('Close poll')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => option.setName('id')
          .setDescription('The poll ID')
          .setRequired(true))          

      const deletePoll = new SlashCommandBuilder()
        .setName('deletepoll')
        .setDescription('Delete poll')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => option.setName('id')
          .setDescription('The poll ID')
          .setRequired(true))          

      const listActivePolls = new SlashCommandBuilder()
        .setName('listpolls')
        .setDescription('List active polls')

    const bounded = new SlashCommandBuilder()
      .setName('bounded')
      .setDescription('Show the web3 wallets and social accounts bounded to your discord account')

    const commands = [
      bindTwitter.toJSON(),
      bindWeb3.toJSON(),
      bounded.toJSON(),
      createPoll.toJSON(),
      pollResults.toJSON(),
      closePoll.toJSON(),
      deletePoll.toJSON(),
      listActivePolls.toJSON()
    ]
    this.getDiscordCommands().push(...commands)

    const listener = async (interaction:Interaction) => {
      try {
        if (!interaction.isCommand()) return;
        if ('bindweb3' === interaction.commandName) {
          await interaction.deferReply({ephemeral: true})
          if (config.dao_requires_encryption_key && !this.encryptionKeys.has(interaction.guildId)) {
            interaction.editReply(`Please ask the admin to setup the encryption key first`)
          }          
          interaction.editReply(`[**Click here to bind your wallet.**](https://${config.daoModuleListenAddress}/)`)
        } else if ('bindtwitter' === interaction.commandName) {
          await interaction.deferReply({ephemeral: true})

          const result = await this.twitterClient.startLogin() as any
          result.discord_user_id = interaction.member.user.id
          this.currentTwitterAuthRequests.set(result.state, result)
               
          if (config.dao_requires_encryption_key && !this.encryptionKeys.has(interaction.guildId)) {
            interaction.editReply(`Please ask the admin to setup the encryption key first`)
          }          
          interaction.editReply(`[**Click here to bind your twitter account.**](${result.url})`)
        } else if ('listpolls' === interaction.commandName) {
          await interaction.deferReply({ephemeral: true})
          const polls = this.getActivePolls()
          let response = `**Active polls:**\n———\n`
          polls.forEach(poll => {
            let buffer = ''
            buffer += `\n**Description:**\n\n> ${poll.description.substring(0, 20)}...\n\n`
            buffer += `Active until: ${poll.until} UTC — <t:${Math.round(new Date(poll.until).getTime()/1000)}:R>\n`
            buffer += `Poll ID: ${poll.discord_message_id}\n`
            buffer += `🗳️ • [**Vote Here!**](<https://discord.com/channels/${poll.discord_guild_id}/${poll.discord_channel_id}/${poll.discord_message_id}>)\n\n`
            buffer += `———\n`

            if (response.length + buffer.length < 2000) {
              response += buffer
            }
          });
          interaction.editReply(response)
        } else if ('closepoll' === interaction.commandName) {
          await interaction.deferReply()
          const messageId = interaction.options.get('id')?.value as string
          this.closePoll(messageId)
          const response = `Poll closed.`
          this.handleEndedPolls()
          interaction.editReply(response)
        } else if ('deletepoll' === interaction.commandName) {
          await interaction.deferReply()
          const messageId = interaction.options.get('id')?.value as string
          this.deletePoll(messageId)
          const response = `Poll deleted.`
          this.handleEndedPolls()
          interaction.editReply(response)          
        } else if ('pollresults' === interaction.commandName) {
          await interaction.deferReply({ephemeral: true})
          const messageId = interaction.options.get('id')?.value as string
          const votes = this.getPollResults(messageId)

          let response = `Current results:\n———\n`
          votes.forEach(vote => {
            response += `${vote.vote_value}\t${vote.count}\n———\n`
          });
          response += `\nDetailed votes: \n\n`
          const voteDetails = this.getDetailedPollResults(messageId)
          voteDetails.forEach(vote => {
            response += `${vote.vote_value} <@${vote.discord_user_id}> (${vote.voted_at}) \n`
            if (response.length > 1500) {
              response += `\n——— continued in next message ———\n`
              interaction.followUp({ephemeral: true, content: response})
              response = ''
            }
          });
          
          interaction.followUp({ephemeral: true, content: response})

        } else if ('createpoll' === interaction.commandName) {
          await interaction.deferReply()
          const channel = await this.discordClient.getClient().channels.fetch(interaction.channelId) as TextChannel;
          //console.log(`fetched ${interaction.channelId} as ${channel}`)
          const description = interaction.options.get('description')?.value?.toString()
          const duration = interaction.options.get('duration')?.value as number
          const roleRequired = interaction.options.get('role')?.value as string
          const link = interaction.options.get('link')?.value as string
          const minimumVotesRequired = interaction.options.get('minimumvotes')?.value as number
          const until = new Date()
          until.setTime(new Date().getTime() + duration*60*60*1000)

          const embed = this.formatVoteMessage(description, until, link, roleRequired, minimumVotesRequired)

          if (embed.description.length >= 4000) {
            await interaction.editReply(`Your message is too long, please reduce it.`)
            return
          }
                      
          const message = await channel.send({
            embeds: [embed]
          })

          const allowedEmojis = interaction.options.get('emojis')?.value as string ?? '👍 👎'
          const emojis = Array.from(allowedEmojis)

          for (let i=0; i < emojis.length; i+=2) { 
            await message.react(emojis[i])
          }
          this.bindReactionCollector(message)

          const voteId = this.createPoll(interaction.guildId, interaction.channelId, message.id, roleRequired, description, until, allowedEmojis, minimumVotesRequired, link)
          interaction.editReply(`**Vote ID #${voteId}**`)
        } else if ('bounded' === interaction.commandName) {
          await interaction.deferReply({ephemeral: true})
          const users = this.getUsersByDiscordUserId(interaction.user.id.toString())
          const twitterUser = this.getTwitterUsersByDiscordUserId(interaction.user.id.toString())
          let response = ``
          if (users.length) {
            response += `\n———\n\nCurrently bound web3 wallet(s): \n`
            response += '```fix\n'
            for (const u of users) response += `${u.web3_public_key} \n`
            response += '```\n———\n\n'
          } else {
            response += `No web3 wallet bounded yet. Run /bindweb3 command. \n\n———\n`
          }
          if (twitterUser.length) {
            response += `Currently bound twitter account: \n`
            for (const u of twitterUser) {
              const age = formatDistance(new Date(u.twitter_created_at), new Date(), { addSuffix: true })
              response += `https://twitter.com/${u.twitter_username} (created ${age}) \n\n———\n`
            }
          } else {
            response += `No twitter account bounded yet. Run /bindtwitter command. \n\n———\n`
          }
          interaction.editReply(response)
        }
      } catch (err) {
        logger.error(err)
        console.log(err)
      }
    }
    this.getDiscordInteractionsListeners().push(listener)
  }

  formatVoteMessage(description:string, until:Date, link:string, roleRequired:string, minimumVotesRequired:number, voteCount:number=0) {
    //
    let msg = `${description}\n\nReact below to vote until the ${until.toLocaleDateString()} ${until.toLocaleTimeString()} UTC  — <t:${Math.round(new Date(until).getTime()/1000)}:R>`
    if (roleRequired) {
      msg += `\nRole required: <@&${roleRequired}>\n`
    }
    if (minimumVotesRequired) {
      const reached = voteCount >= minimumVotesRequired ? '✅' : '❌'
      msg += `\nMinimum votes required: ${minimumVotesRequired} (reached: ${reached})\n`
    }
    if (minimumVotesRequired || roleRequired) {
      msg += `\n———`
    }

    const titleText = '🗳️ • An admin just posted a new vote'
    const title = `${titleText} ${link ?? ''}` 

    const embed = new MessageEmbed()
      .setColor('#CCCCCC' as HexColorString)
      .setTitle(title)
      .setDescription(msg)
      .setTimestamp();   
    
    return embed
  }
  
  bindReactionCollector(message: Message) {
    console.log(`bindReactionCollector ${message}`)
    let collector = message.createReactionCollector({});

    collector.on('collect', async (reaction, user) => {
      //console.log('reaction added', reaction, user);
      await this.createPollVote(message.guildId, message.id, user.id, reaction.emoji.name)
      await reaction.users.remove(user)
    });
  }

  getUsersByDiscordUserId(id: string) {
    if (config.dao_requires_encryption_key) {
      // TODO handle guild id
      const key = this.encryptionKeys.values().next().value
      id = encrypt(id, key)
    }
    const rows = this.db.prepare(`
      SELECT * FROM accounts WHERE discord_user_id = @id
    `).all({id})
    if (config.dao_requires_encryption_key) {
      // TODO handle guild id
      const key = this.encryptionKeys.values().next().value
      for (const row of rows) {
        row.discord_user_id = decrypt(row.discord_user_id, key)
        row.discord_username = decrypt(row.discord_username, key)
        row.web3_public_key = decrypt(row.web3_public_key, key)
      }
    }
    return rows
  }

  getTwitterUsersByDiscordUserId(id: string) {
    if (config.dao_requires_encryption_key) {
      // TODO handle guild id
      const key = this.encryptionKeys.values().next().value
      id = encrypt(id, key)
    }
    const rows = this.db.prepare(`
      SELECT * FROM twitter_accounts WHERE discord_user_id = @id
    `).all({id})
    if (config.dao_requires_encryption_key) {
      // TODO handle guild id
      const key = this.encryptionKeys.values().next().value
      for (const row of rows) {
        row.discord_user_id = decrypt(row.discord_user_id, key)
        row.twitter_user_id = decrypt(row.twitter_user_id, key)
        row.twitter_created_at = decrypt(row.twitter_created_at, key)
        row.twitter_name = decrypt(row.twitter_name, key)
        row.twitter_username = decrypt(row.twitter_username, key)
        row.access_token = decrypt(row.access_token, key)
        row.refresh_token = decrypt(row.refresh_token, key)
      }
    }
    return rows
  }

  getUserByWeb3Wallet(wallet: string) {
    if (config.dao_requires_encryption_key) {
      // TODO handle guild id
      const key = this.encryptionKeys.values().next().value
      wallet = encrypt(wallet.toLowerCase(), key)
    }    
    
    const row = this.db.prepare(`
      SELECT * FROM accounts WHERE lower(web3_public_key) = lower(@wallet)
    `).get({wallet})

    // TODO handle guild id
    if (config.dao_requires_encryption_key && row) {
      const key = this.encryptionKeys.values().next().value
      row.discord_user_id = decrypt(row.discord_user_id, key)
      row.discord_username = decrypt(row.discord_username, key)
      row.web3_public_key = decrypt(row.web3_public_key, key)
    }
    return row
  }

}
