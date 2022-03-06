import { IsDefined, IsEnum, IsString, IsUrl, Length } from 'class-validator';
import { ActivityType, Constants } from 'discord.js';

export interface GetShardsResponse {
    shards: ShardInfo[];
    stats: ShardStats;
}

export interface ShardStats {
    shardCount: number;
    uptimeSecs: number;
}

export interface ShardInfo {
    id: number;
    ready: boolean;
    error: boolean;
    uptimeSecs?: number;
}

export class SetShardPresencesRequest {
    @IsDefined()
    @IsEnum(Constants.ActivityTypes)
    type: Exclude<ActivityType, 'CUSTOM'>;

    @IsDefined()
    @IsString()
    @Length(1, 128)
    name: string;

    @IsDefined()
    @IsUrl()
    url: string;

    constructor(type: Exclude<ActivityType, 'CUSTOM'>, name: string, url: string) {
        this.type = type;
        this.name = name;
        this.url = url;
    }
}
