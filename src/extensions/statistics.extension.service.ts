import { createCanvas, loadImage } from 'canvas';
import { Injectable } from '@nestjs/common';
import { format } from 'date-fns';
import { Chart as ChartJS, ChartConfiguration, ChartComponentLike } from 'chart.js';
import { ChartJSNodeCanvas, ChartCallback } from 'chartjs-node-canvas'
import erc721abi from '../abi/erc721.json'
import { HttpService } from '@nestjs/axios';
import { BaseService } from '../base.service';
import { ethers } from 'ethers';
import { config } from '../config';
import { Erc721SalesService } from 'src/erc721sales.service';
import Database from 'better-sqlite3'
import rl from 'readline-sync'
import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'
import { createLogger } from 'src/logging.utils';

const logger = createLogger('statistics.service')

@Injectable()
export class StatisticsService extends BaseService {
  
  provider = this.getWeb3Provider();
  db = new Database(`${process.env.WORK_DIRECTORY || './'}db.db` /*, { verbose: logger.info } */);  
  insert: any;
  positionCheck: any;
  positionUpdate: any;
  currentBlock: number;

  constructor(
    protected readonly http: HttpService,
    protected readonly erc721service: Erc721SalesService,
  ) {
    super(http)
    logger.info('creating StatisticsService')
    this.discordClient.init()
    
    if (!global.doNotStartAutomatically)
      this.start()
    this.registerCommands()
  }

