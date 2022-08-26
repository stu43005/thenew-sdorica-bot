import config from 'config';
import { Request, Response, Router } from 'express';
import router from 'express-promise-router';
import { Controller } from './controller.js';

export class VideoArchiveController implements Controller {
    public path = '/video-archive';
    public router: Router = router();
    public authToken: string = config.get('api.secret');

    public register(): void {
        this.router.post('/', (req, res) => this.addVideoArchive(req, res));
        this.router.get('/', (req, res) => this.videoArchive(req, res));
    }

    private videos: VideoArchiveData[] = [];

    private async addVideoArchive(req: Request, res: Response): Promise<void> {
        const video: string = req.body.video;
        const webhook: string = req.body.webhook;
        if (video) {
            this.videos.push({
                video,
                webhook,
            });
            res.status(200).json({ ok: 'OK' });
            return;
        }
        res.status(400).end('video is required.');
    }

    private async videoArchive(req: Request, res: Response): Promise<void> {
        res.status(200).json({ videos: this.videos });
        this.videos.length = 0;
    }
}

export interface VideoArchiveData {
    video: string;
    webhook: string;
}
