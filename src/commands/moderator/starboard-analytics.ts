import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    Message,
    PermissionsBitField,
    PermissionsString,
    SlashCommandBuilder,
    Snowflake,
    TextBasedChannel,
} from 'discord.js';
import { EventData } from '../../models/event-data.js';
import { Logger } from '../../services/logger.js';
import { ClientUtils } from '../../utils/client-utils.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { Command, CommandDeferType } from '../command.js';

const starcountRegex = /^\**(\d+)/;

export default class StarboardAnalyticsCommand implements Command {
    public metadata = new SlashCommandBuilder()
        .setName('starboard-analytics')
        .setDescription('顯示 Starboard 統計訊息')
        .setDMPermission(false)
        .setDefaultMemberPermissions(new PermissionsBitField().add('ManageGuild').valueOf())
        .toJSON();
    public deferType = CommandDeferType.PUBLIC;
    public requireDev = false;
    public requireGuild = true;
    public requireClientPerms: PermissionsString[] = [];
    public requireUserPerms: PermissionsString[] = ['ManageGuild'];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        if (!intr.guild || !data.guild?.starboard?.channel) return;

        const channel = await ClientUtils.findTextChannel(
            intr.guild,
            data.guild?.starboard?.channel
        );
        if (channel) {
            await InteractionUtils.send(intr, 'pleace wait...');

            const data: AnalyticsMap = {
                count: {},
                max: {},
            };

            let result = await next(data, channel);
            let runcount = 1;
            await InteractionUtils.editReply(intr, `pleace wait...${runcount}`);

            while (typeof result == 'string') {
                result = await next(data, channel, result);
                runcount++;
                await InteractionUtils.editReply(intr, `pleace wait...${runcount}`);

                if (result === false) {
                    break;
                }
                if (runcount > 100) {
                    Logger.error(`[starboard-analytics] Error: runcount > 100`);
                    break;
                }
            }

            const sortedData: Analytics = {
                count: values(data.count)
                    .sort((a, b) => b.num - a.num)
                    .slice(0, 5),
                max: values(data.max)
                    .sort((a, b) => b.num - a.num)
                    .slice(0, 5),
            };

            const embed = new EmbedBuilder();
            embed.setTitle('Meow!');
            embed.addFields([
                {
                    name: '上榜最多次的使用者',
                    value:
                        `top5:\n` +
                        sortedData.count
                            .map((e, index) => `\`${index + 1}. ${e.username}: ${e.num}\``)
                            .join('\n'),
                },
                {
                    name: '上星數量最多的使用者',
                    value:
                        `top5:\n` +
                        sortedData.max
                            .map((e, index) => `\`${index + 1}. ${e.username}: ${e.num}\``)
                            .join('\n'),
                },
            ]);
            await InteractionUtils.editReply(intr, {
                content: '',
                embeds: [embed],
            });
        } else {
            await InteractionUtils.send(intr, 'Error: 尚未設定 starboard 頻道');
        }
    }
}

interface Analytics {
    count: AnalyticsEntry[];
    max: AnalyticsEntry[];
}

interface AnalyticsMap {
    count: { [id: string]: AnalyticsEntry };
    max: { [id: string]: AnalyticsEntry };
}

interface AnalyticsEntry {
    username: string;
    num: number;
}

async function next(
    data: AnalyticsMap,
    channel: TextBasedChannel,
    before?: Snowflake
): Promise<string | false> {
    const messages = await channel.messages.fetch({
        before,
    });
    if (before) {
        messages.delete(before);
    }
    if (messages.size < 2) {
        return false;
    }

    messages.forEach(message => {
        const messageData = getMessageDataFromSora(message);
        if (!messageData.username || !messageData.starcount) return;

        if (!data.count[messageData.username]) {
            data.count[messageData.username] = {
                username: messageData.username,
                num: 0,
            };
        }
        data.count[messageData.username].num++;

        if (!data.max[messageData.username]) {
            data.max[messageData.username] = {
                username: messageData.username,
                num: 0,
            };
        }
        if (data.max[messageData.username].num < messageData.starcount) {
            data.max[messageData.username].num = messageData.starcount;
        }
    });

    const ids = [...messages.keys()].map(s => Number(s));
    const minId = Math.min(...ids);
    return String(minId);
}

interface SoraMessageData {
    username: string;
    starcount: number;
}

function getMessageDataFromSora(message: Message): SoraMessageData {
    const data: SoraMessageData = {
        username: '',
        starcount: 0,
    };
    if (message.author.bot) {
        const starcountMatch = starcountRegex.exec(message.content);
        if (starcountMatch) {
            data.starcount = Number(starcountMatch[1]);
        }
        if (
            message.embeds.length > 0 &&
            message.embeds[0].author &&
            message.embeds[0].author.name
        ) {
            data.username = message.embeds[0].author.name;
        }
    }
    return data;
}

function values(obj: { [key: string]: any }): any[] {
    const elements: any[] = [];
    for (const key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) {
            const element = obj[key];
            elements.push(element);
        }
    }
    return elements;
}
