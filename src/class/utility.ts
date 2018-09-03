import * as yaml from 'js-yaml';
import {Db} from '../interfaces/db';
import {DbColumn} from '../interfaces/dbColumn';
import { DbDiff } from '../interfaces/dbDiff';
import {DbIndex} from '../interfaces/dbIndex';
import {DbTable} from '../interfaces/dbTable';
import ObjectContaining = jasmine.ObjectContaining;

export const dbToYaml = (db: Db) => {
    // trim property
    /*for (const tableName in db.tables) {
        for (const columnName in db.tables[tableName].columns) {
            if (!db.tables[tableName].columns[columnName].notNull) {
                delete db.tables[tableName].columns[columnName].notNull;
            }
            if (!db.tables[tableName].columns[columnName].default) {
                delete db.tables[tableName].columns[columnName].default;
            }
            if (db.tables[tableName].columns[columnName].length === 0) {
                delete db.tables[tableName].columns[columnName].length;
            }
            if (!db.tables[tableName].columns[columnName].id) {
                delete db.tables[tableName].columns[columnName].id;
            }
            if (!db.tables[tableName].columns[columnName].pk) {
                delete db.tables[tableName].columns[columnName].pk;
            }
        }
    }*/
    return yaml.safeDump(db);
};

export const yamlToDb = (src: string) => {
    const db = yaml.safeLoad(src) as Db;

    /*for (const tableName in db.tables) {
        for (const columnName in db.tables[tableName].columns) {
            if (!db.tables[tableName].columns[columnName].notNull) {
                db.tables[tableName].columns[columnName].notNull = false;
            }

            if (db.tables[tableName].columns[columnName].id) {
                db.tables[tableName].columns[columnName].pk = true;
                db.tables[tableName].columns[columnName].notNull = true;
            }

            if (db.tables[tableName].columns[columnName].pk) {
                db.tables[tableName].columns[columnName].notNull = true;
            }
         
        }

        for (const indexName in db.tables[tableName].indexes) {
            if (!db.tables[tableName].indexes[indexName].unique) {
                db.tables[tableName].indexes[indexName].unique = false;
            }

        }
    }*/
    return db;
};

export const equalColumn = (col1: DbColumn, col2: DbColumn) => {

    // foreign key check
    const fkName1 = Object.keys(col1.fk || {});
    const fkName2 = Object.keys(col2.fk || {});

    let fkDiff = false;
    for (const fkName of distinct(fkName1, fkName2)) {
        if (fkName1.indexOf(fkName) === -1 || fkName2.indexOf(fkName) === -1) {
            fkDiff = true;
            break;
        }

        if ((col1.fk[fkName].update !== col2.fk[fkName].update) || 
            (col1.fk[fkName].delete !== col2.fk[fkName].delete) ||
            (col1.fk[fkName].table !== col2.fk[fkName].table) ||
            (col1.fk[fkName].column !== col2.fk[fkName].column)) {
            fkDiff = true;
            break;
        }
    }
    
    return (col1.type || null) === (col2.type || null) && 
        (col1.length || 0) === (col2.length || 0) && 
        (col1.notNull || false) === (col2.notNull || false) && 
        (col1.id || false) === (col2.id || false) && 
        (col1.check || null) === (col2.check || null) && 
        (col1.default || null) === (col2.default || null) &&
        fkName1.toString() === fkName2.toString() &&
        !fkDiff;
};

export const equalIndex = (index1: DbIndex, index2: DbIndex) => {
    const col1 = Object.keys(index1.columns).map(c => `${c},${index1.columns[c]}`).toString();
    const col2 = Object.keys(index2.columns).map(c => `${c},${index2.columns[c]}`).toString();

    return index1.unique === index2.unique && 
        col1 === col2;
        
};


