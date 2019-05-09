import * as mysql from 'promise-mysql';
import {Db} from '../interfaces/db';
import {DbColumn} from '../interfaces/dbColumn';
import {DbHost} from '../interfaces/dbHost';
import {DbInterface} from '../interfaces/dbInterface';
import {DbTable} from '../interfaces/dbTable';
import {checkDbDiff, distinct, trimDbProperties} from './utility';

export class DbMysql implements DbInterface {

    private connection: mysql.Connection;
    private dbHost: DbHost;

    constructor(dbHost: DbHost) {
        this.dbHost = dbHost;
    }

    /**
     *
     * @returns {Promise<boolean>}
     */
    public async connect() {
        this.connection = await mysql.createConnection({
            host: this.dbHost.host,
            user: this.dbHost.user,
            password: this.dbHost.password,
            database: this.dbHost.database,
            multipleStatements: true,

        });

        return true;
    }

    /**
     *
     * @returns {Promise<boolean>}
     */
    public async close() {
        await this.connection.end();
        return true;
    }

    /**
     *
     * @param {Db} db
     * @param queryOnly
     * @returns {Promise<boolean>}
     */
    public async create(db: Db, queryOnly: boolean) {
        const query = this.createQuery(db.tables);
        if (!queryOnly) {
            await this.connection.query(query);
        }
        return query;
    }

    /**
     * 
     * @param {Db} db
     * @param {boolean} queryOnly
     * @returns {Promise<string>}
     */
    public async drop(db: Db, queryOnly: boolean) {
        const queries = [];
        for (const tableName of Object.keys(db.tables)){
            queries.push(`DROP TABLE IF EXISTS \`${tableName}\`;`);
        }
        const execQuery = queries.join('\n');

        if (!queryOnly) {
            await this.connection.query('BEGIN;');
            await this.connection.query(`SET FOREIGN_KEY_CHECKS = 0;`);
            await this.connection.query(execQuery);
            await this.connection.query(`SET FOREIGN_KEY_CHECKS = 1;`);
            await this.connection.query('COMMIT;');
        }
        return execQuery;
    }

    /**
     *
     * @param {Db} db
     * @returns {Promise<DiffResult>}
     */
    public async diff(db: Db) {
        const orgDb = await this.extract();
        return checkDbDiff(orgDb, db);
    }

    /**
     *
     * @returns {Promise<{tables: {[p: string]: DbTable}}>}
     */
    public async extract(checkDiff: boolean = true) {
        const tables: { [key: string]: DbTable } = {};

        const data = await this.connection.query('show tables');
        for (const row of data) {
            tables[row[Object.keys(row)[0]]] = {
                columns: {},
                indexes: {}
            };
        }

        for (const tableName of Object.keys(tables)) {
            // get column list
            for (const row of await this.connection.query(`DESCRIBE ${tableName}`)) {
                let type = row['Type'];
                let length = parseInt((type.match(/\(([0-9]+)\)/) || [])[1] || 0, 10);
                type = type.replace(/\([0-9]+\)/, '');

                if (type === 'int') {
                    length = 0;
                }

                const column: DbColumn = {
                    type: type,
                    length: length,
                    pk: row['Key'] === 'PRI',
                    notNull: row['Null'] === 'NO',
                    id: row['Extra'] === 'auto_increment'
                };
                if (row['Default']) {
                    column.default = row['Default'];
                }
                tables[tableName].columns[row['Field']] = column;
            }

            // get foregin key
            const fkNames = [];
            const query = `
                    SELECT
                        col.TABLE_NAME AS table_name,
                        col.COLUMN_NAME AS column_name,
                        t.CONSTRAINT_NAME AS constraint_name,
                        col.REFERENCED_TABLE_NAME AS foreign_table_name,
                        col.REFERENCED_COLUMN_NAME AS foreign_column_name,
                        rc.UPDATE_RULE,
                        rc.DELETE_RULE 
                    FROM
                        information_schema.KEY_COLUMN_USAGE col 
                    INNER JOIN
                        information_schema.TABLE_CONSTRAINTS t 
                    ON
                        col.TABLE_SCHEMA = t.TABLE_SCHEMA 
                    AND
                        col.CONSTRAINT_NAME = t.CONSTRAINT_NAME 
                    INNER JOIN 
                        information_schema.REFERENTIAL_CONSTRAINTS AS rc 
                    ON
                        col.CONSTRAINT_name = rc.CONSTRAINT_NAME 
                    AND
                        col.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA 
                    WHERE
                        t.TABLE_SCHEMA = ? 
                    AND 
                        t.TABLE_NAME = ? 
                    AND
                        t.CONSTRAINT_TYPE = 'FOREIGN KEY'`;
            for (const row of await this.connection.query(query, [this.dbHost.database, tableName])) {

                const columnName = row['column_name'];
                if (!tables[tableName].columns[columnName].fk) {
                    tables[tableName].columns[columnName].fk = {};
                }

                if (Object.keys(tables[tableName].columns).indexOf(columnName) === -1) {
                    continue;
                }

                let updateRule = row['UPDATE_RULE'];
                let deleteRule = row['DELETE_RULE'];

                if (updateRule === 'NO ACTION' || updateRule === 'RESTRICT') {
                    updateRule = '';
                }
                if (deleteRule === 'NO ACTION' || deleteRule === 'RESTRICT') {
                    deleteRule = '';
                }

                fkNames.push(row['constraint_name']);
                tables[tableName].columns[columnName].fk[row['constraint_name']] = {
                    table: row['foreign_table_name'],
                    column: row['foreign_column_name'],
                    update: updateRule,
                    delete: deleteRule
                };
            }

            // get index list
            for (const row of await this.connection.query(`SHOW INDEX FROM ${tableName} WHERE Key_name != 'PRIMARY'`)) {

                const indexName = row['Key_name'];
                if (fkNames.indexOf(indexName) !== -1 && checkDiff) {
                    // ignore when same name foreign key exists
                    continue;
                }
                const nonUnique = parseInt(row['Non_unique'], 10);
                const collation = row['Collation'];
                if (!tables[tableName].indexes[indexName]) {
                    tables[tableName].indexes[indexName] = {
                        unique: nonUnique === 0,
                        columns: {}
                    };
                }
                if (row['Index_type'] === 'FULLTEXT') {
                    tables[tableName].indexes[indexName].type = 'fulltext';
                    tables[tableName].indexes[indexName].columns[row['Column_name']] = 'ASC';
                } else {
                    tables[tableName].indexes[indexName].columns[row['Column_name']] = collation === 'A' ? 'ASC' : 'DESC';
                }
            }
        }
        const db = {tables: tables};
        trimDbProperties(db);
        return db;

    }

