export interface BindWeb3RequestDto {
    signature:string;
    account:string;
    twitterUserId?:string;
    twitterState?:string;
    twitterCode?:string;
    discordUserId?:string;
    discordUsername?:string;
    discordAccessToken?:string;
}

export interface BindTwitterRequestDto {
    state:string;
    code:string;
}

export interface BindTwitterResultDto {
    createdAt:string;
    id:string;
    name:string;
    username:string;
    accessToken:string;
    refreshToken:string;
    discordUserId?:string;
}

export interface DAORoleConfigurationDto {
    guildId:string,
    roleId:string,
    gracePeriod?:number,
    twitter?:any,
    minted?: boolean,
    minOwnedCount?: number,
    minOwnedTime?: number,
    specificTrait?: any,
    disallowAll?: boolean
}