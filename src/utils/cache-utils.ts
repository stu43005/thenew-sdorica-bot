import { createCache, KeyvAdapter } from 'cache-manager';
import { DiskStore } from 'cache-manager-fs-hash';
import { CacheableMemory } from 'cacheable';
import config from 'config';
import { Keyv } from 'keyv';

const memory = new CacheableMemory({
    ttl: 600 * 1000 /* milliseconds */,
    lruSize: 100,
    useClone: false,
});

export const MemoryCache = createCache({
    stores: [new Keyv({ store: memory })],
});

const fsStore = new DiskStore({
    path: 'cache',
    ttl: config.get<number>('cacheTTLSeconds') * 1000 /* milliseconds */,
    subdirs: true,
});

export const DiskCache = createCache({
    stores: [new Keyv({ store: new KeyvAdapter(fsStore) })],
});

export const CacheUtils = createCache({
    stores: [new Keyv({ store: memory }), new Keyv({ store: new KeyvAdapter(fsStore) })],
});