    /**
     *
     * @param {Db} db
     * @returns {Bluebird<string[]>}
     */
    public query(db: Db) {
        return this.createQuery(db.tables);
    }

    /**
     *
     * @param {{[p: string]: DbTable}} tables
     * @returns {Bluebird<string[]>}
     */
    private createQuery(tables: { [key: string]: DbTable }) {
        const query: string[] = [];

        for (const tableName of Object.keys(tables)) {
            const table = tables[tableName];

            query.push(`CREATE TABLE \`${tableName}\` (`);
            const columnQuery: string[] = [];
            const pk: string[] = [];

            for (const columnName of Object.keys(table.columns)) {

                const column = table.columns[columnName];
                if (column.id) {
                    column.notNull = true;
                    column.type = 'int';
                }
                const notNull = column.notNull ? ' NOT NULL ' : '';
                const check = column.check ? ` CHECK(${column.check}) ` : '';
                const def = column.default ? ` DEFAULT ${column.default} ` : '';
                const type = column.type + (column.length > 0 ? `(${column.length})` : '');

                columnQuery.push(`    \`${columnName}\` ${type}${(column.id ? ' AUTO_INCREMENT ' : '')}${notNull}${def}${check}`);
                if (column.pk || column.id) {
                    pk.push(columnName);
                }
            }
            query.push(columnQuery.join(',\n') + (pk.length > 0 ? ',' : ''));

            if (pk.length > 0) {
                query.push('    PRIMARY KEY');
                query.push('    (');

                const pkQuery: string[] = [];
                pk.forEach(p => {
                    pkQuery.push(`        \`${p}\``);
                });
                query.push(pkQuery.join(',\n'));
                query.push('    )' + (Object.keys((table.indexes || {})).length > 0 ? ',' : ''));
            }

            const indexQuery: string[] = [];
            for (const indexName of Object.keys((table.indexes || {}))) {
                const index = table.indexes[indexName];
                const indexColumns = [];
                for (const c of Object.keys(index.columns)) {
                    indexColumns.push(c);
                }

                const tmp: string[] = [];
                tmp.push(`    ${(index.unique ? 'UNIQUE ' : '')}${((index.type || '').toLowerCase() === 'fulltext' ? 'FULLTEXT ' : '')}INDEX \`${indexName}\``);
                tmp.push('    (');
                tmp.push('        ' + indexColumns.map(c => `\`${c}\` ${index.columns[c]}`).join(','));
                tmp.push(`    )`);

                indexQuery.push(tmp.join('\n'));
            }
            query.push(indexQuery.join(',\n'));
            query.push(');');

        }

        // foregin key
        for (const tableName of Object.keys(tables)) {
            const table = tables[tableName];
            for (const columnName of Object.keys(table.columns).filter(c => table.columns[c].fk)) {
                const column = table.columns[columnName];

                for (const fkName of Object.keys(column.fk)) {
                    const fk = column.fk[fkName];
                    query.push(DbMysql.createAlterForeignKey(fkName, tableName, columnName, fk.table, fk.column, fk.update, fk.delete));
                }
            }
        }
        return query.join('\n');

    }


