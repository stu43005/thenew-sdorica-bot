import config from 'config';
import { URL } from 'node:url';
import {
    LoginClusterResponse,
    RegisterClusterRequest,
    RegisterClusterResponse,
} from '../api/models/master-api/clusters.js';
import { HttpService } from './http-service.js';

export class MasterApiService {
    private clusterId: string | undefined;

    constructor(private httpService: HttpService) {}

    public async register(): Promise<void> {
        const reqBody: RegisterClusterRequest = {
            shardCount: config.get('clustering.shardCount'),
            callback: {
                url: config.get('clustering.callbackUrl'),
                token: config.get('api.secret'),
            },
        };

        const res = await this.httpService.post(
            new URL('/clusters', config.get('clustering.masterApi.url')),
            config.get('clustering.masterApi.token'),
            reqBody
        );

        if (!res.ok) {
            throw res;
        }

        const resBody = (await res.json()) as RegisterClusterResponse;
        this.clusterId = resBody.id;
    }

    public async login(): Promise<LoginClusterResponse> {
        const res = await this.httpService.put(
            new URL(`/clusters/${this.clusterId}/login`, config.get('clustering.masterApi.url')),
            config.get('clustering.masterApi.token')
        );

        if (!res.ok) {
            throw res;
        }

        return (await res.json()) as LoginClusterResponse;
    }

    public async ready(): Promise<void> {
        const res = await this.httpService.put(
            new URL(`/clusters/${this.clusterId}/ready`, config.get('clustering.masterApi.url')),
            config.get('clustering.masterApi.token')
        );

        if (!res.ok) {
            throw res;
        }
    }
}
