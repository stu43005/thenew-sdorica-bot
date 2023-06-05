import {
    channelMention,
    ChatInputCommandInteraction,
    EmbedBuilder,
    PermissionsString,
    SlashCommandBuilder,
    userMention,
} from 'discord.js';
import moment from 'moment';
import { AnalyticsStatJob } from '../../jobs/analytics-stat.js';
import { FormatUtils } from '../../utils/format-utils.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { Command, CommandDeferType } from '../command.js';

export class StatsCommand implements Command {
    public metadata = new SlashCommandBuilder()
        .setName('stats')
        .setDescription('server stats.')
        .addSubcommand(builder => builder.setName('messages').setDescription('Message stats.'))
        .setDMPermission(false)
        .toJSON();
    public deferType = CommandDeferType.PUBLIC;
    public requireDev = false;
    public requireGuild = true;
    public requireClientPerms: PermissionsString[] = [];
    public requireUserPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction): Promise<void> {
        if (!intr.guild) return;

        const data = await AnalyticsStatJob.calc(intr.guild.id, 'last30days', moment());

        const embed = new EmbedBuilder();
        switch (intr.options.getSubcommand()) {
            case 'messages':
                embed.setTitle(`${intr.guild.name} Messages stats`);
                embed.addFields([
                    ...(data.messages
                        ? [
                              {
                                  name: 'Total messages',
                                  value: this.numberFormat(data.messages),
                                  inline: true,
                              },
                          ]
                        : []),
                    ...(data.messagesByMember
                        ? [
                              {
                                  name: 'Active members',
                                  value: this.numberFormat(
                                      Object.keys(data.messagesByMember).length
                                  ),
                                  inline: true,
                              },
                              {
                                  name: 'Top message members',
                                  value: this.getTop3(data.messagesByMember)
                                      .map(
                                          ([userId, messages], index) =>
                                              `${index + 1}. ${
                                                  intr.guild?.members.resolve(userId)
                                                      ? userMention(userId)
                                                      : data.userNames[userId]
                                              }: ${this.numberFormat(messages)}`
                                      )
                                      .join('\n'),
                              },
                          ]
                        : []),
                    ...(data.messagesByChannel
                        ? [
                              {
                                  name: 'Top message channels',
                                  value: this.getTop3(data.messagesByChannel)
                                      .map(
                                          ([channelId, messages], index) =>
                                              `${index + 1}. ${
                                                  intr.guild?.channels.resolve(channelId)
                                                      ? channelMention(channelId)
                                                      : `#${data.channelNames[channelId]}`
                                              }: ${this.numberFormat(messages)}`
                                      )
                                      .join('\n'),
                              },
                          ]
                        : []),
                ]);
                break;
        }
        const member = await InteractionUtils.getMemberOrUser(intr);
        await InteractionUtils.send(intr, FormatUtils.embedOriginUserData(member, embed));
    }

    private numberFormat(n: number): string {
        return new Intl.NumberFormat('en-US').format(n);
    }

    private getTop3(obj: Record<string, number>): [string, number][] {
        return Object.entries(obj)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3);
    }
}
