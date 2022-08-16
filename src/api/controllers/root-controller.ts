import config from 'config';
import { Request, Response, Router } from 'express';
import router from 'express-promise-router';
import { checkAuth } from '../middleware/check-auth.js';
import { Controller } from './controller.js';

export class RootController implements Controller {
    public path = '/';
    public router: Router = router();
    public authToken: string = config.get('api.secret');

    public register(): void {
        this.router.get('/', (req, res) => this.get(req, res));
        this.router.post('/video-archive', checkAuth(this.authToken), (req, res) =>
            this.addVideoArchive(req, res)
        );
        this.router.get('/video-archive', checkAuth(this.authToken), (req, res) =>
            this.videoArchive(req, res)
        );
    }

    private async get(req: Request, res: Response): Promise<void> {
        res.status(200).json({ name: 'Discord Bot Cluster API', author: 'Kevin Novak' });
    }

    private videos: string[] = [];

    private async addVideoArchive(req: Request, res: Response): Promise<void> {
        const video = req.body.video;
        if (video) {
            this.videos.push(video);
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
