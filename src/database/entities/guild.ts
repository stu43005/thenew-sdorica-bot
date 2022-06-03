import { Collection, CustomRepository, getRepository } from 'fireorm';
import { MemeItem } from '../../commands/config/meme.js';
import { ReactionRole } from '../../commands/config/reaction-role.js';
import { LangCode } from '../../enums/lang-code.js';
import { CustomBaseRepository } from './base-repository.js';

@Collection('server_config')
export class GuildData {
    id!: string;
    /**
     * @deprecated
     */
    guildId!: string;

    language?: LangCode;

    autoCrossposting?: string[];
    autopinCount?: number;
    memes?: MemeItem[];
    reactionRoles?: ReactionRole[];
    starboard?: StarboardSetting;
    // welcome?: WelcomeSetting;

    public update(): Promise<GuildData> {
        return getGuildRepository().update(this);
    }
}

export interface StarboardSetting {
    channel?: string;
    limit?: number;
    allowNsfw?: boolean;
    ignore?: string[];
}

@CustomRepository(GuildData)
export class CustomGuildDataRepository extends CustomBaseRepository<GuildData> {
}

export function getGuildRepository(): CustomGuildDataRepository {
    return getRepository(GuildData) as CustomGuildDataRepository;
}
