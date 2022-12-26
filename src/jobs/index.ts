import { AnalyticsStatJob } from './analytics-stat.js';
import { CpuProfileJob } from './cpu-profile.js';
import { Job } from './job.js';
import { ScrapingJob } from './scraping.js';

export const jobs: Job[] = [new CpuProfileJob()];

export const managerJobs: Job[] = [
    // ...(config.get('clustering.enabled') ? [] : [new UpdateServerCountJob(shardManager, httpService)]),
    new AnalyticsStatJob(),
    new ScrapingJob(),
];
