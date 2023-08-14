import { Client, TextChannel } from "discord.js";
import { config } from "../config";

export default class DiscordClient {

  client: Client;
  channel: TextChannel;
  setup: boolean;

  init() {
    this.client = new Client({ intents: [] });
    this.client.once('ready', async c => {
      console.log(`Ready! Logged in as ${c.user.tag}`);
      this.channel = await this.client.channels.fetch(config.discord_channel) as TextChannel
    });
    this.client.login(process.env.DISCORD_TOKEN);
    this.setup = true;
  }

  async send(text:string, image:string) {
    await this.channel.send({
        content: text,
        files: [image]
    });    
  }  
}