import {Connection, Request, TYPES} from 'tedious';
import {Db} from '../interfaces/db';
import {DbColumn} from '../interfaces/dbColumn';
import {DbHost} from '../interfaces/dbHost';
import {DbIndex} from '../interfaces/dbIndex';
import {DbInterface} from '../interfaces/dbInterface';
import {DbTable} from '../interfaces/dbTable';
import {checkDbDiff, distinct, trimDbProperties} from './utility';

export class DbMssql implements DbInterface {

    private connection: Connection;

    constructor(private dbHost: DbHost) {

    }

    /**
     *
     * @returns {Promise<void>}
     */
    public async connect() {
        return await new Promise<boolean>(resolve => {
            const connection = new Connection({
                userName: this.dbHost.user,
                password: this.dbHost.password,
                server: this.dbHost.host,
                options: {
                    database: this.dbHost.database,
                    encrypt: false
                }
            });

            connection.on('connect', err => {
                if (!err) {
                    this.connection = connection;
                    resolve(true);
                } else {
                    resolve(false);
                }
            });

        });
    }

    /**
     *
     * @returns {Promise<void>}
     */
    public async close() {
        return await new Promise<boolean>(resolve => {
            this.connection.close();
            resolve(true);
        });
    }

    /**
     *
     * @param {Db} db
     * @returns {string}
     */
    public query(db: Db) {
        return this.createQuery(db.tables);
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
            await this.beginTransaction();
            await this.exec(query);
            await this.commit();
        }
        return query;
    }

    /**
     *
     * @param {Db} db
     * @returns {Promise<boolean>}
     */
    public async reCreate(db: Db, queryOnly: boolean) {
        const createQuery = this.createQuery(db.tables);
        const queries = [];
        

        // get table and foreign key list
        const tables: string[] = [];
        const foreignKeys: { [key: string]: string } = {};

        let query = `
                SELECT
                    t.name AS table_name,
                    fk.name AS fk_name
                FROM
                    sys.tables AS t
                LEFT OUTER JOIN
                    sys.foreign_keys AS fk
                ON
                    fk.parent_object_id = t.object_id
                `;
        for (const row of await this.exec(query)) {

            tables.push(row['table_name']);
            if (row['fk_name']) {
                foreignKeys[row['fk_name']] = row['table_name'];
            }
        }

        // drop exist foreign keys
        for (const fkName of Object.keys(foreignKeys)) {
            queries.push(`ALTER TABLE`);
            queries.push(`    [${fkName}]`);
            queries.push(`DROP CONSTRAINT`);
            queries.push(`    [${foreignKeys[fkName]}];`)
        }

        // drop exist tables
        for (const tableName of tables) {
            queries.push(`DROP TABLE`);
            queries.push(`    [${tableName}];`);
        }
        
        queries.push(this.createQuery(db.tables));
        
        const execQuery = queries.join('\n');
        
        if (!queryOnly) {
            await this.beginTransaction();
            await this.exec(execQuery);
            await this.commit();
        }
        return execQuery;
    }

    /**
     *
     * @param {string} query
     * @param parameters
     * @returns {Promise<any>}
     */
    public async exec(query: string, parameters: any = null) {
        const res = await new Promise<any[]>(resolve => {
            const request = new Request(query, err => {
                if (err) {
                    console.log(err);
                }
                resolve(rows);
            });

            if (parameters !== null) {
                for (const name of Object.keys(parameters)) {
                    request.addParameter(name, TYPES.NVarChar, parameters[name]);
                }
            }

            const rows = [];
            request.on('row', columns => {
                const row = {};
                columns.forEach(column => {
                    row[column.metadata.colName] = column.value;
                });
                rows.push(row);
            });
            this.connection.execSql(request);
        });
        return res;

    }

    /**
     *
     * @returns {Promise<{tables: {[p: string]: DbTable}}>}
     */
    public async extract() {
        const tables: { [key: string]: DbTable } = {};

        const columns: { [key: string]: { [key: string]: DbColumn } } = {};
        const indexes: { [key: string]: { [key: string]: DbIndex } } = {};
        const pk: { [key: string]: string[] } = {};

        let query = `
                SELECT
                    t.name AS table_name,
                    i.name AS index_name,
                    col.name AS column_name,
                    i.is_primary_key,
                    c.is_descending_key,
                    i.is_unique
                FROM
                    sys.indexes as i 
                INNER JOIN
                    sys.tables as t
                ON
                    i.object_id = t.object_id 
                INNER JOIN
                    sys.index_columns AS c
                ON
                    i.object_id = c.object_id 
                AND
                    i.index_id = c.index_id
                INNER JOIN
                    sys.columns as col
                ON
                    c.object_id = col.object_id
                AND
                    c.column_id = col.column_id
                ORDER BY t.name, i.name, c.key_ordinal
        `;
        for (const row of await this.exec(query)) {
            const tableName = row['table_name'];

            if (!pk[tableName]) {
                pk[tableName] = [];
            }
            if (!indexes[tableName]) {
                indexes[tableName] = {};
            }

            if (row['is_primary_key']) {
                pk[tableName].push(row['column_name']);

            } else {
                const indexName = row['index_name'];
                if (!indexes[tableName][indexName]) {
                    indexes[tableName][indexName] = {columns: {}, unique: row['is_unique']};
                }
                indexes[tableName][indexName].columns[row['column_name']] = row['is_descending_key'] ? 'desc' : 'asc';
            }
        }
        console.log(indexes);
        query = `
            SELECT
                t.name AS table_name,
                c.name AS column_name,
                type.name AS type,
                c.max_length,
                c.is_nullable ,
                c.is_identity
            FROM
                sys.tables AS t 
            INNER JOIN
                sys.columns AS c 
            ON
                c.object_id = t.object_id 
            INNER JOIN 
                sys.types as type 
            ON 
                c.system_type_id = type.system_type_id 
            AND
                c.user_type_id = type.user_type_id 
            ORDER BY t.name, c.object_id
        `;

        // get column list
        for (const row of await this.exec(query)) {
            const tableName = row['table_name'];
            if (!columns[tableName]) {
                columns[tableName] = {};
            }

            let length = parseInt(row['max_length'], 10);
            switch (row['type']) {
                case 'nvarchar':
                case 'nchar':
                    length /= 2;
                    break;
                case 'int':
                case 'datetime':
                    length = 0;
                    break;
            }

            columns[tableName][row['column_name']] = {
                id: row['is_identity'],
                type: row['type'],
                length: length,
                notNull: !row['is_nullable'],
                pk: !!(pk[tableName] && pk[tableName][row['column_name']])
            };
        }
        for (const tableName of Object.keys(columns)) {
            tables[tableName] = {
                columns: columns[tableName],
                indexes: indexes[tableName]
            };
        }

        for (const tableName of Object.keys(tables)) {
            // get check list
            query = `
                SELECT
                    t.name AS table_name, 
                    col.name AS column_name,
                    ch.definition 
                FROM
                    sys.check_constraints AS ch 
                INNER JOIN
                    sys.tables AS t 
                ON
                    ch.parent_object_id = t.object_id 
                INNER JOIN
                    sys.columns AS col 
                ON
                    ch.parent_column_id = col.column_id 
                AND
                    t.object_id = col.object_id 
                WHERE
                    t.name = @table
            `;
            for (const row of await this.exec(query, {table: tableName})) {

                const columnName = row['column_name'];
                const definition = (row['definition'].match(/\((.*)\)/) || [])[1] || row['definition'];

                if (tables[tableName].columns[columnName]) {
                    tables[tableName].columns[columnName].check = definition;
                }
            }

            // get default list
            query = `
                SELECT
                    t.name AS table_name, 
                    col.name AS column_name,
                    d.definition 
                FROM
                    sys.default_constraints AS d 
                INNER JOIN
                    sys.tables AS t 
                ON
                    d.parent_object_id = t.object_id 
                INNER JOIN
                    sys.columns AS col 
                ON
                    d.parent_column_id = col.column_id 
                AND
                    t.object_id = col.object_id 
                WHERE
                    t.name = @table
            `;
            for (const row of await this.exec(query, {table: tableName})) {

                const columnName = row['column_name'];
                const definition = (row['definition'].match(/\((.*)\)/) || [])[1] || row['definition'];

                if (tables[tableName].columns[columnName]) {
                    tables[tableName].columns[columnName].default = definition;
                }
            }

            // get foreign key list
            query = `
                SELECT
                    fk.name AS fk_name,
                    t1.name AS table_name,
                    c1.name AS column_name,
                    t2.name AS foreign_table,
                    c2.name AS foreign_column,
                    fk.update_referential_action_desc AS onupdate,
                    fk.delete_referential_action_desc AS ondelete 
                FROM
                    sys.foreign_key_columns AS fkc 
                INNER JOIN
                    sys.tables AS t1 
                ON
                    fkc.parent_object_id = t1.object_id 
                INNER JOIN
                    sys.columns AS c1 
                ON
                    c1.object_id = t1.object_id 
                AND
                    fkc.parent_column_id = c1.column_id 
                INNER JOIN
                    sys.tables AS t2 
                ON
                    fkc.referenced_object_id = t2.object_id 
                INNER JOIN
                    sys.columns AS c2 
                ON
                    c2.object_id = t2.object_id 
                AND
                    fkc.referenced_column_id = c2.column_id 
                INNER JOIN
                    sys.foreign_keys AS fk 
                ON
                    fkc.constraint_object_id = fk.object_id 
                WHERE
                    t1.name = @table
            `;
            for (const row of await this.exec(query, {table: tableName})) {

                if (tables[tableName].columns[row['column_name']]) {
                    if (!tables[tableName].columns[row['column_name']].fk) {
                        tables[tableName].columns[row['column_name']].fk = {};
                    }

                    tables[tableName].columns[row['column_name']].fk[row['fk_name']] = {
                        table: row['foreign_table'],
                        column: row['foreign_column'],
                        update: row['onupdate'],
                        delete: row['ondelete']
                    };

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
     * @returns {Promise<void>}
     */
    public async diff(db: Db) {
        const orgDb = await this.extract();
        return checkDbDiff(orgDb, db);
    }

    /**
     *
     * @param {Db} db
     * @param queryOnly
     * @returns {Promise<boolean>}
     */
    public async update(db: Db, queryOnly: boolean) {
        const diff = await this.diff(db);
        const query = [];
        const createFkQuery = [];
        const dropFkQuery = [];


        // add tables
        if (Object.keys(diff.addedTables).length > 0) {
            query.push(this.createQuery(diff.addedTables));
        }

        for (const tableName of Object.keys(diff.modifiedTables)) {
            const table = diff.modifiedTables[tableName];
            const orgTable = diff.currentDb.tables[tableName];

            // add columns
            for (const columnName of Object.keys(table.addedColumns)) {
                const column = table.addedColumns[columnName];
                let type = column.id ? 'int' : column.type;
                if (column.length > 0) {
                    type += `(${column.length})`;
                }
                query.push(`ALTER TABLE`);
                query.push(`    [${tableName}]`);
                query.push(`ADD`);
                query.push(`    [${columnName}] ${type}${(column.id ? ' IDENTITY' : '')}${column.notNull ? ' NOT NULL' : ''};`);

                for (const fkName of Object.keys(column.fk || {})) {
                    const fk = column.fk[fkName];
                    createFkQuery.push(DbMssql.createAlterForeignKey(fkName, tableName, columnName, fk.table, fk.column, fk.update, fk.delete));
                }
            }

            // modify columns
            for (const columnName of Object.keys(table.modifiedColumns)) {
                const [orgColumn, newColumn] = table.modifiedColumns[columnName];

                // if change execute alter
                for (const indexName of Object.keys(orgTable.indexes || {}).filter(i => orgTable.indexes[i].columns[columnName])) {
                    query.push(`DROP INDEX`);
                    query.push(`    [${indexName}] ON [${tableName}];`);
                }

                let type = newColumn.id ? 'int' : newColumn.type;
                if (newColumn.length > 0) {
                    type += `(${newColumn.length})`;
                }

                query.push(`ALTER TABLE`);
                query.push(`    [${tableName}]`);
                query.push(`ALTER COLUMN`);
                query.push(`    [${columnName}] ${type}${newColumn.id ? ' IDENTITY' : ''}${newColumn.notNull ? ' NOT NULL' : ''};`);

                // foreign key
                const orgFkName = Object.keys(orgColumn.fk || {});
                const newFkName = Object.keys(newColumn.fk || {});

                for (const fkName of distinct(orgFkName, newFkName)) {
                    if (orgFkName.indexOf(fkName) === -1) {
                        const fk = newColumn.fk[fkName];
                        createFkQuery.push(DbMssql.createAlterForeignKey(fkName, tableName, columnName, fk.table, fk.column, fk.update, fk.delete));
                        continue;
                    }

                    if (newFkName.indexOf(fkName) === -1) {

                        dropFkQuery.push(`ALTER TABLE`);
                        dropFkQuery.push(`    [dbo].[${tableName}]`);
                        dropFkQuery.push(`DROP CONSTRAINT [${fkName}];`);
                        continue;
                    }

                    if ((orgColumn.fk[fkName].update !== newColumn.fk[fkName].update) ||
                        (orgColumn.fk[fkName].delete !== newColumn.fk[fkName].delete) ||
                        (orgColumn.fk[fkName].table !== newColumn.fk[fkName].table) ||
                        (orgColumn.fk[fkName].column !== newColumn.fk[fkName].column)) {

                        dropFkQuery.push(`ALTER TABLE`);
                        dropFkQuery.push(`    [dbo].[${tableName}]`);
                        dropFkQuery.push(`DROP CONSTRAINT [${fkName}];`);

                        const fk = newColumn.fk[fkName];
                        createFkQuery.push(DbMssql.createAlterForeignKey(fkName, tableName, columnName, fk.table, fk.column, fk.update, fk.delete));
                    }
                }

            }

            // drop columns
            for (const columnName of table.deletedColumnName) {
                query.push(`ALTER TABLE`);
                query.push(`    [${tableName}]`);
                query.push(`DROP COLUMN [${columnName}];`);

            }

            // create index
            for (const indexName of Object.keys(table.addedIndexes)) {
                const index = table.addedIndexes[indexName];

                query.push(`CREATE`);
                query.push(`    ${index.unique ? 'UNIQUE ' : ''}INDEX [${indexName}]`);
                query.push(`ON`);
                query.push(`    [dbo].[${tableName}](${Object.keys(index.columns).map(c => `[${c}] ${index.columns[c]}`).join(',')});`);
            }

            // modify index
            for (const indexName of Object.keys(table.modifiedIndexes)) {
                const [, index] = table.modifiedIndexes[indexName];

                query.push(`DROP INDEX`);
                query.push(`    [${tableName}].[${indexName}];`);
                query.push(`CREATE`);
                query.push(`    ${index.unique ? 'UNIQUE ' : ''}INDEX [${indexName}]`);
                query.push(`ON`);
                query.push(`    [dbo].[${tableName}](${Object.keys(index.columns).map(c => `[${c}] ${index.columns[c]}`).join(',')});`);
            }

            // drop index
            for (const indexName of table.deletedIndexNames) {
                query.push(`DROP INDEX`);
                query.push(`    [${tableName}].[${indexName}];`);
            }

        }

        // drop tables
        for (const tableName of diff.deletedTableNames) {
            query.push(`DROP TABLE [dbo].[${tableName}];`);
        }

        const execQuery = dropFkQuery.join('\n') + '\n' + query.join('\n') + '\n' + createFkQuery.join('\n');
        console.log(execQuery);

        if (query.length > 0 || createFkQuery.length > 0 || dropFkQuery.length > 0) {
            if (queryOnly) {
                await this.beginTransaction();
                await this.exec(execQuery);
                await this.commit();
            }

        } else {
            console.log('nothing is changed');
        }
        return execQuery;

    }


    /**
     *
     * @returns {Promise}
     */
    private async beginTransaction() {
        return new Promise(resolve => {
            this.connection.beginTransaction(err => {
                resolve();
            });
        });
    }

    /**
     *
     * @returns {Promise}
     */
    private async commit() {
        return new Promise(resolve => {
            this.connection.commitTransaction(err => {
                resolve();
            });
        });
    }

    /**
     *
     * @param {{[p: string]: DbTable}} tables
     * @returns {string}
     */
    private createQuery(tables: { [key: string]: DbTable }) {

        const query: string[] = [`USE [${this.dbHost.database}];`];
        const fkQuery: string[] = [];
        for (const tableName of Object.keys(tables)) {
            const table = tables[tableName];

            query.push(`CREATE TABLE [dbo].[${tableName}](`);
            const columnQuery: string[] = [];
            const pk: string[] = [];

            for (const columnName of Object.keys(table.columns)) {
                const column = table.columns[columnName];
                if (column.id) {
                    column.notNull = true;
                    column.type = 'int';
                }

                const identity = column.id ? ' IDENTITY ' : '';
                const notNull = column.notNull ? ' NOT NULL ' : '';
                const check = column.check ? ` CHECK(${column.check}) ` : '';
                const def = column.default ? ` DEFAULT ${column.default} ` : '';
                const type = column.type + (column.length > 0 ? `(${column.length})` : '');

                columnQuery.push(`    [${columnName}] ${type}${identity}${notNull}${def}${check}`);
                if (column.pk || column.id) {
                    pk.push(columnName);
                }

            }
            query.push(columnQuery.join(',\n') + (pk.length > 0 ? ',' : ''));

            if (pk.length > 0) {
                query.push(`    CONSTRAINT [PK_${tableName}] PRIMARY KEY CLUSTERED`);
                query.push('    (');
                const pkQuery: string[] = [];
                pk.forEach(p => {
                    pkQuery.push(`        [${p}]`);
                });
                query.push(pkQuery.join(',\n'));
                query.push('    )');
            }

            // foreign key
            for (const columnName of Object.keys(table.columns)) {
                const column = table.columns[columnName];
                if (column.fk) {
                    for (const fkName of Object.keys(column.fk)) {
                        const foreignKey = column.fk[fkName];
                        fkQuery.push(DbMssql.createAlterForeignKey(fkName, tableName, columnName, foreignKey.table, foreignKey.column, foreignKey.update, foreignKey.delete));
                    }
                }
            }

            query.push(');');

            let num = 1;
            for (const indexName of Object.keys(table.indexes)) {
                const index = table.indexes[indexName];
                const name = indexName ? indexName : `INDEX_${tableName}_${num++}`;
                query.push(`CREATE ${(index.unique ? 'UNIQUE ' : '')}INDEX [${name}] ON [dbo].[${tableName}](`);
                query.push(`    ${Object.keys(index.columns).map(c => `[${c}] ${index.columns[c]}`).join(',')}`);
                query.push(');');
            }

        }

        return query.join('\n') + '\n' + fkQuery.join('\n');
    }

    /**
     *
     * @param {string} name
     * @param {string} table
     * @param {string} column
     * @param {string} targetTable
     * @param {string} targetColumn
     * @param {string} onupdate
     * @param {string} ondelete
     * @returns {string}
     */
    private static createAlterForeignKey(name: string, table: string, column: string, targetTable: string, targetColumn: string, onupdate: string, ondelete: string) {


        if (onupdate) {
            onupdate = ` ON UPDATE ${onupdate} `;
        }

        if (ondelete) {
            ondelete = ` ON DELETE ${ondelete} `;
        }

        const query = [];

        query.push(`ALTER TABLE`);
        query.push(`    [dbo].[${table}]`);
        query.push(`ADD CONSTRAINT`);
        query.push(`    [${name}]`);
        query.push(`FOREIGN KEY`);
        query.push(`(`);
        query.push(`    [${column}]`);
        query.push(`)`);
        query.push(`REFERENCES [dbo].[${targetTable}]([${targetColumn}])${onupdate || ''}${ondelete || ''};`);

        return query.join('\n');
    }

}