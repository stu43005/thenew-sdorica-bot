import config from 'config';
import * as os from 'node:os';
import { cpuProfile } from '../services/cpu-profile.js';
import { Logger } from '../services/logger.js';
import { Job } from './job.js';

export class CpuProfileJob implements Job {
    public name = 'CpuProfile';
    public schedule: string = config.get('jobs.cpuprofile.schedule');
    public log: boolean = config.get('jobs.cpuprofile.log');

    private running = false;

    public async run(): Promise<void> {
        if (this.running) return;

        const load = os.loadavg()[1];
        if (load > 90) {
            this.running = true;

            try {
                const title = `profile-${Date.now()}`;
                await cpuProfile(title);
            } catch (error) {
                Logger.error('CpuProfile error:', error);
            } finally {
                this.running = false;
            }
        }
    }
}
