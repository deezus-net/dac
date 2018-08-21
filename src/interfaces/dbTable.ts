import {DbColumn} from './dbColumn';
import {DbIndex} from './dbIndex';

export interface DbTable {
    columns: { [key: string]: DbColumn };
    indexes: { [key: string]: DbIndex };
}