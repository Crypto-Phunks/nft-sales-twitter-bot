import { SlashCommandBuilder } from '@discordjs/builders';
import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { Alchemy, FloorPriceMarketplace, Network } from 'alchemy-sdk';
import { log } from 'console';
import { Interaction } from 'discord.js';
import { ethers } from 'ethers';
import { BaseService, alchemyAPIKey, alchemyAPIUrl } from "src/base.service";
import { createLogger } from "src/logging.utils";


const logger = createLogger('phunks.treasury.service')

@Injectable()
export class PhunksTreasuryService extends BaseService {

    constructor(
        protected readonly http: HttpService,
        private readonly moduleRef: ModuleRef
    ) {
        super(http);
        logger.info('created PhunksTreasuryService')

        this.discordClient.init(() => {
            this.registerCommands()
        })
    }

    registerCommands() {

        const treasury = new SlashCommandBuilder()
            .setName('treasury')
            .setDescription('Get current phunks treasury balance')
        
        this.getDiscordCommands().push(treasury.toJSON())
        const listener = async (interaction:Interaction) => {
            try {
              if (!interaction.isCommand()) return;
              if ('treasury' === interaction.commandName) {
                await interaction.deferReply();
                const treasuryBalance = await this.getTreasuryBalance()
                await interaction.editReply(`The current treasury balance is: \`\`\`fix
${treasuryBalance}\`\`\``)
              }
            } catch (error) {
                logger.error('Error in treasury command', error)
            }
        }
        this.getDiscordInteractionsListeners().push(listener)
    }
    
    async getTreasuryBalance() {
        const alchemy = new Alchemy({
            apiKey: alchemyAPIKey,
            network: Network.ETH_MAINNET,            
        });
        const ownerAddress = "0x61f874551c69f0E40c9f55219107B408C989aDEc";
        const tokenContractAddresses = ["0xa82f3a61f002f83eba7d184c50bb2a8b359ca1ce", "0xf07468ead8cf26c752c676e43c814fee9c8cf402"];
        const balance = await alchemy.core.getBalance(ownerAddress, 'latest');

        const data = await alchemy.core.getTokenBalances(
            ownerAddress,
            tokenContractAddresses
        );

        const philipBalance = parseInt(data.tokenBalances[0].tokenBalance.toString(), 16)
        const phunkBalance = parseInt(data.tokenBalances[1].tokenBalance.toString(), 16)
        const philipFloor = await alchemy.nft.getFloorPrice('0xa82f3a61f002f83eba7d184c50bb2a8b359ca1ce')
        const phunkFloor = await alchemy.nft.getFloorPrice('0xf07468ead8cf26c752c676e43c814fee9c8cf402')
        const philipFloorOpenSea = (philipFloor.openSea as FloorPriceMarketplace).floorPrice
        const phunkFloorOpenSea = (phunkFloor.openSea as FloorPriceMarketplace).floorPrice
        const philipTotal = this.getFiatValue(philipBalance * philipFloorOpenSea, 'ethereum')
        const phunkTotal = this.getFiatValue(phunkBalance * phunkFloorOpenSea, 'ethereum')

        console.log(philipFloor, phunkFloor, balance, data);
        const ether = parseFloat(ethers.formatEther(balance.toString()))
        return `  Ξ${ether.toFixed(2)} (${this.getFiatValue(ether, 'ethereum').format()})
  ${phunkBalance} phunks (${phunkTotal.format()} at Ξ${phunkFloorOpenSea} floor price)
  ${philipBalance} philips (${philipTotal.format()} at Ξ${philipFloorOpenSea} floor price)`
    }

}