import * as yaml from 'js-yaml';
import {Db} from '../interfaces/db';

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