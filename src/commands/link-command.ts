import {
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    EmbedBuilder,
    PermissionsString,
    RESTPostAPIApplicationCommandsJSONBody,
} from 'discord.js';
import { EventData } from '../models/event-data.js';
import { Lang } from '../services/lang.js';
import { InteractionUtils } from '../utils/interaction-utils.js';
import { Command, CommandDeferType } from './command.js';

export class LinkCommand implements Command {
    public metadata: RESTPostAPIApplicationCommandsJSONBody = {
        name: Lang.getCom('commands.link'),
        description: Lang.getRef('commandDescs.link', Lang.Default),
        options: [
            {
                name: Lang.getCom('arguments.link'),
                description: 'Link to display.',
                required: true,
                type: ApplicationCommandOptionType.String.valueOf(),
                choices: [
                    {
                        name: 'docs',
                        value: 'docs',
                    },
                    {
                        name: 'donate',
                        value: 'donate',
                    },
                    {
                        name: 'invite',
                        value: 'invite',
                    },
                    {
                        name: 'support',
                        value: 'support',
                    },
                    {
                        name: 'vote',
                        value: 'vote',
                    },
                ],
            },
        ],
    };
    public deferType = CommandDeferType.PUBLIC;
    public requireDev = false;
    public requireGuild = false;
    public requireClientPerms: PermissionsString[] = [];
    public requireUserPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        const link = intr.options.getString(Lang.getCom('arguments.link'));

        let embed: EmbedBuilder;
        switch (link) {
            case 'docs': {
                embed = Lang.getEmbed('displayEmbeds.linkDocs', data.lang());
                break;
            }
            case 'donate': {
                embed = Lang.getEmbed('displayEmbeds.linkDonate', data.lang());
                break;
            }
            case 'invite': {
                embed = Lang.getEmbed('displayEmbeds.linkInvite', data.lang());
                break;
            }
            case 'support': {
                embed = Lang.getEmbed('displayEmbeds.linkSupport', data.lang());
                break;
            }
            case 'vote': {
                embed = Lang.getEmbed('displayEmbeds.linkVote', data.lang());
                break;
            }
            default: {
                return;
            }
        }

        await InteractionUtils.send(intr, embed);
    }
}
