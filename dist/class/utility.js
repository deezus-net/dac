"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yaml = require("js-yaml");
exports.dbToYaml = (db) => {
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
            if (!db.tables[tableName].columns[columnName].pk) {
                delete db.tables[tableName].columns[columnName].pk;
            }
        }
    }
    return yaml.safeDump(db);
};
exports.yamlToDb = (src) => {
    const db = yaml.safeLoad(src);
    for (const tableName in db.tables) {
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
    }
    return db;
};
exports.equalColumn = (col1, col2) => {
    return col1.type === col2.type &&
        col1.length || 0 === col2.length || 0 &&
        col1.notNull || false === col2.notNull || false &&
        col1.id || false === col2.id || false &&
        col1.check || null === col2.check || null &&
        col1.default || null === col2.default || null;
};
exports.equalIndex = (index1, index2) => {
    const col1 = Object.keys(index1.columns).map(c => `${c},${index1.columns[c]}`).toString();
    const col2 = Object.keys(index2.columns).map(c => `${c},${index2.columns[c]}`).toString();
    return index1.unique === index2.unique &&
        col1 === col2;
};
exports.checkDbDiff = (orgDb, db) => {
    // tables
    let change = false;
    const orgTableNames = Object.keys(orgDb.tables).concat();
    const tableNames = Object.keys(db.tables);
    for (const tableName of orgTableNames.concat(tableNames)) {
        if (!db.tables[tableName]) {
            console.log(`- ${tableName}`);
            change = true;
        }
        else if (!orgDb.tables[tableName]) {
            console.log(`+ ${tableName}`);
            change = true;
        }
        else {
            // columns
            let mes = [];
            const orgColumnNames = Object.keys(orgDb.tables[tableName].columns);
            const columnNames = Object.keys(db.tables[tableName].columns);
            for (const columnName of orgColumnNames.concat(columnNames)) {
                const columnMes = [];
                let columnChange = false;
                if (!db.tables[tableName].columns[columnName]) {
                    columnMes.push(`  - ${columnName}`);
                }
                else if (!orgDb.tables[tableName].columns[columnName]) {
                    columnMes.push(`  + ${columnName}`);
                }
                else {
                    if (orgDb.tables[tableName].columns[columnName].type !== db.tables[tableName].columns[columnName].type) {
                        columnMes.push(`      type: ${orgDb.tables[tableName].columns[columnName].type} -> ${db.tables[tableName].columns[columnName].type}`);
                        columnChange = true;
                    }
                    if (orgDb.tables[tableName].columns[columnName].pk !== db.tables[tableName].columns[columnName].pk) {
                        columnMes.push(`      pk:${orgDb.tables[tableName].columns[columnName].pk} -> ${db.tables[tableName].columns[columnName].pk}`);
                        columnChange = true;
                    }
                    if (orgDb.tables[tableName].columns[columnName].notNull !== db.tables[tableName].columns[columnName].notNull) {
                        columnMes.push(`      not null:${orgDb.tables[tableName].columns[columnName].notNull} -> ${db.tables[tableName].columns[columnName].notNull}`);
                        columnChange = true;
                    }
                }
                if (columnMes.length > 0) {
                    if (columnChange) {
                        mes.push(`  # ${columnName}`);
                    }
                    mes = mes.concat(columnMes);
                }
            }
            // indexes
            const orgIndexNames = Object.keys(orgDb.tables[tableName].indexes);
            const indexNames = Object.keys(db.tables[tableName].indexes);
            for (const indexName of orgIndexNames.concat(indexNames)) {
                const indexMes = [];
                let indexChange = false;
                if (!db.tables[tableName].indexes[indexName]) {
                    indexMes.push(`  - ${indexName}`);
                }
                else if (!orgDb.tables[tableName].indexes[indexName]) {
                    indexMes.push(`  + ${indexName}`);
                }
                else {
                    const orgIndexColumnNames = Object.keys(orgDb.tables[tableName].indexes[indexName].columns);
                    const indexColumnNames = Object.keys(db.tables[tableName].indexes[indexName].columns);
                    if (orgIndexColumnNames.toString() !== indexColumnNames.toString()) {
                        indexMes.push(`      columns: ${orgIndexColumnNames.join(',')} -> ${indexColumnNames.join(',')}`);
                        indexChange = true;
                    }
                    if (orgDb.tables[tableName].indexes[indexName].unique !== db.tables[tableName].indexes[indexName].unique) {
                        indexMes.push(`    unique: ${orgDb.tables[tableName].indexes[indexName].unique} -> ${db.tables[tableName].indexes[indexName].unique}`);
                        indexChange = true;
                    }
                }
                if (indexMes.length > 0) {
                    if (indexChange) {
                        mes.push(`    # ${indexName}`);
                    }
                    mes = mes.concat(indexMes);
                }
            }
            if (mes.length > 0) {
                console.log(`# ${tableName}`);
                mes.forEach(m => {
                    console.log(m);
                });
                change = true;
            }
        }
    }
    if (!change) {
        console.log('no change');
    }
};
exports.checkDbDiff2 = (orgDb, db) => {
    const result = {
        addTableNames: [],
        deletedTableNames: [],
        modifiedTableNames: [],
        addColumns: {},
        modifiedColumns: {},
        deletedColumnNames: [],
        addIndexes: {},
        modifiedIndexes: {},
        deletedIndexNames: [],
        addForeignKeys: {},
        deletedForeignKeyNames: [],
        modifiedForeignKeys: {}
    };
    // tables
    const orgTableNames = Object.keys(orgDb.tables).concat();
    const tableNames = Object.keys(db.tables);
    for (const tableName of exports.distinct(orgTableNames, tableNames)) {
        if (!db.tables[tableName]) {
            result.deletedTableNames.push(tableName);
        }
        else if (!orgDb.tables[tableName]) {
            result.addTableNames.push(tableName);
        }
        else {
            // columns
            const orgColumnNames = Object.keys(orgDb.tables[tableName].columns);
            const columnNames = Object.keys(db.tables[tableName].columns);
            for (const columnName of exports.distinct(orgColumnNames, columnNames)) {
                if (!db.tables[tableName].columns[columnName]) {
                    if (!result.deletedColumnNames[tableName]) {
                        result.deletedColumnNames[tableName] = [];
                    }
                    result.deletedColumnNames[tableName].push(columnName);
                }
                else if (!orgDb.tables[tableName].columns[columnName]) {
                    if (!result.addColumns[tableName]) {
                        result.addColumns[tableName] = [];
                    }
                    db.tables[tableName].columns[columnName].name = columnName;
                    result.addColumns[tableName].push(db.tables[tableName].columns[columnName]);
                }
                else if (!exports.equalColumn(orgDb.tables[tableName].columns[columnName], db.tables[tableName].columns[columnName])) {
                    if (!result.modifiedColumns[tableName]) {
                        result.modifiedColumns[tableName] = [];
                    }
                    orgDb.tables[tableName].columns[columnName].name = columnName;
                    db.tables[tableName].columns[columnName].name = columnName;
                    result.modifiedColumns[tableName].push({
                        old: orgDb.tables[tableName].columns[columnName],
                        new: db.tables[tableName].columns[columnName]
                    });
                }
            }
            // indexes
            const orgIndexNames = Object.keys(orgDb.tables[tableName].indexes || {});
            const indexNames = Object.keys(db.tables[tableName].indexes || {});
            for (const indexName of exports.distinct(orgIndexNames, indexNames)) {
                if (!(db.tables[tableName].indexes || {})[indexName]) {
                    if (!result.deletedIndexNames[tableName]) {
                        result.deletedIndexNames[tableName] = [];
                    }
                    result.deletedIndexNames[tableName].push(indexName);
                }
                else if (!(orgDb.tables[tableName].indexes || {})[indexName]) {
                    if (!result.addIndexes[tableName]) {
                        result.addIndexes[tableName] = [];
                    }
                    db.tables[tableName].indexes[indexName].name = indexName;
                    result.addIndexes[tableName].push(db.tables[tableName].indexes[indexName]);
                }
                else if (!exports.equalIndex(db.tables[tableName].indexes[indexName], orgDb.tables[tableName].indexes[indexName])) {
                    if (!result.modifiedIndexes[tableName]) {
                        result.modifiedIndexes[tableName] = [];
                    }
                    orgDb.tables[tableName].indexes[indexName].name = indexName;
                    db.tables[tableName].indexes[indexName].name = indexName;
                    result.modifiedIndexes[tableName].push({
                        old: orgDb.tables[tableName].indexes[indexName],
                        new: db.tables[tableName].indexes[indexName]
                    });
                }
            }
        }
    }
    return result;
};
exports.distinct = (array1, array2) => {
    return array1.concat(array2).filter((x, i, org) => org.indexOf(x) === i);
};
//# sourceMappingURL=utility.js.map