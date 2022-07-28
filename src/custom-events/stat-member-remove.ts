import { Events, GuildMember } from 'discord.js';
import { StatCollection } from '../database/stat-collection.js';
import { CustomEvent } from './custom-event.js';

export class StatMemberRemove implements CustomEvent<Events.GuildMemberRemove> {
    public readonly event = Events.GuildMemberRemove;

    public async process(member: GuildMember): Promise<void> {
        StatCollection.fromGuild(member.guild).memberChange();
    }
}
