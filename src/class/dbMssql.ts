import {Connection, Request} from 'tedious';
import {DbHost} from '../interfaces/dbHost';
import {DbInterface} from '../interfaces/dbInterface';
import {promises} from 'fs';
import {Db} from '../interfaces/db';
import {DbTable} from '../interfaces/dbTable';
import objectContaining = jasmine.objectContaining;


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


    public async exec(query: string) {
        const res = await new Promise<any[]>(resolve => {
            const request = new Request(query, err => {
                console.log(err);
                resolve(rows);
            });
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