  async registerCommands() {
    //https://discord.com/api/oauth2/authorize?client_id=1139547496033558561&permissions=2048&scope=bot%20applications.commands

    // await delay(10000)

    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    
    const userStats = new SlashCommandBuilder()
      .setName('userstats')
      .setDescription('Get statistics about a wallet')
      .addStringOption(option =>
        option.setName('wallet')
          .setDescription('Wallet address or ENS name (leave empty to ignore this filter)')
          .setRequired(true));
    
    const sample = new SlashCommandBuilder()
      .setName('sample')
      .setDescription('Shout a sample transaction for testing purpose')
    
    const ownedTokens = new SlashCommandBuilder()
      .setName('owned')
      .setDescription('Get owned tokens from a wallet')
      .addStringOption(option =>
        option.setName('wallet')
          .setDescription('Wallet address or ENS name')
          .setRequired(true));

    const checkTransaction = new SlashCommandBuilder()
      .setName('transaction')
      .setDescription('Get index informations about a given transaction')
      .addStringOption(option =>
        option.setName('tx')
          .setDescription('Transaction hash')
          .setRequired(true));

    const status = new SlashCommandBuilder()
      .setName('status')
      .setDescription('Get current indexer status')
      
    const indexTransaction = new SlashCommandBuilder()
      .setName('index')
      .setDescription('Get index informations about a given transaction')
      .addStringOption(option =>
        option.setName('block')
          .setDescription('Block number')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('tx')
          .setDescription('Transaction hash')
          .setRequired(true));

    const volumeStats = new SlashCommandBuilder()
      .setName('volume')
      .setDescription('Get volume statistics')
      .addStringOption(option =>
        option.setName('window')
          .setDescription('Time window')          
          .setChoices({
            name: '24 hours',
            value: '24h'
          }, {
            name: '7 days',
            value: '7d'
          }, {
            name: '1 month',
            value: '1m'
          }, {
            name: '1 year',
            value: '1y'
          }, {
            name: 'All times',
            value: 'overall'
          })
          .setRequired(true));

    const topTraders = new SlashCommandBuilder()
      .setName('traders')
      .setDescription('Get top traders for a given period')
      .addStringOption(option =>
        option.setName('window')
          .setDescription('Time window')

          .setChoices({
            name: '24 hours',
            value: '1 day'
          }, {
            name: '7 days',
            value: '7 days'
          }, {
            name: '1 month',
            value: '1 month'
          }, {
            name: '1 year',
            value: '1 year'
          }, {
            name: 'All times',
            value: '300 years'
          })
          .setRequired(true))
      .addStringOption(option =>
        option.setName('wallet')
          .setDescription('Force inclusion of the given wallet (optional)'));

    const graphStats = new SlashCommandBuilder()
      .setName('graph')
      .setDescription('Generate graph')
      .addStringOption(option =>
        option.setName('wallet')
          .setDescription('Restrict to the given wallet')
      )

    const guildIds = config.discord_guild_ids.split(',')
    const commands = [
      status.toJSON(),
      userStats.toJSON(), 
      topTraders.toJSON(), 
      volumeStats.toJSON(), 
      graphStats.toJSON(), 
      checkTransaction.toJSON(),
      indexTransaction.toJSON(),
      ownedTokens.toJSON() ]
    if (process.env.DEBUG_MODE === 'true') {
      commands.push(sample.toJSON())
    }
    guildIds.forEach(async (guildId) => {
      await rest.put(
        Routes.applicationGuildCommands(config.discord_client_id, guildId),
        { body: commands },
      );    
    })

    this.discordClient.client.on('interactionCreate', async (interaction) => {
      try {
        if (!interaction.isCommand()) return;
        if ('sample' === interaction.commandName) {
          await this.discord({
            logIndex: 146,
            eventType: 'sale',
            initialFrom: '0x7e5ccBf79f81baF0430a9eD8208580c7157F143C',
            initialTo: '0xB39185e33E8c28e0BB3DbBCe24DA5dEA6379Ae91',
            from: '0x7e5...F143C',
            to: '0xB39...9Ae91',
            tokenId: '9608',
            ether: 0,
            transactionHash: '0xa13c09a4b0dc88f5e1914aca92675a2f19498d173d0ea2ada5df4652467b9e5b',
            transactionDate: '2023-08-22T04:57:35.000Z',
            alternateValue: 0.3205,
            platform: 'nftx',
            imageUrl: './token_images/phunk9608.png'
          })
        } else if ('status' === interaction.commandName) {
          await interaction.deferReply()
          interaction.editReply(`Running, current block ${this.currentBlock}...`)
        } else if ('index' === interaction.commandName) {
          await interaction.deferReply()
          const tx = interaction.options.get('tx').value.toString()
          const block = parseInt(interaction.options.get('block').value.toString())
          const tokenContract = new ethers.Contract(config.contract_address, erc721abi, this.getWeb3Provider());
          let filter = tokenContract.filters.Transfer();
  
          const events = (await tokenContract.queryFilter(filter, 
            block, 
            block))
            .filter(e => e.transactionHash === tx)
          
          const count = events.length
          await this.handleEvents(events)
          interaction.editReply(`succesfully indexed ${count} blockchain transfer events for \`${tx}\`...`)
        } else if ('transaction' === interaction.commandName) {
          await interaction.deferReply()
          const tx = interaction.options.get('tx').value.toString()
          const result = await this.getTransaction(tx)
          let template = `Indexed informations for ${tx}: \n\n`
          let txs = []
          let reduced = false
          for (let r of result) {
            txs.push(`
Token:    ${r.token_id}
From:     ${r.from_wallet}
To:       ${r.to_wallet}
Platform: ${r.platform}
Amount:   ${'Ξ'+(Math.floor(r.amount*100)/100).toFixed(2)}`)
          }
          if (txs.length > 0) template += '---'
          template += `${txs.join('\n---')}\n`

          interaction.editReply({
            content: 'Here are the logs for this transaction.',
            files: [{
              attachment: Buffer.from(template, 'utf-8'),
              name: 'transaction.txt'
            }]
          })
        } else if ('traders' === interaction.commandName) {
          await interaction.deferReply()
          const wallet = interaction.options.get('wallet')?.value?.toString()
          const window = interaction.options.get('window').value.toString()
          const result = await this.getTopTraders(wallet, window)
          let template = `Top traders over (${window}): \`\`\`\n\n`
          for (let r of result) {
            template += `${r.rank.toString().padStart(5, ' ')}  ${r.wallet.padEnd(45, ' ')}  ${('Ξ'+(Math.floor(r.volume*100)/100).toFixed(2)).padStart(10, ' ')}\n`
          }
          template += `\`\`\`\n`
          interaction.editReply(template)
        } else if ('owned' === interaction.commandName) {
          await interaction.deferReply()
          const wallet = interaction.options.get('wallet').value.toString()
          let lookupWallet = wallet
          let ensisedWallet = wallet
          try {
            if (!lookupWallet.startsWith('0x')) {
              // try to find the matching wallet
              const address = await this.provider.resolveName(`${wallet}`);
              if (address) lookupWallet = address
            }
            if (wallet.startsWith('0x')) {
              // try to lookup a matching ENS name
              const ens = await this.provider.lookupAddress(`${wallet}`);
              if (ens) ensisedWallet = ens
            }
          } catch (err) {
            logger.warn(`cannot lookup wallet ${lookupWallet}`)
          }
          const tokens = await this.getOwnedTokens(lookupWallet)
          if (!tokens.length) {
            await interaction.editReply({
              content: `Empty wallet: ${wallet}`,
              files: [config.discord_empty_wallet_gifs[Math.floor(Math.random()*config.discord_empty_wallet_gifs.length)]]
            });     
          } else {
            //const tokensUrl = tokens.map((token) => config.discord_owned_tokens_image_path.replace(new RegExp('<tokenId>', 'g'), `${token.token_id}`.padStart(4, '0')))
            const tokensIds = tokens.map((token) => `#${token.token_id}`)
            const lastEvent = await this.lastEvent()

            // generate an image containing the tokens 
            const MAX_IMAGE_WIDTH = 1000
            let imagesPerLine = Math.ceil(Math.sqrt(tokens.length))
            let linesCount = Math.ceil(tokens.length/imagesPerLine)
            let oneImageWidth = 100
            // reduce this if it doesn't fit
            if (imagesPerLine*oneImageWidth > MAX_IMAGE_WIDTH) {
              oneImageWidth = Math.floor(MAX_IMAGE_WIDTH/imagesPerLine)
            }
            const imageWidth = imagesPerLine*oneImageWidth
            const canvas = createCanvas(imagesPerLine*oneImageWidth, linesCount*oneImageWidth)
            const context = canvas.getContext('2d')
            context.imageSmoothingEnabled = false
            let x = 0, y = 0
            for (let token of tokens) {
              const imageUrl = `${config.local_image_path}${token.token_id.toString().padStart(4, '0')}.png`
              const tokenImageData = await this.getImageFile(imageUrl)

              const tokenImage = await loadImage(tokenImageData)
              logger.info(imageUrl, x, y, oneImageWidth)
              context.drawImage(tokenImage, x, y, oneImageWidth, oneImageWidth);

              //outputImage.drawImage(tokenImage, x, y)
              x += oneImageWidth
              if (x >= imageWidth) {
                x = 0
                y += oneImageWidth
              }
            }

            let template = config.ownedTokensMessageDiscord
            template = template.replace(new RegExp('<wallet>', 'g'), ensisedWallet);
            template = template.replace(new RegExp('<tokens>', 'g'), tokensIds.join(', '));
            template = template.replace(new RegExp('<count>', 'g'), tokensIds.length);
            template = template.replace(new RegExp('<last_event>', 'g'), lastEvent.last_event);
            template = template.replace(new RegExp('<current_block>', 'g'), `${this.currentBlock}`);

            await interaction.editReply({
              content: template,
              files: [canvas.toBuffer('image/png')]
            });
          }
        } else if ('graph' === interaction.commandName) {
          await interaction.deferReply()
          const wallet = interaction.options.get('wallet')?.value.toString()
          let lookupWallet = wallet
          if (lookupWallet && !lookupWallet.startsWith('0x')) {
            // try to find the matching wallet
            const address = await this.provider.resolveName(`${wallet}`);
            if (address) lookupWallet = address
          }
          let ensisedWallet = wallet          
          const lastEvent = await this.lastEvent()
          let template = config.graphStatisticsMessageDiscord
          template = template.replace(new RegExp('<last_event>', 'g'), lastEvent.last_event);
          template = template.replace(new RegExp('<current_block>', 'g'), `${this.currentBlock}`);
          template = template.replace(new RegExp('<wallet>', 'g'), ensisedWallet ?? 'all');

          const buffer = await this.generateChart(lookupWallet)
          await interaction.editReply({
            content: template,
            files: [buffer]
          });
        } else if ('userstats' === interaction.commandName) {          
          await interaction.deferReply()
          const wallet = interaction.options.get('wallet').value.toString()
          let lookupWallet = wallet
          if (!lookupWallet.startsWith('0x')) {
            // try to find the matching wallet
            const address = await this.provider.resolveName(`${wallet}`);
            if (address) lookupWallet = address
          }
          const stats = await this.userStatistics(lookupWallet)
          let ensisedWallet = wallet
          if (wallet.startsWith('0x')) {
            // try to lookup a matching ENS name
            const ens = await this.provider.lookupAddress(`${wallet}`);
            if (ens) ensisedWallet = ens
          }

          let template = config.userStatisticsMessageDiscord
          template = template.replace(new RegExp('<last_event>', 'g'), stats.last_event);
          template = template.replace(new RegExp('<wallet>', 'g'), ensisedWallet);
          template = template.replace(new RegExp('<tx_count>', 'g'), stats.transactions);
          template = template.replace(new RegExp('<volume>', 'g'), `${Math.round(stats.volume*100)/100}`);
          template = template.replace(new RegExp('<holder_since>', 'g'), stats.holder_since_days);
          template = template.replace(new RegExp('<owned_tokens>', 'g'), stats.owned_tokens);
          template = template.replace(new RegExp('<current_block>', 'g'), `${this.currentBlock}`);

          await interaction.editReply(template);
        } else if ('volume' === interaction.commandName) {
          await interaction.deferReply()
          const window = interaction.options.get('window').value.toString()
          const stats = await this.globalStatistics(window)
          const lastEvent = await this.lastEvent()
          const totalVolume = `${Math.round(stats.reduce((previous, current) => previous + current.volume, 0)*100)/100}`
          let template = config.globalStatisticsMessageDiscord
          template = template.replace(new RegExp('<last_event>', 'g'), lastEvent.last_event);
          template = template.replace(new RegExp('<window>', 'g'), interaction.options.get('window').value.toString());

          const platforms = [
            {
              key: 'notlarvalabs',
              templateKey: '<nll_volume>',
              name: 'Not Larva Labs',
              volume: '0'
            },
            {
              key: 'looksrare',
              templateKey: '<lr_volume>',
              name: 'Looks Rare',
              volume: '0'
            },
            {
              key: 'nftx',
              templateKey: '<nftx_volume>',
              name: 'NFTX',
              volume: '0'
            },
            {
              key: 'opensea',
              templateKey: '<os_volume>',
              name: 'Open Sea',
              volume: '0'
            },
            {
              key: 'blurio',
              templateKey: '<blurio_volume>',
              name: 'Blur IO',
              volume: '0'
            },
            {
              key: 'x2y2',
              templateKey: '<x2y2_volume>',
              name: 'X2Y2',
              volume: '0'
            },
            {
              key: 'cargo',
              templateKey: '<cargo_volume>',
              name: 'Cargo',
              volume: '0'
            },
            {
              key: 'rarible',
              templateKey: '<rarible_volume>',
              name: 'Rarible',
              volume: '0'
            },
            {
              key: 'unknown',
              templateKey: '<unknown_volume>',
              name: 'Unknown',
              volume: '0'
            },
          ]
          let perPlatformStat = ''
          for (let platform of platforms) {
            const result = this.getPlatformStats(platform.key, stats)
            platform.volume = result
          }
          platforms.sort((p1, p2) => parseFloat(p2.volume) - parseFloat(p1.volume))
          for (let platform of platforms) {
            if (platform.volume > '0') {
              perPlatformStat += `${platform.name.padEnd(17, ' ')} Ξ${platform.volume}\n`
            }
          }
          perPlatformStat += `—\nTotal             Ξ${totalVolume}`
          template = template.replace(new RegExp('<per_platform_stats>', 'g'), perPlatformStat);
          template = template.replace(new RegExp('<current_block>', 'g'), `${this.currentBlock}`);

          await interaction.editReply(template);          
        }
      } catch (err) {
        logger.info(err)
      }
    });      
  }

getOwnedTokens(wallet:string) {
  const sql = `select token_id,
  ceil(JULIANDAY('now') -
  JULIANDAY((select max(tx_date) from events e2 where e2.token_id = a.token_id))) owned_since
  from (select distinct token_id from 
    (select distinct token_id,
    last_value(to_wallet) over ( 
    partition by token_id order by tx_date 
    RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING ) owner
    from events) a
  where lower(a.owner) = lower(@wallet)) a`
  const result = this.db.prepare(sql).all({wallet})
  return result
}