    /**
     *
     * @param {Db} db
     * @param queryOnly
     * @returns {Promise<boolean>}
     */
    public async reCreate(db: Db, queryOnly: boolean) {

        const tables = [];
        const data = await this.connection.query('show tables');
        for (const row of data) {
            tables.push(row[Object.keys(row)[0]]);
        }

        const query = [];
        if (tables.length > 0) {
            query.push(`SET FOREIGN_KEY_CHECKS = 0;`);
            query.push(`DROP TABLE ${tables.map(t => `\`${t}\``).join(',')};`);
            query.push(`SET FOREIGN_KEY_CHECKS = 1;`);
        }

        query.push(this.createQuery(db.tables));
        
        const execQuery = query.join('\n');
        if (!queryOnly) {
            await this.connection.query('BEGIN;');
            await this.connection.query(execQuery);
            await this.connection.query('COMMIT;');
        }

        return execQuery;

    }

    /**
     *
     * @param {Db} db
     * @param queryOnly
     * @returns {Promise<void>}
     */
    public async update(db: Db, queryOnly: boolean) {
        const diff = await this.diff(db);
        const orgDb = diff.currentDb;
        const query = [];
        const createFkQuery = [];
        const dropFkQuery = [];
        // fk


        // add tables
        if (Object.keys(diff.addedTables).length > 0) {
            query.push(this.createQuery(diff.addedTables));
        }
        
        for (const tableName of Object.keys(diff.modifiedTables)) {
            const table = diff.modifiedTables[tableName];

            // add columns
            for (const columnName of Object.keys(table.addedColumns)) {
                const column = table.addedColumns[columnName];

                const notNull = column.notNull ? ' NOT NULL ' : ' NULL ';
                const def = column.default ? ` DEFAULT ${column.default} ` : '';
                const type = (column.id ? 'int' : column.type) + (column.length > 0 ? `(${column.length})` : '');
                const check = column.check ? ` CHECK(${column.check}) ` : '';
                
                query.push(`ALTER TABLE`);
                query.push(`    \`${tableName}\``);
                query.push(`ADD COLUMN \`${columnName}\` ${type}${ (column.id ? ' AUTO_INCREMENT' : '')}${notNull}${def}${check};`);

