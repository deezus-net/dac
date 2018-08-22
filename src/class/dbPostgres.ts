import { Client } from 'pg';
import {Db} from '../interfaces/db';
import {DbHost} from '../interfaces/dbHost';
import {DbInterface} from '../interfaces/dbInterface';
import {DbTable} from '../interfaces/dbTable';
import {ColumnType} from './columnType';
import {DbColumn} from '../interfaces/dbColumn';

export class DbPostgres implements DbInterface {
    private client: Client;
    private dbHost;

    constructor(dbHost: DbHost) {
        try {
            this.dbHost = dbHost;
            this.client = new Client({
                user: dbHost.user,
                host: dbHost.host,
                database: dbHost.database,
                password: dbHost.password
            });
        } catch (e) {
            console.log(e);
        }
    }

    /**
     *
     * @param {Db} db
     * @returns {Promise<boolean>}
     */
    public async create(db: Db) {
        const query = this.createQuery(db.tables);
        await this.client.connect();
        await this.client.query('BEGIN');
        await this.client.query(query);
        await this.client.query('COMMIT');
        await this.client.end();
        return true;
    }

    public async diff(db: Db) {

    }

    public async extract() {
        const tables: { [key: string]: DbTable } = {};
        await this.client.connect();
        const data = await this.client.query('SELECT relname FROM "pg_stat_user_tables"');
        for (const row of data.rows) {
            tables[row['relname']] = {
                columns: {},
                indexes: {}
            };
        }

        for (const tableName in tables) {

            // get column list
            let query = `
                    SELECT 
                        column_name, 
                        data_type, 
                        is_nullable, 
                        character_maximum_length, 
                        is_identity, 
                        column_default 
                    FROM 
                        information_schema.columns 
                    WHERE 
                        table_name = $1`;
            const tableData = await this.client.query(query, [tableName]);

            for (const row of tableData.rows) {
                const id = /nextval/.test(row['column_default']);
                let type = id ? 'serial' : row['data_type'];
                const length = row['character_maximum_length'] ? parseInt(row['character_maximum_length'], 10) : 0;

                type = ColumnType.postgreSql[type] ? ColumnType.postgreSql[type] : type;


                const column: DbColumn = {
                    type: type,
                    id: id,
                    length: length,
                    notNull: row['is_nullable'] === 'NO'
                };
                if (!row['column_default'] && !id) {
                    column.default = row['column_default'];
                }
                tables[tableName].columns[row['column_name']] = column;
            }

            // get primary key list
            query = `
                SELECT
                    ccu.column_name 
                FROM
                    information_schema.table_constraints tc
                INNER JOIN
                    information_schema.constraint_column_usage ccu
                ON
                    tc.table_catalog = ccu.table_catalog
                AND
                    tc.table_schema = ccu.table_schema
                AND
                    tc.table_name = ccu.table_name
                AND
                    tc.constraint_name = ccu.constraint_name
                WHERE
                    tc.table_catalog = $1
                AND
                    tc.table_name = $2
                AND
                    tc.constraint_type = 'PRIMARY KEY'`;
            const pkData = await this.client.query(query, [this.dbHost.database, tableName]);

            for (const row of pkData.rows) {
                if (tables[tableName].columns[row['column_name']]) {
                    tables[tableName].columns[row['column_name']].pk = true;
                }
            }


            // get index list
            query = `
                SELECT 
                    indexname, 
                    indexdef 
                FROM 
                    pg_indexes 
                WHERE tablename = $1`;
            const indexData = await this.client.query(query, [tableName]);

            for (const row of indexData.rows) {
                const indexdef = row['indexdef'];
                const indexName = row['indexname'];
                if (!tables[tableName].indexes[indexName]) {
                    tables[tableName].indexes[indexName] = {
                        unique: indexdef.indexOf('UNIQUE INDEX') !== -1,
                        columns: {}
                    };
                }

                const m = (indexdef.match(/\(.*\)/) || [])[0];
                if (!m) {
                    continue;
                }
                for (const col of m.replace('(', '').replace(')', '').split(',')) {
                    const tmp = col.split(' ');
                    if (tables[tableName].columns[tmp[0]]) {
                        tables[tableName].indexes[indexName].columns[tmp[0]] = tmp.Length > 1 ? tmp[1] : 'ASC';
                    }
                }
            }

            // remove primarykey index
            const pkColumns: string[] = [];
            for (const columnName in tables[tableName].columns) {
                if (tables[tableName].columns[columnName].pk) {
                    pkColumns.push(columnName);
                }
            }
            
            for (const indexName in tables[tableName].indexes){
                const columns = [];
                for (const columnName in tables[tableName].indexes[indexName].columns) {
                    columns.push(columnName);
                }
                if (columns.toString() === pkColumns.toString()) {
                    delete tables[tableName].indexes[indexName];
                }
            } 

            // get check list
            query = `
                SELECT
                    co.consrc
                FROM
                    pg_constraint AS co 
                INNER JOIN
                    pg_class AS cl
                ON
                    co.conrelid = cl.oid
                WHERE
                    co.contype = 'c'
                AND
                    cl.relname = $1`;
            const checkData = await this.client.query(query, [tableName]);
            for (const row of checkData.rows) {
                const consrc = (row['consrc'].match(/\((.*)\)/) || [])[1] || row['consrc'];


                for (const colName in tables[tableName].columns) {
                    if (consrc.indexOf(colName) !== -1) {
                        tables[tableName].columns[colName].check = consrc;
                    }
                }
            }


            // get foreign key list
            query = `
                SELECT
                    tc.constraint_name,
                    tc.table_name,
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name,
                    pc.confupdtype,
                    pc.confdeltype
                FROM
                    information_schema.table_constraints AS tc
                INNER JOIN
                    information_schema.key_column_usage AS kcu
                ON
                    tc.constraint_name = kcu.constraint_name
                INNER JOIN
                    information_schema.constraint_column_usage AS ccu
                ON
                    ccu.constraint_name = tc.constraint_name
                INNER JOIN
                    pg_constraint AS pc
                ON
                    tc.constraint_name = pc.conname
                WHERE
                    tc.constraint_type = 'FOREIGN KEY'
                AND
                    tc.table_name = $1`;
            const fkData = await this.client.query(query, [tableName]);
            const conf = {
                a: '',
                r: 'RESTRICT',
                c: 'CASCADE',
                n: 'SET NULL',
                d: 'SET DEFAULT'
            };
            for (const row of fkData.rows) {

                const columnName = row['column_name'];
                if (!tables[tableName].columns[columnName]) {
                    continue;
                }
                const update = conf[row['confupdtype']] || '';
                const del = conf[row['confdeltype']] || '';

                const key = row['foreign_table_name'] + '.' + row['foreign_column_name'];
                tables[tableName].columns[columnName].foreginKey = {};
                tables[tableName].columns[columnName].foreginKey[key] = {
                    name: row['constraint_name'],
                    update: update,
                    delete: del
                };
            }
        }
        
        await this.client.end();
        console.log(tables);
        
        return { tables: tables };
    }

