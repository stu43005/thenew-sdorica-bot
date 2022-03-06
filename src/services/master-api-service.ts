import config from 'config';
import { URL } from 'node:url';
import {
    LoginClusterResponse,
    RegisterClusterRequest,
    RegisterClusterResponse
} from '../models/master-api/index.js';
import { HttpService } from './index.js';

export class MasterApiService {
    private clusterId: string;

    constructor(private httpService: HttpService) { }

    public async register(): Promise<void> {
        let reqBody: RegisterClusterRequest = {
            shardCount: config.get('clustering.shardCount'),
            callback: {
                url: config.get('clustering.callbackUrl'),
                token: config.get('api.secret'),
            },
        };

        let res = await this.httpService.post(
            new URL('/clusters', config.get('clustering.masterApi.url')),
            config.get('clustering.masterApi.token'),
            reqBody
        );

        if (!res.ok) {
            throw res;
        }

        let resBody = (await res.json()) as RegisterClusterResponse;
        this.clusterId = resBody.id;
    }

    public async login(): Promise<LoginClusterResponse> {
        let res = await this.httpService.put(
            new URL(`/clusters/${this.clusterId}/login`, config.get('clustering.masterApi.url')),
            config.get('clustering.masterApi.token')
        );

        if (!res.ok) {
            throw res;
        }

        return (await res.json()) as LoginClusterResponse;
    }

    public async ready(): Promise<void> {
        let res = await this.httpService.put(
            new URL(`/clusters/${this.clusterId}/ready`, config.get('clustering.masterApi.url')),
            config.get('clustering.masterApi.token')
        );

        if (!res.ok) {
            throw res;
        }
    }
}