  getPlatformStats(platform:string, stats:any[]) {
    const r = stats.filter(s => s.platform === platform)
    return r.length ? ''+Math.ceil(r[0].volume*100)/100 : '0'
  }

  async lastEvent() {
    const sql = `select tx_date last_event from events order by tx_date desc limit 1`
    const row = this.db.prepare(sql).get()
    return row
  }

  async globalStatistics(window:string) {
    const option = window === '24h' ? `DATE('now', '-1 days')` :
      window === '7d' ? `DATE('now', '-7 days')` : 
      window === '1m' ? `DATE('now', '-1 month')` : 
      window === '1y' ? `DATE('now', '-1 year')` : 
      `DATE('now', '-100 year')`
    const sql = `select platform, sum(amount) volume
      from events 
      where tx_date > ${option}
      group by platform`
    const result = this.db.prepare(sql).all()
    return result
  }

  async volumeChartData(wallet:string) {
    let sql = `select 
      date(tx_date) date, 
      sum(amount) volume, 
      avg(amount) average_price, 
      count(*) sales
      from events ev
      where platform <> 'looksrare' 
      <additional_where>
      group by date(tx_date)
      order by date(tx_date)`   
    sql = sql.replace(new RegExp('<additional_where>', 'g'), wallet ? 'AND (lower(from_wallet) = lower(@wallet) OR lower(to_wallet) = lower(@wallet))' : '');
    const params = wallet ? {wallet} : {}
    const result = this.db.prepare(sql).all(params)
    return result
  }

