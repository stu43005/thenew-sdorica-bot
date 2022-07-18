import { GuildData } from '../database/entities/guild.js';
import { UserData } from '../database/entities/user.js';
import { LangCode } from '../enums/lang-code.js';
import { Lang } from '../services/lang.js';

// This class is used to store and pass data along in events
export class EventData {
    constructor(public user?: UserData, public guild?: GuildData) {}

    public lang(): LangCode {
        return this.user?.language ?? this.guild?.language ?? Lang.Default;
    }
}
