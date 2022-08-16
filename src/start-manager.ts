import config from 'config';
import { ShardingManager } from 'discord.js';
import { createRequire } from 'node:module';
import 'reflect-metadata';
import { Api } from './api/api.js';
import { GuildsController } from './api/controllers/guilds-controller.js';
import { RootController } from './api/controllers/root-controller.js';
import { ShardsController } from './api/controllers/shards-controller.js';
import { VideoArchiveController } from './api/controllers/video-archive-controller.js';
import { managerJobs } from './jobs/index.js';
import { Manager } from './models/manager.js';
import { HttpService } from './services/http-service.js';
import { JobService } from './services/job-service.js';
import { Logger } from './services/logger.js';
import { MasterApiService } from './services/master-api-service.js';
import { MathUtils } from './utils/math-utils.js';
import { ShardUtils } from './utils/shard-utils.js';

const require = createRequire(import.meta.url);
const Logs = require('../lang/logs.json');

async function start(): Promise<void> {
    Logger.info(Logs.info.appStarted);

    // Dependencies
    const httpService = new HttpService();
    const masterApiService = new MasterApiService(httpService);
    if (config.get('clustering.enabled')) {
        await masterApiService.register();
    }

    // Sharding
    let shardList: number[];
    let totalShards: number;
    try {
        if (config.get('clustering.enabled')) {
            const resBody = await masterApiService.login();
            shardList = resBody.shardList;
            const requiredShards = await ShardUtils.requiredShardCount(config.get('client.token'));
            totalShards = Math.max(requiredShards, resBody.totalShards);
        } else {
            const recommendedShards = await ShardUtils.recommendedShardCount(
                config.get('client.token'),
                config.get('sharding.serversPerShard')
            );
            shardList = MathUtils.range(0, recommendedShards);
            totalShards = recommendedShards;
        }
    } catch (error) {
        Logger.error(Logs.error.retrieveShards, error);
        return;
    }

    if (shardList.length === 0) {
        Logger.warn(Logs.warn.managerNoShards);
        return;
    }

    const shardManager = new ShardingManager('dist/start-bot.js', {
        token: config.get('client.token'),
        mode: config.get('debug.override.shardMode.enabled')
            ? config.get('debug.override.shardMode.value')
            : 'worker',
        respawn: true,
        totalShards,
        shardList,
    });

    const manager = new Manager(shardManager, new JobService(managerJobs));

    // API
    const guildsController = new GuildsController(shardManager);
    const shardsController = new ShardsController(shardManager);
    const videoArchiveController = new VideoArchiveController();
    const rootController = new RootController();
    const api = new Api([
        guildsController,
        shardsController,
        videoArchiveController,
        rootController,
    ]);

    // Start
    await manager.start();
    await api.start();
    if (config.get('clustering.enabled')) {
        await masterApiService.ready();
    }
}

process.on('unhandledRejection', (reason, _promise) => {
    Logger.error(Logs.error.unhandledRejection, reason);
});

start().catch(error => {
    Logger.error(Logs.error.unspecified, error);
});
