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
import { log } from 'winston';

const logger = createLogger('dao.extension.service')

@Injectable()
export class BasicMessagingService extends BaseService {
  
  constructor(
    protected readonly http: HttpService,
    private readonly moduleRef: ModuleRef
  ) {
    super(http)
    logger.info('created BasicMessagingService')
    
    this.discordClient.init(() => {
      this.registerCommands()
    })
  }

  async registerCommands() {
    
    const say = new SlashCommandBuilder()
      .setName('say')
      .setDescription('Ask the bot to post something in the current channel')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption(option => option.setName('message')
        .setDescription('The message to send')
        .setRequired(true))
    
    const commands = [
      say.toJSON(),
    ]
    this.getDiscordCommands().push(...commands)

    const listener = async (interaction:Interaction) => {
      try {
        if (!interaction.isCommand()) return;
        if ('say' === interaction.commandName) {
          const message = interaction.options.getString('message')
          logger.info(`say command received from ${interaction.user.username}}: ${message}`)
          await interaction.deferReply({ephemeral: true})  
          interaction.editReply(`Sent!`)
          const channel = interaction.channel as TextChannel
          await channel.send(message)
        }
      } catch (err) {
        logger.error(err)
        console.log(err)
      }
    }
    this.getDiscordInteractionsListeners().push(listener)
  }

}