export const checkDbDiff = (orgDb: Db, db: Db) => {
    const result: DbDiff = {
        addedTables: {},
        deletedTableNames: [],
        modifiedTables: {}
    };
    
    // tables
    const orgTableNames = Object.keys(orgDb.tables).concat();
    const tableNames = Object.keys(db.tables);

    for (const tableName of distinct(orgTableNames, tableNames)) {
        if (!db.tables[tableName]) {
            result.deletedTableNames.push(tableName);

        } else if (!orgDb.tables[tableName]) {
            result.addedTables[tableName] = db.tables[tableName];

        } else {
            // columns
            const orgColumnNames = Object.keys(orgDb.tables[tableName].columns);
            const columnNames = Object.keys(db.tables[tableName].columns);

            for (const columnName of distinct(orgColumnNames, columnNames)) {
                if (!db.tables[tableName].columns[columnName]) {
                    initModifiedTable(result, tableName);
                    result.modifiedTables[tableName].deletedColumnName.push(columnName);

                } else if (!orgDb.tables[tableName].columns[columnName]) {
                    initModifiedTable(result, tableName);
                    result.modifiedTables[tableName].addedColumns[columnName] = db.tables[tableName].columns[columnName];

                } else if (!equalColumn(orgDb.tables[tableName].columns[columnName], db.tables[tableName].columns[columnName])) {
                    initModifiedTable(result, tableName);
                    result.modifiedTables[tableName].modifiedColumns[columnName] = [
                        orgDb.tables[tableName].columns[columnName],
                        db.tables[tableName].columns[columnName]
                    ];
                }
            }

            // indexes
            const orgIndexNames = Object.keys(orgDb.tables[tableName].indexes || {});
            const indexNames = Object.keys(db.tables[tableName].indexes || {});

            for (const indexName of distinct(orgIndexNames, indexNames) ) {
                if (!(db.tables[tableName].indexes || {})[indexName]) {
                    initModifiedTable(result, tableName);
                    result.modifiedTables[tableName].deletedIndexNames.push(indexName);

                } else if (!(orgDb.tables[tableName].indexes || {})[indexName]) {
                    initModifiedTable(result, tableName);
                    result.modifiedTables[tableName].addedIndexes[indexName] = db.tables[tableName].indexes[indexName];

                } else if (!equalIndex(db.tables[tableName].indexes[indexName], orgDb.tables[tableName].indexes[indexName])) {
                    initModifiedTable(result, tableName);
                    db.tables[tableName].indexes[indexName].name = indexName;
                    result.modifiedTables[tableName].modifiedIndexes[indexName] = [
                        orgDb.tables[tableName].indexes[indexName],
                        db.tables[tableName].indexes[indexName]
                    ];
         
                }
                
            }
        }

    }
    return result;
};

/**
 * 
 * @param {DbDiff} result
 * @param {string} tableName
 */
const initModifiedTable = (result: DbDiff, tableName: string) => {
    if (!result.modifiedTables[tableName]) {
        result.modifiedTables[tableName] = {
            addedColumns: [],
            modifiedColumns: {},
            deletedColumnName: [],
            addedIndexes: [],
            modifiedIndexes: {},
            deletedIndexNames: []
        };
    }
};

/**
 * 
 * @param {string[]} array1
 * @param {string[]} array2
 * @returns {Uint8Array}
 */
export const distinct = (array1: string[], array2: string[]) => {
    return array1.concat(array2).filter((x, i, org) => org.indexOf(x) === i);
};

/**
 * 
 * @param {Db} db
 */
export const trimDbProperties = (db: Db) => {
    for (const tableName of Object.keys(db.tables)) {
        const table = db.tables[tableName];
        
        for (const columnName of Object.keys(table.columns)) {
            const column = table.columns[columnName];
            if (column.id) {
                delete column.type;
                delete column.notNull;
                delete column.pk;
                delete column.length;
            } else {
                delete column.id;
            }

            if (!column.pk) {
                delete column.pk;
            } else {
                column.notNull = true;
            }
            if (!column.notNull) {
                delete column.notNull;
            }
            if (!column.default) {
                delete column.default;
            }
            if (column.length === 0) {
                delete column.length;
            }

            for (const fkName of Object.keys(column.fk || {})) {
                if (!column.fk[fkName].update) {
                    delete column.fk[fkName].update;
                }
                if (!column.fk[fkName].delete) {
                    delete column.fk[fkName].delete;
                }
            }

        }

        for (const indexName of Object.keys(table.indexes || {})) {
            const index = table.indexes[indexName];
            if (!index.unique) {
                delete index.unique;
            }

            for (const indexColumnName of Object.keys(index.columns)) {
                index.columns[indexColumnName] = (index.columns[indexColumnName] || '').toLowerCase();
            }
        }
        
        if (Object.keys(table.indexes || {}).length === 0) {
            delete table.indexes;
        }
    }

};