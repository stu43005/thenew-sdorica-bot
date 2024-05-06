import { ChatInputCommandInteraction, PermissionsString, SlashCommandBuilder } from 'discord.js';
import { EventData } from '../models/event-data.js';
import { Lang } from '../services/lang.js';
import { InteractionUtils } from '../utils/interaction-utils.js';
import { Command, CommandDeferType } from './command.js';

export class HelpCommand implements Command {
    public metadata = new SlashCommandBuilder()
        .setName(Lang.getCom('commands.help'))
        .setDescription(Lang.getRef('commandDescs.help', Lang.Default))
        .toJSON();
    public deferType = CommandDeferType.PUBLIC;
    public requireDev = false;
    public requireGuild = false;
    public requireClientPerms: PermissionsString[] = [];
    public requireUserPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        await InteractionUtils.send(intr, Lang.getEmbed('displayEmbeds.help', data.lang()));
    }
}
