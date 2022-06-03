import { BaseFirestoreRepository, IEntity, PartialBy } from 'fireorm';
import { CacheUtils } from '../../utils/cache-utils.js';

export class CustomBaseRepository<T extends IEntity> extends BaseFirestoreRepository<T> {
    getCacheKey(id: string): string {
        return `database-${this.path}-${id}`;
    }

    async findById(id: string): Promise<T> {
        return await CacheUtils.getOrFetch(this.getCacheKey(id), async () => {
            return await super.findById(id);
        });
    }

    async create(item: PartialBy<T, 'id'>): Promise<T> {
        const result = await super.create(item);
        if (item.id) {
            CacheUtils.del(this.getCacheKey(item.id));
        }
        return result;
    }

    async update(item: T): Promise<T> {
        const result = await super.update(item);
        CacheUtils.del(this.getCacheKey(item.id));
        return result;
    }

    async delete(id: string): Promise<void> {
        const result = await super.delete(id);
        CacheUtils.del(this.getCacheKey(id));
        return result;
    }
}
