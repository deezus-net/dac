import {DbTable} from './dbTable';

export interface Db {
    tables: { [key: string]: DbTable };
}