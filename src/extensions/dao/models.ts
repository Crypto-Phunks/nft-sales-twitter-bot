export interface BindWeb3RequestDto {
    signature:string;
    account:string;
    discordUserId:string;
    discordUsername:string;
    discordAccessToken:string;
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
    specificTrait?: any,
    disallowAll?: boolean
}