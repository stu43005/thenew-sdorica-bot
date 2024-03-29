import { BaseFirestoreRepository, Constructor, IEntity, PartialBy } from 'fireorm';
import { MemoryCache } from '../../utils/cache-utils.js';

const FIND_ALL_KEY = '*';

export class CustomBaseRepository<T extends IEntity> extends BaseFirestoreRepository<T> {
    getCacheKey(id: string): string {
        return `database/${this.path}/${id}`;
    }

    async getOrCreate(id: string, c: Constructor<T>): Promise<T> {
        let entity = await this.findById(id);
        if (!entity) {
            entity = new c();
            entity.id = id;
            entity = await this.create(entity);
        }
        return entity;
    }

    async find(): Promise<T[]> {
        return await MemoryCache.wrap(this.getCacheKey(FIND_ALL_KEY), async () => {
            return await super.find();
        });
    }

    async findById(id: string): Promise<T> {
        return await MemoryCache.wrap(this.getCacheKey(id), async () => {
            return await super.findById(id);
        });
    }

    async create(item: PartialBy<T, 'id'>): Promise<T> {
        const result = await super.create(item);
        if (item.id) {
            await MemoryCache.del(this.getCacheKey(item.id));
        }
        await MemoryCache.del(this.getCacheKey(FIND_ALL_KEY));
        return result;
    }

    async update(item: T): Promise<T> {
        const result = await super.update(item);
        await MemoryCache.del(this.getCacheKey(item.id));
        await MemoryCache.del(this.getCacheKey(FIND_ALL_KEY));
        return result;
    }

    async delete(id: string): Promise<void> {
        const result = await super.delete(id);
        await MemoryCache.del(this.getCacheKey(id));
        await MemoryCache.del(this.getCacheKey(FIND_ALL_KEY));
        return result;
    }
}
