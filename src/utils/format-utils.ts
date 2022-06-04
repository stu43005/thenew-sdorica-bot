import { channelMention, codeBlock, roleMention, userMention } from '@discordjs/builders';
import { AnyChannel, Guild, GuildMember, Message, MessageEmbed, User } from 'discord.js';
import { Duration } from 'luxon';
import { LangCode } from '../enums/index.js';
import { Language } from '../models/enum-helpers/index.js';

export class FormatUtils {
    public static roleMention(guild: Guild, discordId: string): string {
        if (discordId === '@here') {
            return discordId;
        }

        if (discordId === guild.id) {
            return '@everyone';
        }

        return roleMention(discordId);
    }

    public static channelMention(discordId: string): string {
        return channelMention(discordId);
    }

    public static userMention(discordId: string): string {
        return userMention(discordId);
    }

    public static duration(milliseconds: number, langCode: LangCode): string {
        return Duration.fromObject(
            Object.fromEntries(
                Object.entries(
                    Duration.fromMillis(milliseconds, { locale: Language.locale(langCode) })
                        .shiftTo(
                            'year',
                            'quarter',
                            'month',
                            'week',
                            'day',
                            'hour',
                            'minute',
                            'second'
                        )
                        .toObject()
                ).filter(([_, value]) => !!value) // Remove units that are 0
            )
        ).toHuman({ maximumFractionDigits: 0 });
    }

    public static jsonBlock(obj: any): string {
        return codeBlock('json', JSON.stringify(obj, null, 2));
    }

    public static embedOriginUserData(user: User | GuildMember, embed?: MessageEmbed): MessageEmbed {
        if (!(embed instanceof MessageEmbed)) {
            embed = new MessageEmbed(embed);
        }
        embed.setFooter({
            text: user instanceof GuildMember ? user.user.tag : user.tag,
            iconURL: user.displayAvatarURL(),
        });
        if (user instanceof GuildMember && user.displayColor != 0) {
            embed.setColor(user.displayColor);
        }
        return embed;
    }

    public static embedTheMessage(message: Message, contextChannel: AnyChannel, embed?: MessageEmbed): MessageEmbed {
        if (!(embed instanceof MessageEmbed)) {
            embed = new MessageEmbed(embed);
        }
        embed.setAuthor({
            name: message.author.tag,
            iconURL: message.author.displayAvatarURL(),
            url: message.url,
        });
        embed.setDescription(message.content);
        if (message.attachments && message.attachments.size > 0) {
            if ('nsfw' in message.channel && message.channel.nsfw && 'nsfw' in contextChannel && !contextChannel.nsfw) {
                embed.addField('Attachments', ':underage: **Quoted message belongs in NSFW channel.**');
            }
            else if (message.attachments.size == 1 && String(message.attachments.at(0)?.url).match(/(.jpg|.jpeg|.png|.gif|.gifv|.webp|.bmp)$/i)) {
                embed.setImage(message.attachments.at(0)?.url ?? '');
            }
            else {
                for (const [_, attachment] of message.attachments) {
                    embed.addField('Attachment', `[${attachment.name}](${attachment.url})`, false);
                }
            }
        }
        embed.setTimestamp(message.createdAt);
        if (message.member && message.member.displayColor != 0) {
            embed.setColor(message.member.displayColor);
        }
        return embed;
    }
}
