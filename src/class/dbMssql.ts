import {Connection, Request, TediousType, TYPES} from 'tedious';
import {DbHost} from '../interfaces/dbHost';
import {DbInterface} from '../interfaces/dbInterface';
import {promises} from 'fs';
import {Db} from '../interfaces/db';
import {DbTable} from '../interfaces/dbTable';
import objectContaining = jasmine.objectContaining;
import {Key} from 'readline';
import {DbColumn} from '../interfaces/dbColumn';
import {CommanderStatic} from 'commander';
import {constants} from 'http2';
import NGHTTP2_FLAG_PRIORITY = module


export class DbMssql implements DbInterface {

    private connection: Connection;

    constructor(private dbHost: DbHost) {

    }

    public async connect() {
        this.connection = await new Promise<Connection>(resolve => {
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
                    resolve(connection);
                }
            });

        });
    }

    public async end() {
        await new Promise(resolve => {
            this.connection.close();
            resolve();
        });
    }

    public query(db: Db) {
        return this.createQuery(db.tables);
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
                if (column.foreignKey) {
                    for (const fkName of Object.keys(column.foreignKey)) {
                        const foreignKey = column.foreignKey[fkName];
                        fkQuery.push(DbMssql.createAlterForeignKey(tableName, columnName, fkName, foreignKey.update, foreignKey.delete));
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

    public async create(db: Db) {
        const query = this.createQuery(db.tables);
        await this.beginTransaction();
        await this.exec(query);
        await this.commit();
        return true;
    }


    /**
     * 
     * @param {Db} db
     * @returns {Promise<boolean>}
     */
    public async reCreate(db: Db) {
        const createQuery = this.createQuery(db.tables);
        await this.beginTransaction();

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
            query = `
                    ALTER TABLE [${fkName}] DROP CONSTRAINT [${foreignKeys[fkName]}]
            `;
            await this.exec(query);
        }


        // drop exist tables
        for (const tableName of tables) {
            query = `DROP TABLE [${tableName}]`;
            await this.exec(query);
        }
        await this.exec(createQuery);
        await this.commit();

        return true;
    }


    public async exec(query: string, parameters: any = null) {
        const res = await new Promise<any[]>(resolve => {
            const request = new Request(query, err => {
                console.log(err);
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
    
    public async extract() {
        const tables: { [key: string]: DbTable } = {};

        const columns: { [key: string]: { [key: string]: DbColumn } } = {};
        const indexes: { [key: string]: { [key: string]: { [key: string]: DbColumn } } } = {};
        const pk: { [key: string]: string[] } = {};

        let query = `
                SELECT
                    t.name AS table_name,
                    i.name AS index_name,
                    col.name AS column_name,
                    i.is_primary_key,
                    c.is_descending_key 
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
                ORDER BY t.name, i.name, col.name
        `;
        for (const row of await this.exec(query)) {
            const tableName = row['table_name'];

            if (!pk[tableName]) {
                pk[tableName] = [];
            }
            if (!indexes[tableName]) {
                indexes[tableName] = {};
            }
            if (parseInt(row['is_primary_key'], 10) === 1) {
                pk[tableName].push(row['column_name']);

            } else {
                const indexName = row['index_name'];
                if (!indexes[tableName][indexName]) {
                    indexes[tableName][indexName] = {};
                }
                indexes[tableName][indexName][row['column_name']] = row['is_descending_key'] ? 'DESC' : 'ASC';
            }
        }
        
        query = `
            SELECT
                t.name AS table_name,
                c.name AS column_name,
                type.name AS type,
                c.max_length,
                c.is_nullable 
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
                    length = 0;
                    break;
            }

            columns[tableName][row['column_name']] = {
                type: row['type'],
                length: length,
                notNull: parseInt(row['is_nullable'], 10) !== 1,
                pk: !!(pk[tableName] && pk[tableName][row['column_name']])
            };
        }
        for (const tableName of Object.keys(columns)) {
            tables[tableName] = {
                columns: columns[tableName],
                indexes: {}
            };
            for (const indexName of Object.keys(indexes[tableName])) {
                tables[tableName].indexes[indexName] = {columns: {}, unique: false};
                for (const indexColumn of Object.keys(indexes[tableName][indexName])) {
                    tables[tableName].indexes[indexName].columns[indexColumn] = indexes[tableName][indexName][indexColumn];
                }
            }
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
                    if (!tables[tableName].columns[row['column_name']].foreignKey) {
                        tables[tableName].columns[row['column_name']].foreignKey = {};
                    }

                    const fkName = row['foreign_table'] + '.' + row['foreign_column'];
                    tables[tableName].columns[row['column_name']].foreignKey[fkName] = {
                        name: row['fk_name'],
                        update: row['onupdate'],
                        delete: row['ondelete']
                    };

                }
            }
        }

        return {tables: tables};
    }
    
    private async beginTransaction() {
        return new Promise(resolve => {
            this.connection.beginTransaction(err => {
                resolve();
            });
        });
    }

    private async commit() {
        return new Promise(resolve => {
            this.connection.commitTransaction(err => {
                resolve();
            });
        });
    }

    /*
        diff: (db: Db) => void;
        extract: () => Promise<Db>;
        query: (db: Db) => string;
        reCreate: (db: Db) => Promise<boolean>;
        update: (db: Db) => Promise<boolean>;*/

    /**
     * 
     * @param {string} table
     * @param {string} column
     * @param {string} fk
     * @param {string} onupdate
     * @param {string} ondelete
     * @returns {string}
     */
    private static createAlterForeignKey(table: string, column: string, fk: string, onupdate: string, ondelete: string) {
        const foreginTable = fk.split('.')[0];
        const foreginColumn = fk.split('.')[1];

        if (onupdate) {
            onupdate = ` ON UPDATE ${onupdate} `;
        }

        if (ondelete) {
            ondelete = ` ON DELETE ${ondelete} `;
        }

        return `ALTER TABLE [dbo].[${table}] ADD CONSTRAINT [FK_${table}_${column}_${foreginTable}_${foreginColumn}] FOREIGN KEY ([${column}]) REFERENCES [dbo].[${foreginTable}]([${foreginColumn}])${onupdate}${ondelete};`;
    }

}