import config from 'config';
import { Request, Response, Router } from 'express';
import router from 'express-promise-router';
import { JobService } from '../../services/job-service.js';
import { Controller } from './controller.js';

export class JobsController implements Controller {
    public path = '/jobs';
    public router: Router = router();
    public authToken: string = config.get('api.secret');

    constructor(private jobService: JobService) {}

    public register(): void {
        this.router.get('/', (req, res) => this.getJobs(req, res));
        this.router.post('/:uuid/run', (req, res) => this.runJob(req, res));
    }

    private async getJobs(req: Request, res: Response): Promise<void> {
        const jobs = this.jobService.jobs.map(job => ({
            uuid: job.uuid,
            name: job.name,
            schedule: job.schedule,
        }));

        res.status(200).json(jobs);
    }

    private async runJob(req: Request, res: Response): Promise<void> {
        const uuid = req.params.uuid;
        const job = this.jobService.jobs.find(job => job.uuid === uuid);
        if (!job) {
            res.status(404);
            return;
        }

        await job.run();
        res.status(201).json({
            ok: true,
        });
    }
}