  async userStatistics(wallet:string) {
    const sql = `select 
      count(*) as transactions,
      (select tx_date from events order by tx_date desc limit 1) last_event,
      sum(amount) as volume,
      ceil(JULIANDAY(date()) - min(JULIANDAY(tx_date))) holder_since_days,
      (select count(*) from 
        (select distinct token_id,
        last_value(to_wallet) over ( 
        partition by token_id order by tx_date 
        RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING ) owner
        from events) a
      where a.owner = @wallet) owned_tokens
      from events 
      where lower(to_wallet) = lower(@wallet) 
      or lower(from_wallet) = lower(@wallet) 
      order by tx_date desc
    `
    const row = this.db.prepare(sql).get({wallet})
    return row
  }

  prepareStatements() {
    this.insert = this.db.prepare(`INSERT INTO events (event_type, 
      from_wallet, to_wallet, 
      token_id, amount, tx_date, tx, 
      log_index, platform) 
      VALUES 
      (@eventType, @initialFrom, @initialTo, 
      @tokenId, @alternateValue, @transactionDate, @transactionHash, 
      @logIndex, @platform)
      ON CONFLICT(tx, log_index) DO UPDATE SET amount = excluded.amount, platform=excluded.platform`);
    this.positionUpdate = this.db.prepare(`INSERT INTO configuration 
      VALUES ('currentBlock', @currentBlock)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value`)
    this.positionCheck = this.db.prepare(`SELECT * FROM configuration WHERE key = 'currentBlock'`)
    
  }

