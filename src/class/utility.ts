import * as yaml from 'js-yaml';
import {Db} from '../interfaces/db';
import {DbColumn} from "../interfaces/dbColumn";
import {DbIndex} from "../interfaces/dbIndex";

export const dbToYaml = (db: Db) => {
    // trim property
    for (const tableName in db.tables) {
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
        }
    }
    return yaml.safeDump(db);
};

export const equalColumn = (col1: DbColumn, col2: DbColumn) => {
    return col1.type === col2.type && 
        col1.length || 0 === col2.length || 0 && 
        col1.notNull || false === col2.notNull || false && 
        col1.id || false === col2.id || false && 
        col1.check || null === col2.check || null && 
        col1.default || null === col2.default || null;
};

export const equalIndex = (index1: DbIndex, index2: DbIndex) => {
    const col1 = Object.keys(index1.columns).map(c => `${c},${index1.columns[c]}`).toString();
    const col2 = Object.keys(index2.columns).map(c => `${c},${index2.columns[c]}`).toString();
    
    return index1.unique === index2.unique && 
        col1 === col2
        
};