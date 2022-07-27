import {
    channelMention,
    ChatInputCommandInteraction,
    PermissionsBitField,
    PermissionsString,
    SlashCommandBuilder,
} from 'discord.js';
import { EventData } from '../../models/event-data.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { Command, CommandDeferType } from '../command.js';

export default class StarboardCommand implements Command {
    public metadata = new SlashCommandBuilder()
        .setName('starboard')
        .setDescription('設定 starboard')
        .addChannelOption(builder =>
            builder.setName('channel').setDescription('設定 starboard 的頻道').setRequired(false)
        )
        .addIntegerOption(builder =>
            builder
                .setName('count')
                .setDescription('設定上榜所需星星數量 (0=停用)')
                .setRequired(false)
        )
        .addBooleanOption(builder =>
            builder.setName('nsfw').setDescription('設定是否允許 NSFW 頻道上星').setRequired(false)
        )
        .setDMPermission(false)
        .setDefaultMemberPermissions(new PermissionsBitField().add('ManageGuild').valueOf())
        .toJSON();
    public deferType = CommandDeferType.HIDDEN;
    public requireDev = false;
    public requireGuild = true;
    public requireClientPerms: PermissionsString[] = [];
    public requireUserPerms: PermissionsString[] = ['ManageGuild'];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        if (!data.guild) return;

        const channel = intr.options.getChannel('channel');
        const count = intr.options.getInteger('count');
        const nsfw = intr.options.getBoolean('nsfw');

        const starboard = data.guild.starboard ?? {};
        let edited = false;
        if (channel !== null) {
            starboard.channel = channel.id;
            edited = true;
        }
        if (count !== null) {
            starboard.limit = count;
            edited = true;
        }
        if (nsfw !== null) {
            starboard.allowNsfw = nsfw;
            edited = true;
        }
        if (edited) {
            data.guild.starboard = starboard;
            await data.guild.update();
        }

        const set: string[] = [];
        if (!starboard?.channel || !starboard.limit) {
            set.push(`目前已停用 starboard。`);
        } else {
            set.push(`starboard 的頻道為：${channelMention(starboard.channel)}`);
            set.push(`上榜所需星星數量為：${starboard.limit}`);
            set.push(`是否允許 NSFW 頻道上星為：${starboard.allowNsfw ? '允許' : '禁止'}`);
        }
        await InteractionUtils.send(intr, `${set.join('\n')}`, true);
    }
}