    /**
     * 
     * @param {Db} db
     * @returns {any}
     */
    public query(db: Db) {
        return this.createQuery(db.tables);
    }
    
    private createQuery(tables: {[key: string]: DbTable}) {
        const query: string[] = [];
        for (const tableName in tables) {
            query.push(`CREATE TABLE ${tableName}(`);

            const columnQuery: string[] = [];
            const pk: string[] = [];
            for (const columnName in tables[tableName].columns) {
                const column = tables[tableName].columns[columnName];
                if (column.id) {
                    column.notNull = true;
                    column.type = 'serial';
                }

                const notNull = column.notNull ? ' NOT NULL ' : '';
                const check = column.check ? ` CHECK(${column.check}) ` : '';
                const def = column.default ? ` DEFAULT ${column.default} ` : '';
                const type = column.type + (column.length > 0 ? `(${column.length})` : '');

                columnQuery.push(`    ${columnName} ${type}${notNull}${check}${def}`);
                if (column.pk || column.id) {
                    pk.push(columnName);
                }
                console.log(column);
            }
            query.push(columnQuery.join(',\n') + (pk.length > 0 ? ',' : ''));

            if (pk.length > 0) {
                query.push(`    CONSTRAINT PK_${tableName} PRIMARY KEY `);
                query.push('    (');
                const pkQuery: string[] = [];
                pk.forEach(p => {
                    pkQuery.push(`        ${p}`);
                });
                query.push(pkQuery.join('\n'));
                query.push('    )');
            }
            query.push(');');

            for (const indexName in tables[tableName].indexes) {
                const index = tables[tableName].indexes[indexName];
                const indexColumns = [];
                for (const c in index.columns) {
                    indexColumns.push(c);
                }
                query.push(`CREATE ${(index.unique ? 'UNIQUE ' : '')}INDEX ${indexName} ON ${tableName}(`);
                query.push('    ' + indexColumns.join(','));
                query.push(');');
            }

        }
        return query.join('\n');

    }

    /**
     * 
     * @param {Db} db
     * @returns {Promise<boolean>}
     */
    public async reCreate(db: Db) {
        const query = this.createQuery(db.tables);
        await this.client.connect();
        await this.client.query('BEGIN');
        
        const tables = {};
        const data = await this.client.query('SELECT relname FROM "pg_stat_user_tables"');
        for (const row of data.rows) {
            await this.client.query(`DROP TABLE "${row['relname']}" CASCADE`);
        }
        await this.client.query(query);
        await this.client.end();
        
        return true;
    }
    
    public async update(db: Db) {

    }

    /**
     * execute query
     * @param {string} query
     * @returns {Promise<QueryResult>}
     */
    public async exec(query: string) {
        await this.client.connect();
        const res = await this.client.query(query);
        await this.client.end();
        return res;
    }
}
