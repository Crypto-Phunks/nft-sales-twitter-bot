import { writeFileSync } from 'fs';
import erc721abi from '../../abi/erc721.json'

import { readFile } from 'fs/promises';
import punkAttributes from './json/punkAttributes.json'
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import dotenv from 'dotenv';
dotenv.config();

import { createLogger } from '../../logging.utils';
import { Erc721SalesService } from 'src/erc721sales.service';
import { createCanvas, loadImage, registerFont } from 'canvas';
import { ethers } from 'ethers';
import { config } from '../../config';
import { TweetRequest } from 'src/base.service';
import path from 'path';
import svg2img from 'svg2img';

const logger = createLogger('phunks.erc721sales.service')

@Injectable()
export class PhunksErc721SpecialisedSalesService extends Erc721SalesService {
  
  constructor(
    protected readonly http: HttpService,
  ) {
    super(http)

    const tokenContract = new ethers.Contract(config.contract_address, erc721abi, this.provider);
    let filter = tokenContract.filters.Transfer();
    tokenContract.queryFilter(filter, 
      18146318, 
      18146318).then(async (events:any) => {
      for (const event of events) {
        const request = await this.getTransactionDetails(event)
        const tweet = await this.tweet(request);
        await this.discord(request, tweet.id);
      }
    });       
  }
  
  async decorateImage(processedImage: Buffer, data:TweetRequest): Promise<Buffer> {
    registerFont(path.join(__dirname, './fonts/retro-computer.ttf'), { family: 'RetroComputer' });

    const canvasWidth = 1200;
    const canvasHeight = 1200;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#131415';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const type = data.eventType
    const color = type === 'bids' ? 'rgba(142, 111, 182, 1)' : 
                  type === 'sales' ? 'rgba(99, 133, 150, 1)' : 
                  type === 'offers' ? 'rgba(149, 85, 79, 1)' :
                  'rgba(99, 133, 150, 1)';

    const punkWidth = canvasWidth / 2;
    const punkHeight = canvasHeight / 2;

    const bleed = 30 * 2;

    const lowerThird = ((canvasHeight / 3) * 2) - (bleed * 2) + 20;
    
    const font = (size: number) => `normal ${size}px RetroComputer`;

    ctx.fillStyle = color;
    ctx.fillRect(bleed, bleed, canvasWidth - (bleed * 2), lowerThird);

    // Line 1 (left side)
    const line1 = 'CryptoPhunk';
    const line1Pos = lowerThird + (bleed * 2);
    ctx.textBaseline = 'top';
    ctx.font = font(36);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(
      line1,
      bleed,
      line1Pos
    );

    // Line 2 (left side)
    ctx.textBaseline = 'top';
    ctx.font = font(120);
    ctx.fillStyle = color || '#FF04B4';
    ctx.fillText(
      data.tokenId,
      bleed - 5,
      line1Pos + 20
    );

    // Line 3 (right side)
    const punkTraits = punkAttributes[data.tokenId];
    const punkData = this.getTraits(punkTraits);
    const sex = punkData.traits[0];
    
    const line3Pos = lowerThird + (bleed * 2);
    const line3_1 = `${punkData.sex} phunks`;
    ctx.font = font(24);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(
      line3_1,
      canvasWidth - bleed,
      line3Pos
    );

    const line3_1Width = (ctx.measureText(line3_1).width + 8);

    const line3_2 = `${sex.value}`;
    ctx.font = font(24);
    ctx.textAlign = 'right';
    ctx.fillStyle = color || '#ff04b4';
    ctx.fillText(
      line3_2,
      canvasWidth - bleed - line3_1Width,
      line3Pos
    );

    const line3_2Width = (ctx.measureText(line3_2).width + 8);

    const line3_3 = `One of`;
    ctx.font = font(24);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(
      line3_3,
      canvasWidth - bleed - line3_1Width - line3_2Width,
      line3Pos
    );

    const line4Pos = lowerThird + (bleed * 2) + 40;
    const line4_1 = `Trait${punkData.traits?.length > 2 ? 's' : ''}`
    ctx.font = font(24);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(
      line4_1,
      canvasWidth - bleed,
      line4Pos
    );

    const line4_1Width = (ctx.measureText(line4_1).width + 8);

    const line4_2 = `${punkData.traitCount}`;
    ctx.font = font(24);
    ctx.textAlign = 'right';
    ctx.fillStyle = color || '#ff04b4';
    ctx.fillText(
      line4_2,
      canvasWidth - bleed - line4_1Width,
      line4Pos
    );    

    let traitsPos = line4Pos + 30;
    for (const trait of punkData.traits) {

      if (trait.label !== punkData.sex) {

        const lineTrait_1 = `${(trait.value * 100) / 10000}%`;
        ctx.font = font(20);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(
          lineTrait_1,
          canvasWidth - bleed,
          traitsPos
        );

        const lineTrait_1Width = (ctx.measureText(lineTrait_1).width + 8);

        const lineTrait_2 = `${trait.label}`;
        ctx.font = font(20);
        ctx.textAlign = 'right';
        ctx.fillStyle = color || '#FF04B4';
        ctx.fillText(
          lineTrait_2,
          canvasWidth - bleed - lineTrait_1Width,
          traitsPos
        );
      }

      traitsPos = traitsPos + 30;
    }

    await new Promise((resolve, _) => {
      svg2img(path.join(__dirname, './images/logo-phunk.svg'), function(error, buffer) {

        loadImage(buffer).then(image => {
          ctx.drawImage(
            image,
            bleed,
            canvasHeight - bleed - 20
          );    
          resolve(_)
        })
      });    
    }) 
    const image = await loadImage(processedImage)
    
    ctx.drawImage(
      image,
      (canvasWidth / 2) - (punkWidth / 2) - (bleed / 2),
      lowerThird - punkHeight + bleed,
      punkWidth,
      punkHeight
    );
    
    return canvas.toBuffer('image/png')
  }


