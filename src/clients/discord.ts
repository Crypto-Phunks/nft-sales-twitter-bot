import {
  Client,
  MessageAttachment,
  MessageEmbed,
  TextChannel,
} from 'discord.js';
import { config } from '../config';

export default class DiscordClient {
  client: Client;
  channels: TextChannel[] = [];
  setup: boolean;

  init() {
    if (!process.env.DISCORD_TOKEN) return;
    this.client = new Client({ intents: [] });
    this.client.once('ready', async (c) => {
      const channels = config.discord_channels.split(',');
      for (let channel of channels)
        this.channels.push(
          (await this.client.channels.fetch(channel)) as TextChannel,
        );
    });
    this.client.login(process.env.DISCORD_TOKEN);
    this.setup = true;
  }


  async sendEmbed(embed:MessageEmbed, image:string|Buffer, platform:string) {
    this.channels.forEach(async (channel) => {
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
    this.channels.forEach(async (channel) => {
      await channel.send({
        content: text,
        files: images,
      });
    });
  }
}
