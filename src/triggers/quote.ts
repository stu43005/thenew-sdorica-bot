import { Message, MessageCreateOptions, TextBasedChannel, User } from 'discord.js';
import { EventData } from '../models/event-data.js';
import { ClientUtils } from '../utils/client-utils.js';
import { FormatUtils } from '../utils/format-utils.js';
import { MessageUtils } from '../utils/message-utils.js';
import { PermissionUtils } from '../utils/permission-utils.js';
import { RegexUtils } from '../utils/regex-utils.js';
import { Trigger } from './trigger.js';

const linkPrefixs = [
    'https://canary.discordapp.com/channels/',
    'https://ptb.discordapp.com/channels/',
    'https://discordapp.com/channels/',
    'https://canary.discord.com/channels/',
    'https://ptb.discord.com/channels/',
    'https://discord.com/channels/',
];

export class QuoteTrigger implements Trigger {
    public requireGuild = false;

    public triggered(msg: Message): boolean {
        if (msg.author.bot) return false;
        if (!PermissionUtils.canSend(msg.channel)) return false;

        return linkPrefixs.some(prefix => msg.content.includes(prefix));
    }

    public async execute(msg: Message, _data: EventData): Promise<void> {
        if (!msg.inGuild()) return;

        const strs = msg.content.split(/\s+/);
        for (let i = 0; i < strs.length; i++) {
            const word = strs[i].toLowerCase().replace(/^<|>$/g, '');
            const prefix = linkPrefixs.find(prefix => word.startsWith(prefix));
            if (!prefix) continue;

            const listIds = word.slice(prefix.length).split('/');
            if (listIds.length == 3) {
                if (listIds[0] !== msg.guild.id) continue;

                try {
                    const channel = await ClientUtils.findTextChannel(msg.guild, listIds[1]);
                    if (!channel) continue;

                    const msgId = RegexUtils.discordId(listIds[2]);
                    if (!msgId) continue;

                    const msgFound = await channel.messages.fetch(msgId);
                    await quoteEmbed(msg, msgFound, 'Linked');
                } catch (error) {
                    continue;
                }
            }
        }
    }
}

export async function quoteEmbed(
    sourceMsg: Message,
    msg: Message,
    footer: string = 'Quoted'
): Promise<void> {
    await MessageUtils.reply(
        sourceMsg,
        buildQuoteEmbed(sourceMsg.channel, msg, sourceMsg.author, footer),
        false
    );
}

export function buildQuoteEmbed(
    contextChannel: TextBasedChannel,
    message: Message,
    user: User,
    footer: string
): MessageCreateOptions {
    const embed = FormatUtils.embedTheMessage(message, contextChannel);
    if (message.channel.id !== contextChannel.id && 'name' in message.channel) {
        if (message.channel.isThread() && message.channel.parent) {
            embed.setFooter({
                text: `${footer} by: ${user.username} | in channel: #${message.channel.parent.name} > 💬${message.channel.name}`,
            });
        } else if (message.channel.isVoiceBased()) {
            embed.setFooter({
                text: `${footer} by: ${user.username} | in channel: 🔊${message.channel.name}`,
            });
        } else if (message.channel.isTextBased()) {
            embed.setFooter({
                text: `${footer} by: ${user.username} | in channel: #${message.channel.name}`,
            });
        }
    } else {
        embed.setFooter({ text: `${footer} by: ${user.username}` });
    }
    return {
        embeds: [embed, ...(message.author.bot ? message.embeds : [])],
    };
}
