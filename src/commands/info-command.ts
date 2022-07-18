import {
    ChatInputCommandInteraction,
    PermissionsString,
    RESTPostAPIApplicationCommandsJSONBody,
} from 'discord.js';
import { EventData } from '../models/event-data.js';
import { Lang } from '../services/lang.js';
import { InteractionUtils } from '../utils/interaction-utils.js';
import { Command, CommandDeferType } from './command.js';

export class InfoCommand implements Command {
    public metadata: RESTPostAPIApplicationCommandsJSONBody = {
        name: Lang.getCom('commands.info'),
        description: Lang.getRef('commandDescs.info', Lang.Default),
    };
    public deferType = CommandDeferType.PUBLIC;
    public requireDev = false;
    public requireGuild = false;
    public requireClientPerms: PermissionsString[] = [];
    public requireUserPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        await InteractionUtils.send(intr, Lang.getEmbed('displayEmbeds.info', data.lang()));
    }
}
