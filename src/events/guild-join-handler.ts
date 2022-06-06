import { Guild } from 'discord.js';
import { createRequire } from 'node:module';
import { Logger } from '../services/index.js';
import { EventHandler } from './event-handler.js';

const require = createRequire(import.meta.url);
const Logs = require('../../lang/logs.json');

export class GuildJoinHandler implements EventHandler {
    public async process(guild: Guild): Promise<void> {
        Logger.info(
            Logs.info.guildJoined
                .replaceAll('{GUILD_NAME}', guild.name)
                .replaceAll('{GUILD_ID}', guild.id)
        );

        // Get data from database
        // const data = new EventData(
        //     undefined,
        //     await getGuildRepository().findById(guild.id)
        // );

        // Send welcome message to the server's notify channel
        // const guildLang = data.lang();
        // const notifyChannel = await ClientUtils.findNotifyChannel(guild, guildLang);
        // if (notifyChannel) {
        //     await MessageUtils.send(
        //         notifyChannel,
        //         Lang.getEmbed('displayEmbeds.welcome', guildLang).setAuthor({
        //             name: guild.name,
        //             iconURL: guild.iconURL() || undefined,
        //         })
        //     );
        // }

        // Send welcome message to owner
        // const ownerLang = Lang.Default;
        // const owner = await guild.fetchOwner();
        // if (owner) {
        //     await MessageUtils.send(
        //         owner.user,
        //         Lang.getEmbed('displayEmbeds.welcome', ownerLang).setAuthor({
        //             name: guild.name,
        //             iconURL: guild.iconURL() || undefined,
        //         })
        //     );
        // }
    }
}
