import { ChatInputCommandInteraction, PermissionsString, SlashCommandBuilder } from 'discord.js';
import { EventData } from '../models/event-data.js';
import { Lang } from '../services/lang.js';
import { InteractionUtils } from '../utils/interaction-utils.js';
import { Command, CommandDeferType } from './command.js';

export class InfoCommand implements Command {
    public metadata = new SlashCommandBuilder()
        .setName(Lang.getCom('commands.info'))
        .setDescription(Lang.getRef('commandDescs.info', Lang.Default))
        .toJSON();
    public deferType = CommandDeferType.PUBLIC;
    public requireDev = false;
    public requireGuild = false;
    public requireClientPerms: PermissionsString[] = [];
    public requireUserPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        await InteractionUtils.send(intr, Lang.getEmbed('displayEmbeds.info', data.lang()));
    }
}
