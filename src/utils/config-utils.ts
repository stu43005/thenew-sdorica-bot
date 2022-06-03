import config from 'config';

export class ConfigUtils {
    public static isDevMode(): boolean {
        return config.util.getEnv('NODE_ENV').split(',').includes('development');
    }
}