  getTraits(punkTraits: any): any {

    const values = {'Female':3840,'Earring':2459,'Green Eye Shadow':271,'Blonde Bob':147,'Male':6039,'Smile':238,'Mohawk':441,'Wild Hair':447,'Pipe':317,'Nerd Glasses':572,'Goat':295,'Big Shades':535,'Purple Eye Shadow':262,'Half Shaved':147,'Do-rag':300,'Clown Eyes Blue':384,'Spots':124,'Wild White Hair':136,'Messy Hair':460,'Luxurious Beard':286,'Big Beard':146,'Clown Nose':212,'Police Cap':203,'Blue Eye Shadow':266,'Straight Hair Dark':148,'Black Lipstick':617,'Clown Eyes Green':382,'Purple Lipstick':655,'Blonde Short':129,'Straight Hair Blonde':144,'Pilot Helmet':54,'Hot Lipstick':696,'Regular Shades':527,'Stringy Hair':463,'Small Shades':378,'Frown':261,'Eye Mask':293,'Muttonchops':303,'Bandana':481,'Horned Rim Glasses':535,'Crazy Hair':414,'Classic Shades':502,'Handlebars':263,'Mohawk Dark':429,'Dark Hair':157,'Peak Spike':303,'Normal Beard Black':289,'Cap':351,'VR':332,'Frumpy Hair':442,'Cigarette':961,'Normal Beard':292,'Red Mohawk':147,'Shaved Head':300,'Chinstrap':282,'Mole':644,'Knitted Cap':419,'Fedora':186,'Shadow Beard':526,'Straight Hair':151,'Hoodie':259,'Eye Patch':461,'Headband':406,'Cowboy Hat':142,'Tassle Hat':178,'3D Glasses':286,'Mustache':288,'Vape':272,'Choker':48,'Pink With Hat':95,'Welding Goggles':86,'Vampire Hair':147,'Mohawk Thin':441,'Tiara':55,'Zombie':88,'Front Beard Dark':260,'Cap Forward':254,'Gold Chain':169,'Purple Hair':165,'Beanie':44,'Clown Hair Green':148,'Pigtails':94,'Silver Chain':156,'Front Beard':273,'Rosy Cheeks':128,'Orange Side':68,'Wild Blonde':144,'Buck Teeth':78,'Top Hat':115,'Medical Mask':175,'Ape':24,'Alien':9};

    // We want to have sex first
    punkTraits.sort(p => p.k === "Sex" ? -1 : 1)
    punkTraits = punkTraits.map(p => p.v).filter(p => values.hasOwnProperty(p))

    return {
      sex: punkTraits[0],
      traits: punkTraits.map((trait) => ({ label: trait, value: values[trait] })),
      traitCount: punkTraits.length - 1,
    };
  }

}