import {
    ChatInputCommandInteraction,
    codeBlock,
    PermissionsString,
    SlashCommandBuilder,
} from 'discord.js';
import { InteractionUtils } from '../../utils/interaction-utils.js';
import { Command, CommandDeferType } from '../command.js';

export class CodeCommand implements Command {
    public metadata = new SlashCommandBuilder()
        .setName('code')
        .setDescription('Show argument as code.')
        .addStringOption(builder =>
            builder.setName('argument').setDescription('參數').setRequired(true)
        )
        .toJSON();
    public deferType = CommandDeferType.HIDDEN;
    public requireDev = false;
    public requireGuild = false;
    public requireClientPerms: PermissionsString[] = [];
    public requireUserPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction): Promise<void> {
        const argument = intr.options.getString('argument', true);
        await InteractionUtils.send(intr, codeBlock(argument), true);
    }
}
