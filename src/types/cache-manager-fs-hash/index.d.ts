declare module 'cache-manager-fs-hash' {
    interface DiskStoreOptions {
        path?: string; // 緩存文件的存儲路徑
        ttl?: number; // 緩存的生命時間，以毫秒為單位
        zip?: boolean; // 是否壓縮內容以節省磁碟空間
        subdirs?: boolean; // 是否建立子目錄
        lockFile?: {
            wait?: number; // 鎖定等待的時間
            pollPeriod?: number; // 鎖定檢查的時間間隔
            stale?: number; // 鎖定過期的時間
            retries?: number; // 嘗試鎖定的次數
            retryWait?: number; // 嘗試鎖定之間的等待時間
        };
    }

    class DiskStore {
        name: string;

        constructor(options?: DiskStoreOptions);

        set(key: string, val: any, ttl?: number | { ttl: number }): Promise<void>; // 儲存一個條目
        get(key: string): Promise<any>; // 獲取一個條目
        ttl(key: string): Promise<number>; // 獲取該鍵的剩餘生命時間
        del(key: string): Promise<void>; // 刪除條目
        reset(): Promise<void>; // 重置所有緩存
        mset(...keyValues: (string | any)[]): Promise<void>; // 批量儲存條目
        mget(...keys: string[]): Promise<any[]>; // 批量獲取條目
        mdel(...keys: string[]): Promise<void>; // 批量刪除條目
        keys(): Promise<string[]>; // 獲取所有鍵（未實現）

        // 內部使用
        private _readFile(key: string): Promise<any>;
        private _lock(filePath: string): Promise<void>;
        private _unlock(filePath: string): Promise<void>;
        private _getFilePathByKey(key: string): string;
    }

    export { DiskStore, DiskStoreOptions };
    export function create(options?: DiskStoreOptions): DiskStore; // 創建一個 DiskStore 實例
}
