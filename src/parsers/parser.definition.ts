import { Log, TransactionResponse } from "ethers";

export interface LogParser {
    platform:string
    parseLogs(transaction:TransactionResponse, logs:ReadonlyArray<Log>, tokenId:string):number|undefined
}