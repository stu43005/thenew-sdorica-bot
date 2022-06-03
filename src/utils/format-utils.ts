import { codeBlock } from '@discordjs/builders';
import { Guild, GuildMember, MessageEmbed, User } from 'discord.js';
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

        return `<@&${discordId}>`;
    }

    public static channelMention(discordId: string): string {
        return `<#${discordId}>`;
    }

    public static userMention(discordId: string): string {
        return `<@!${discordId}>`;
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
            text: user instanceof GuildMember ? user.displayName : user.tag,
            iconURL: user.displayAvatarURL(),
        });
        if (user instanceof GuildMember && user.displayColor != 0) {
            embed.setColor(user.displayColor);
        }
        return embed;
    }
}
