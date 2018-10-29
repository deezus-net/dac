import {Db} from './db';
import {DbColumn} from './dbColumn';
import {DbIndex} from './dbIndex';
import {DbTable} from './dbTable';

export interface DbDiff {
    addedTables: {[key: string]: DbTable};
    deletedTableNames: string[];
    modifiedTables: {[key: string]: {
            addedColumns: DbColumn[],
            modifiedColumns: {[key: string]: DbColumn[]},
            deletedColumnName: string[],
            addedIndexes: DbIndex[],
            modifiedIndexes: {[key: string]: DbIndex[]},
            deletedIndexNames: string[],
        }
    };
    currentDb: Db;
    newDb: Db;
}
