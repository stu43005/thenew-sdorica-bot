import djs, {
    ChatInputCommandInteraction,
    PermissionsBitField,
    PermissionsString,
    SlashCommandBuilder,
} from 'discord.js';
import fileSize from 'filesize';
import { createRequire } from 'node:module';
import os from 'node:os';
import { EventData } from '../models/event-data.js';
import { Lang } from '../services/lang.js';
import { InteractionUtils } from '../utils/interaction-utils.js';
import { ShardUtils } from '../utils/shard-utils.js';
import { Command, CommandDeferType } from './command.js';

const require = createRequire(import.meta.url);
const TsConfig = require('../../tsconfig.json');

export class DevCommand implements Command {
    public metadata = new SlashCommandBuilder()
        .setName(Lang.getCom('commands.dev'))
        .setDescription(Lang.getRef('commandDescs.dev', Lang.Default))
        .setDefaultMemberPermissions(new PermissionsBitField().add('Administrator').valueOf())
        .toJSON();
    public deferType = CommandDeferType.HIDDEN;
    public requireDev = true;
    public requireGuild = false;
    public requireClientPerms: PermissionsString[] = [];
    public requireUserPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        const shardCount = intr.client.shard?.count ?? 1;
        let serverCount: number;
        if (intr.client.shard) {
            try {
                serverCount = await ShardUtils.serverCount(intr.client.shard);
            } catch (error: any) {
                // SHARDING_IN_PROCESS: Shards are still being spawned.
                if (error.name.includes('SHARDING_IN_PROCESS')) {
                    await InteractionUtils.send(
                        intr,
                        Lang.getEmbed('errorEmbeds.startupInProcess', data.lang())
                    );
                    return;
                } else {
                    throw error;
                }
            }
        } else {
            serverCount = intr.client.guilds.cache.size;
        }

        const memory = process.memoryUsage();
        await InteractionUtils.send(
            intr,
            Lang.getEmbed('displayEmbeds.dev', data.lang(), {
                NODE_VERSION: process.version,
                // TS_VERSION: `v${typescript.version}`,
                ES_VERSION: TsConfig.compilerOptions.target,
                DJS_VERSION: `v${djs.version}`,
                SHARD_COUNT: shardCount.toLocaleString(),
                SERVER_COUNT: serverCount.toLocaleString(),
                SERVER_COUNT_PER_SHARD: Math.round(serverCount / shardCount).toLocaleString(),
                RSS_SIZE: fileSize(memory.rss),
                RSS_SIZE_PER_SERVER:
                    serverCount > 0
                        ? fileSize(memory.rss / serverCount)
                        : Lang.getRef('other.na', data.lang()),
                HEAP_TOTAL_SIZE: fileSize(memory.heapTotal),
                HEAP_TOTAL_SIZE_PER_SERVER:
                    serverCount > 0
                        ? fileSize(memory.heapTotal / serverCount)
                        : Lang.getRef('other.na', data.lang()),
                HEAP_USED_SIZE: fileSize(memory.heapUsed),
                HEAP_USED_SIZE_PER_SERVER:
                    serverCount > 0
                        ? fileSize(memory.heapUsed / serverCount)
                        : Lang.getRef('other.na', data.lang()),
                HOSTNAME: os.hostname(),
                SHARD_ID: (intr.guild?.shardId ?? 0).toString(),
                SERVER_ID: intr.guild?.id ?? Lang.getRef('other.na', data.lang()),
                BOT_ID: intr.client.user?.id || '',
                USER_ID: intr.user.id,
            })
        );
    }
}
