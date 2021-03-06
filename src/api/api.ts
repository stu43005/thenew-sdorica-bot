import config from 'config';
import express, { Express } from 'express';
import * as http from 'node:http';
import { createRequire } from 'node:module';
import util from 'node:util';
import { Logger } from '../services/logger.js';
import { Controller } from './controllers/controller.js';
import { checkAuth } from './middleware/check-auth.js';
import { handleError } from './middleware/handle-error.js';

const require = createRequire(import.meta.url);
const Logs = require('../../lang/logs.json');

export class Api {
    private app: Express;

    constructor(public controllers: Controller[]) {
        this.app = express();
        this.app.use(express.json());
        this.setupControllers();
        this.app.use(handleError());
    }

    public async start(): Promise<void> {
        const listen = util.promisify(this.app.listen.bind(this.app)) as (
            port: number
        ) => Promise<http.Server>;
        const port = process.env.PORT || config.get<number>('api.port');
        await listen(+port);
        Logger.info(Logs.info.apiStarted.replaceAll('{PORT}', port));
    }

    private setupControllers(): void {
        for (const controller of this.controllers) {
            if (controller.authToken) {
                controller.router.use(checkAuth(controller.authToken));
            }
            controller.register();
            this.app.use(controller.path, controller.router);
        }
    }
}
