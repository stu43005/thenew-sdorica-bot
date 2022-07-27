import {
    ChatInputCommandInteraction,
    PermissionsString,
    SlashCommandBuilder,
    SnowflakeUtil,
} from 'discord.js';
import { FormatUtils } from '../../utils/format-utils.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { Command, CommandDeferType } from '../command.js';

export class SnowflakeCommand implements Command {
    public metadata = new SlashCommandBuilder()
        .setName('snowflake')
        .setDescription('Gets information about a snowflake.')
        .addStringOption(builder =>
            builder.setName('snowflake').setDescription('snowflake').setRequired(true)
        )
        .toJSON();
    public deferType = CommandDeferType.HIDDEN;
    public requireDev = false;
    public requireGuild = false;
    public requireClientPerms: PermissionsString[] = [];
    public requireUserPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction): Promise<void> {
        try {
            const snowflake = SnowflakeUtil.deconstruct(intr.options.getString('snowflake', true));
            await InteractionUtils.send(
                intr,
                FormatUtils.codeBlock(
                    'fix',
                    `snowflake: ${snowflake.id}
timestamp: ${snowflake.timestamp}
workerId: ${snowflake.workerId}
processId: ${snowflake.processId}
increment: ${snowflake.increment}
epoch: ${snowflake.epoch}`
                ),
                true
            );
        } catch (error: any) {
            await InteractionUtils.send(intr, `錯誤：無效的 snowflake`, true);
        }
    }
}