  async start() {

    this.db.prepare(
      `CREATE TABLE IF NOT EXISTS events (
        event_type text, from_wallet text, to_wallet text, 
        token_id number, amount number, tx_date text, tx text, 
        log_index number, platform text,
        UNIQUE(tx, log_index)
      );`,
    ).run();
    this.db.prepare(
      `CREATE TABLE IF NOT EXISTS configuration (
        key text, value text,
        PRIMARY KEY (key)
      );`,
    ).run();
    this.db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_date ON events(tx_date)`,
    ).run();
    this.db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_token_date ON events(token_id, tx_date)`,
    ).run();
    this.db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_towallet_date ON events(to_wallet, tx_date)`,
    ).run();
    this.db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_fromwallet_date ON events(from_wallet, tx_date)`,
    ).run();
    
    this.prepareStatements();

    const position = this.positionCheck.get()
    if (!position)
      this.positionUpdate.run({currentBlock: config.statistic_initial_block});

    /*
    logger.info('create indexes');
    db.run('CREATE INDEX idx_type_date ON events(event_type, tx_date);');
    db.run('CREATE INDEX idx_type_platform_date ON events(event_type, platform, tx_date);');
    db.run('CREATE INDEX idx_date ON events(tx_date);');
    db.run('CREATE INDEX idx_amount ON events(amount);');
    db.run('CREATE INDEX idx_platform ON events(platform);');
    db.run('CREATE INDEX idx_tx ON events(tx);');
    */

    // Listen for Bid event
    const tokenContract = new ethers.Contract(config.contract_address, erc721abi, this.provider);
    let filter = tokenContract.filters.Transfer();

    const result = this.db.prepare(
      `SELECT * FROM configuration WHERE key = 'currentBlock'`,
    ).get();

    if (result && result.value) this.currentBlock = result.value
    else {
      this.currentBlock = await rl.question('Enter the block to start with:\n')
    }
    this.currentBlock = parseInt(this.currentBlock+'')

    const chunkSize = 100
    
    while (true) {
      try {
        // check the latest available block
        const latestAvailableBlock = await this.provider.getBlockNumber()
        if (this.currentBlock > latestAvailableBlock - 1) {
          logger.info(`latest block reached (${latestAvailableBlock}), waiting the next available block...`)
          await delay(20000)
          continue
        }
        logger.info('querying ' + this.currentBlock)
        await tokenContract.queryFilter(filter, 
          this.currentBlock, 
          this.currentBlock+chunkSize).then(async (events:any) => {
            await this.handleEvents(events)
            this.positionUpdate.run({currentBlock: this.currentBlock});
            this.currentBlock += chunkSize
            if (this.currentBlock > latestAvailableBlock) this.currentBlock = latestAvailableBlock
            logger.info('moving to next block, ' + this.currentBlock)    
          });
      } catch (err) {
        logger.info('probably 429 spotted — delaying next call', err)
        await delay(5000)
      }
    }    
  }

  async handleEvents(events:any) {
    while (events.length > 0) {
      const elements = events.splice(0, 10)
      await delay(500)
      const results = await Promise.all(elements
        .filter(e => e !== undefined)
        .map(async (e) => this.erc721service.getTransactionDetails(e, true, false)))
      for (let result of results) {
        if (!result) continue
        if (!result.alternateValue && result.ether)
          result.alternateValue = result.ether
        this.insert.run(result);
      }  
    }
  }
  
  async getTransaction(tx:string) {
    const sql = `select * from events where tx = @tx`
    return this.db.prepare(sql).all({tx})
  }

  async getTopTraders(wallet:string, period:string) {
    
    if (wallet && !wallet.startsWith('0x')) {
      // try to find the matching wallet
      const address = await this.provider.resolveName(`${wallet}`);
      if (address) wallet = address
    }

    const sql = `with test as (
      select wallet, sum(volume) volume, 
      rank() over (order by sum(volume) desc) rank
      from (
        select to_wallet wallet, sum(amount) volume
        from events e
        where tx_date > date(date(), '-${period}')
        group by 1
        union 
        select from_wallet wallet, sum(amount) volume
        from events e
        where tx_date > date(date(), '-${period}')
        group by 1
      ) a 
      group by 1
      order by 2 desc
    ) 
    select distinct * from (
      (select * from test limit 20)
    )
    union 
    select * from (
      select * from test 
      where wallet = '${wallet}'
    ) order by 3
    `
    const result = this.db.prepare(sql).all({wallet})
    for (let r of result) {
      const address = await this.provider.lookupAddress(`${r.wallet}`);
      if (address) r.wallet = address
    }
    
    return result
  }

  async generateChart(wallet:string) {
    let datas = await this.volumeChartData(wallet)
    const dataMap = new Map();
    datas.forEach(d => dataMap.set(d.date, d))
    const dates = getDates(datas[0].date, datas[datas.length-1].date)
    datas = dates.map(d => {
      return {
        date: d,
        volume: dataMap.get(d)?.volume ?? 0,
        average_price: dataMap.get(d)?.average_price ?? 0
      }
    })
    const MAX_BARS = 250
    if (datas.length > MAX_BARS) {
      const packSize = Math.floor(datas.length/MAX_BARS)
      let count = 0
      let current = {
        volume: 0,
        average_price: 0,
      }
      datas = datas.reduce((previous, next) => {
        count++
        current['volume'] += next.volume
        current['average_price'] += next.average_price
        if (count > packSize) {
          current['date'] = next.date
          count = 0
          current = {
            volume: 0,
            average_price: 0,
          }
          previous.push(current)
        }
        return previous        
      }, [])
    }
    const width = 1200;
    const height = 600;
    const datasets:any[] = [
    {
      label: 'Volume (Ξ)',
      data: datas.map(d => d.volume),
      backgroundColor: [
        '#6A8493',
      ],
      borderColor: [
        '#6A8493',
      ],
      borderWidth: 1,
      yAxisID: 'y1',
    }]
    if (!wallet) {
      datasets.push({
        type: 'line',
        label: 'Average price (Ξ)',
        data: datas.map(d => d.average_price),
        backgroundColor: [
          '#EB37B0'
        ],
        borderColor: [
          '#EB37B0'
        ],
        borderWidth: 1,
        yAxisID: 'y',
      })      
    }
    const configuration:ChartConfiguration = {
      type: 'bar',
      data: {
        labels: datas.map(d => d.date),
        datasets
      },
      options: {
        elements: {
          point: {
              radius: 0
          }
        },
        scales: {
          y: {
              type: 'linear',
              display: true,
              position: 'left',
              grid: {
                color: (ctx) => (ctx.tick.value === 0 ? '#6A8493' : 'transparent'),
                drawTicks: false,
              }
          },
          y1: {
              type: 'linear',
              display: true,
              position: 'right',
              grid: {
                  drawOnChartArea: false,
              },
          },
        } 
      },
      plugins: [{
        id: 'background-colour',
        beforeDraw: (chart) => {
          const ctx = chart.ctx;
          ctx.save();
          ctx.fillStyle = '#1D1E1F';
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        }
      }]
    };
    const chartCallback: ChartCallback = (ChartJS) => {
      ChartJS.defaults.responsive = true;
      ChartJS.defaults.maintainAspectRatio = false;
    };
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });
    const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
    return buffer
  }

}

function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}
function addDays(dateIn, days) {
  var date = new Date(dateIn);
  date.setDate(date.getDate() + days);
  return date;
}

function getDates(startDate, stopDate) {
  var dateArray = [];
  var currentDate = startDate;
  while (currentDate <= stopDate) {
      dateArray.push(format(new Date (currentDate), 'yyyy-MM-dd'));
      currentDate = format(addDays(currentDate, 1), 'yyyy-MM-dd');
  }
  return dateArray;
}