                for (const fkName of Object.keys(column.fk || {})) {
                    const fk = column.fk[fkName];
                    createFkQuery.push(DbMysql.createAlterForeignKey(fkName, tableName, columnName, fk.table, fk.column, fk.update, fk.delete));
                }
            }

            // modify columns
            for (const columnName of Object.keys(table.modifiedColumns)) {
                const [orgColumn, newColumn] = table.modifiedColumns[columnName];
                
                const notNull = newColumn.notNull ? ' NOT NULL ' : ' NULL ';
                const def = newColumn.default ? ` DEFAULT ${newColumn.default} ` : '';
                const type = (newColumn.id ? 'int' : newColumn.type) + (newColumn.length > 0 ? `(${newColumn.length})` : '');
                const check = newColumn.check ? ` CHECK(${newColumn.check}) ` : '';

                query.push(`ALTER TABLE`);
                query.push(`    \`${tableName}\``);
                query.push(`MODIFY \`${columnName}\` ${type}${(newColumn.id ? ' AUTO_INCREMENT' : '')}${notNull}${def};`);

                // foreign key
                const orgFkName = Object.keys(orgColumn.fk || {});
                const newFkName = Object.keys(newColumn.fk || {});

                for (const fkName of distinct(orgFkName, newFkName)) {
                    if (orgFkName.indexOf(fkName) === -1) {
                        const fk = newColumn.fk[fkName];
                        createFkQuery.push(DbMysql.createAlterForeignKey(fkName, tableName, columnName, fk.table, fk.column, fk.update, fk.delete));

                        continue;
                    }

                    if (newFkName.indexOf(fkName) === -1) {

                        dropFkQuery.push(`ALTER TABLE`);
                        dropFkQuery.push(`    \`${tableName}\``);
                        dropFkQuery.push(`DROP FOREIGN KEY \`${fkName}\`;`);

                        // drop foreign key index
                        dropFkQuery.push(`ALTER TABLE`);
                        dropFkQuery.push(`    \`${tableName}\``);
                        dropFkQuery.push(`DROP INDEX \`${fkName}\`;`);
                        continue;
                    }

                    if ((orgColumn.fk[fkName].update !== newColumn.fk[fkName].update) ||
                        (orgColumn.fk[fkName].delete !== newColumn.fk[fkName].delete) ||
                        (orgColumn.fk[fkName].table !== newColumn.fk[fkName].table) ||
                        (orgColumn.fk[fkName].column !== newColumn.fk[fkName].column)) {

                        dropFkQuery.push(`ALTER TABLE`);
                        dropFkQuery.push(`    \`${tableName}\``);
                        dropFkQuery.push(`DROP FOREIGN KEY \`${fkName}\`;`);

                        // drop foreign key index
                        dropFkQuery.push(`ALTER TABLE`);
                        dropFkQuery.push(`    \`${tableName}\``);
                        dropFkQuery.push(`DROP INDEX \`${fkName}\`;`);

                        const fk = newColumn.fk[fkName];
                        createFkQuery.push(DbMysql.createAlterForeignKey(fkName, tableName, columnName, fk.table, fk.column, fk.update, fk.delete));
                    }
                }
            
            }

            // drop columns
            for (const columnName of table.deletedColumnName) {
                query.push(`ALTER TABLE`);
                query.push(`    \`${tableName}\``);
                query.push(`DROP COLUMN \`${columnName}\`;`);
            }

            // create index
            for (const indexName of Object.keys(table.addedIndexes)) {
                const index = table.addedIndexes[indexName];

                query.push(`ALTER TABLE`);
                query.push(`    \`${tableName}\``);
                query.push(`ADD ${(index.unique ? 'UNIQUE ' : '')}${((index.type || '').toLowerCase() === 'fulltext' ? 'FULLTEXT ' : '')}INDEX \`${indexName}\` (${Object.keys(index.columns).map(c => `\`${c}\` ${index.columns[c]}`)});`);
            }
            
            // modify index
            for (const indexName of Object.keys(table.modifiedIndexes)) {
                const [, index] = table.modifiedIndexes[indexName];

                query.push(`ALTER TABLE`);
                query.push(`    \`${tableName}\``);
                query.push(`DROP INDEX`); 
                query.push(`    \`${indexName}\`,`);
                query.push(`ADD ${(index.unique ? 'UNIQUE ' : '')}${((index.type || '').toLowerCase() === 'fulltext' ? 'FULLTEXT ' : '')}INDEX \`${indexName}\` (${Object.keys(index.columns).map(c => `\`${c}\` ${index.columns[c]}`)});`);
            }

            // drop index
            for (const indexName of table.deletedIndexNames) {
                query.push(`ALTER TABLE`);
                query.push(`    \`${tableName}\``);
                query.push(`DROP INDEX \`${indexName}\`;`);
            }
        }
        // drop tables
        for (const tableName of diff.deletedTableNames) {
            query.push(`SET FOREIGN_KEY_CHECKS = 0;`);
            query.push(`DROP TABLE \`${tableName}\`;`);
            query.push(`SET FOREIGN_KEY_CHECKS = 1;`);
        }

        const execQuery = dropFkQuery.join('\n') + '\n' + query.join('\n') + '\n' +  createFkQuery.join('\n');
        if (query.length > 0 || createFkQuery.length > 0 || dropFkQuery.length > 0) {
            if (!queryOnly) {
                await this.connection.query('BEGIN;');
                await this.connection.query(execQuery);
                await this.connection.query('COMMIT;');
            }
            return execQuery;

        } else {
            return null;
        }

    }

    private static createAlterForeignKey(
        name: string, 
        table: string, 
        column: string, 
        targetTable: string, 
        targetColumn: string, 
        onupdate: string, 
        ondelete: string) {
        if (onupdate) {
            onupdate = ` ON UPDATE ${onupdate} `;
        }

        if (ondelete) {
            ondelete = ` ON DELETE ${ondelete} `;
        }


      /*  // check index
        let hasIndex = false;
        //const hasIndex = tables[foreignTable].indexes.Any(i => i.Value.Columns.All(c => c.Key == foreignColumn));
        if (!hasIndex) {
            query += `ALTER TABLE \`${foreignTable}\` ADD INDEX \`fk_${foreignTable}_${foreignColumn}_index\` (\`${foreignColumn}\` ASC);\n`;
        }
        //hasIndex = tables[table].Indexes.Any(i => i.Value.Columns.All(c => c.Key == column));
        if (!hasIndex) {
            query += `ALTER TABLE \`${table}\` ADD INDEX \`fk_${table}_${column}_index\` (\`${column}\` ASC);\n`;
        }
*/

        return `
            ALTER TABLE 
                \`${table}\` 
            ADD CONSTRAINT 
                \`${name}\` 
            FOREIGN KEY 
            (
                \`${column}\`
            ) 
            REFERENCES 
                \`${targetTable}\`(\`${targetColumn}\`)${onupdate || ''}${ondelete || ''};\n`;

    }
}