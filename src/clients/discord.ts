import fetch from "node-fetch";
import { config } from '../config';
import { Client, MessageAttachment, MessageEmbed, TextChannel } from "discord.js";
import { Routes } from "discord-api-types/v10";
import { REST } from "@discordjs/rest";

const discordCommands = []
let inited = false
const callbacks: Function[] = []
const interactionsListener:any[] = [];
let client: Client;
const channels: TextChannel[] = [];

export default class DiscordClient {
  
  getDiscordCommands() {
    return discordCommands
  }
  
  setup: boolean;

  getClient():Client {
    return client
  }

  getInteractionsListener() {
    return interactionsListener
  }

  init(callback:Function=undefined) {
    if (!process.env.DISCORD_TOKEN) return;
    if (!client) {
      console.log(`new discord client`)
      client = new Client({ intents: ['GUILD_MESSAGE_REACTIONS', 'GUILD_MEMBERS', 'MESSAGE_CONTENT'] });
      client.once('ready', async (c) => {
        
        console.log('logged in', c.user.username)
        const configurationChannels = config.discord_channels.split(',');
        for (let channel of configurationChannels) {
          console.log(`fetching ${channel}`)
          channels.push(
            (await client.channels.fetch(channel)) as TextChannel,
          );
        }
        const rest = new REST().setToken(process.env.DISCORD_TOKEN);
      
        const guildIds = config.discord_guild_ids.split(',')
    
        if (callback) callback()
        if (callbacks.length) callbacks.forEach(c => c())
  
        client.on('interactionCreate', (interaction) => {
          for (const listener of interactionsListener) {
            listener(interaction)
          }
        })
        guildIds.forEach(async (guildId) => {
          await rest.put(
            Routes.applicationGuildCommands(config.discord_client_id, guildId),
            { body: discordCommands },
          );    
        })              
      });      
    }
    if (!inited) {
      inited = true
      client.login(process.env.DISCORD_TOKEN);
    } else if (client.isReady()) {
      if (callback !== undefined) callback()
    } else {
      if (callback !== undefined) callbacks.push(callback)
    }
    this.setup = true;
  }


  async sendEmbed(embed:MessageEmbed, image:string|Buffer, platform:string) {
    channels.forEach(async (channel) => {
      await channel.send({
        embeds: [embed],
        files: [
          { attachment: image, name: 'token.png' },
          { attachment: platform, name: 'platform.png' },
        ],
      });
    });
  }

  async send(text: string, images: string[]) {
    channels.forEach(async (channel) => {
      await channel.send({
        content: text,
        files: images,
      });
    });
  }
}
