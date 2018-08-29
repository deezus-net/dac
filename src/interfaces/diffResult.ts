import {DbColumn} from './dbColumn';
import {DbForeignKey} from './dbForeignKey';
import {DbIndex} from './dbIndex';

export interface DiffResult {
    addTableNames: string[];
    deletedTableNames: string[];
    modifiedTableNames: string[];

    addColumns: { [key: string]: DbColumn[] };
    modifiedColumns: { [key: string]: ColumnDiff[] };
    deletedColumnNames: string[];

    addIndexes: { [key: string]: DbIndex[] };
    modifiedIndexes: { [key: string]: IndexDiff[] };
    deletedIndexNames: string[];

    addForeignKeys: { [key: string]: DbForeignKey };
    deletedForeignKeyNames: string[];
    modifiedForeignKeys: { [key: string]: ForeignKeyDiff[] };
}

export interface ColumnDiff {
    old: DbColumn;
    new: DbColumn;
}

export interface IndexDiff {
    old: DbIndex;
    new: DbIndex;
}

export interface ForeignKeyDiff {
    old: DbForeignKey;
    new: DbForeignKey;
}