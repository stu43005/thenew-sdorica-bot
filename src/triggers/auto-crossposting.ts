import { ChannelType, Message } from 'discord.js';
import { EventData } from '../models/event-data.js';
import { Trigger } from './trigger.js';

export class AutoCrosspostingTrigger implements Trigger {
    public requireGuild = true;

    public triggered(msg: Message): boolean {
        return msg.channel.type === ChannelType.GuildAnnouncement;
    }

    public async execute(msg: Message, data: EventData): Promise<void> {
        if (!msg.inGuild() || !data.guild?.autoCrossposting) return;

        if (data.guild.autoCrossposting.includes(msg.channelId)) {
            await msg.crosspost();
        }
    }
}
