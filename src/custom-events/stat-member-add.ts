import { Events, GuildMember } from 'discord.js';
import { StatCollection } from '../database/stat-collection.js';
import { CustomEvent } from './custom-event.js';

export class StatMemberAdd implements CustomEvent<Events.GuildMemberAdd> {
    public readonly event = Events.GuildMemberAdd;

    public async process(member: GuildMember): Promise<void> {
        StatCollection.fromGuild(member.guild).memberChange();
    }
}
