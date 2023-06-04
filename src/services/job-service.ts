import config from 'config';
import { CronJob } from 'cron';
import { createRequire } from 'node:module';
import { Job } from '../jobs/job.js';
import { Logger } from './logger.js';

const require = createRequire(import.meta.url);
const Logs = require('../../lang/logs.json');

export class JobService {
    constructor(public jobs: Job[]) {}

    public start(): void {
        for (const job of this.jobs) {
            const log = job.log ? 'info' : 'debug';
            new CronJob({
                cronTime: job.schedule,
                onTick: async () => {
                    try {
                        if (job.log) {
                            Logger[log](Logs.info.jobRun.replaceAll('{JOB}', job.name));
                        }

                        await job.run();

                        if (job.log) {
                            Logger[log](Logs.info.jobCompleted.replaceAll('{JOB}', job.name));
                        }
                    } catch (error) {
                        Logger.error(Logs.error.job.replaceAll('{JOB}', job.name), error);
                    }
                },
                start: true,
                timeZone: config.get('jobs.timeZone'),
            });
            Logger[log](
                Logs.info.jobScheduled
                    .replaceAll('{JOB}', job.name)
                    .replaceAll('{SCHEDULE}', job.schedule)
            );
        }
    }
}
