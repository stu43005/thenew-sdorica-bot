import { Constants, DiscordAPIError, Message, MessageEmbed, MessageReaction, TextChannel, User } from 'discord.js';
import { StarboardSetting } from '../database/entities/guild.js';
import { StarboardStore } from '../database/starboard-store.js';
import { EventData } from '../models/event-data.js';
import { Logger } from '../services/logger.js';
import { Reaction } from './reaction.js';

export class StarboardReaction implements Reaction {
    public emoji = '⭐';
    public requireGuild = true;
    public requireSentByClient = false;
    public requireEmbedAuthorTag = false;
    public requireRemove = false;

    public triggered(msgReaction: MessageReaction, msg: Message, reactor: User): boolean {
        if (reactor.bot) return false;
        return true;
    }

    public async execute(msgReaction: MessageReaction, msg: Message, reactor: User, data: EventData): Promise<void> {
        if (!msg.guild) return;
        const starboard = data.guild?.starboard;
        if (!starboard?.channel || !starboard.limit) return;

        if (!starboard.allowNsfw && 'nsfw' in msg.channel && msg.channel.nsfw) {
            return;
        }

        const count = await getStarCount(msgReaction, msg);
        if (count >= starboard.limit) {
            await sendStarboard(starboard, msg, count);
        }
    }
}

async function getStarCount(messageReaction: MessageReaction, msg: Message): Promise<number> {
    const senderId = msg.author.id;
    const senderStared = messageReaction.users.resolve(senderId);
    const count = messageReaction.count - (senderStared ? 1 : 0);
    return count;
}

async function sendStarboard(setting: StarboardSetting, message: Message, count: number): Promise<void> {
    if (!message.guild) return;
    if (!setting.channel) return;
    const starboardChannel = message.guild.channels.resolve(setting.channel) as TextChannel;
    if (!starboardChannel) return;
    const template = getTemplate(message, count);

    const mapping = await StarboardStore.fromGuild(message.guild);
    try {
        await mapping.getTemporarilyTimer(message);
    } catch (error) {
    }

    mapping.setTemporarilyTimer(message, (async () => {
        const starData = await mapping.getItem(message);
        if (starData) {
            try {
                const starboardMessage = await starboardChannel.messages.fetch(starData.starboardMessageId);
                const messageReaction = message.reactions.resolve('⭐');
                if (messageReaction) {
                    const count = await getStarCount(messageReaction, message);
                    if (starData.count < count) {
                        await mapping.addStarboardMessage(message, count, starboardMessage);
                        await starboardMessage.edit(template);
                    }
                }
            } catch (error) {
                const allowErrors: number[] = [Constants.APIErrors.UNKNOWN_MESSAGE];
                if (!(error instanceof DiscordAPIError && allowErrors.includes(error.code))) {
                    throw error;
                }
            }
            return;
        }
        const sendedMessage = await starboardChannel.send(template);
        await mapping.addStarboardMessage(message, count, sendedMessage);
    })().catch(reason => {
        Logger.error('[starboard] [sendStarboard]', reason);
    }));
}

function getTemplate(message: Message, count: number): { content: string; embeds: MessageEmbed[]; } {
    const embed = new MessageEmbed();
    embed.setDescription(message.content);
    embed.setAuthor({
        name: message.author.tag,
        iconURL: message.author.displayAvatarURL(),
    });
    embed.addField('Original', `[Show me!](${(message as unknown as Message).url})`);
    embed.setTimestamp(message.createdAt);
    if (message.attachments && message.attachments.size > 0) {
        if (message.attachments.size == 1 && String(message.attachments.at(0)?.url).match(/(.jpg|.jpeg|.png|.gif|.gifv|.webp|.bmp)$/i)) {
            embed.setImage(message.attachments.at(0)?.url ?? '');
        }
        else {
            message.attachments.forEach(attachment => {
                embed.addField('Attachment', `[${attachment.name}](${attachment.url})`, false);
            });
        }
    }
    return {
        content: `${count} ⭐ in <#${message.channel.id}>`,
        embeds: [embed],
    };
}
