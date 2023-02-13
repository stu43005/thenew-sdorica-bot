import { caching, multiCaching } from 'cache-manager';
import fsStore from 'cache-manager-fs-hash';
import config from 'config';

export const MemoryCache = await caching('memory', {
    max: 100,
    ttl: 600 * 1000 /* milliseconds */,
    shouldCloneBeforeSet: false,
});

// eslint-disable-next-line @typescript-eslint/await-thenable
export const DiskCache = await caching(
    fsStore.create({
        store: fsStore,
        options: {
            path: 'cache',
            ttl: config.get('cacheTTLSeconds') /* seconds */,
            subdirs: true,
        },
    })
);

export const CacheUtils = multiCaching([MemoryCache, DiskCache]);
