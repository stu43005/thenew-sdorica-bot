import config from 'config';
import NodeCache from 'node-cache';

class MyCache extends NodeCache {
    async getOrFetch<T>(
        key: string,
        fetch: () => T | Promise<T>,
        ttl?: number | string
    ): Promise<T> {
        let value = this.get<T>(key);
        if (typeof value === 'undefined') {
            value = await fetch();
            if (ttl) {
                this.set(key, value, ttl);
            } else {
                this.set(key, value);
            }
        }
        return value;
    }
}

export const CacheUtils = new MyCache({
    stdTTL: config.get('cacheTTLSeconds'),
    useClones: false,
});
