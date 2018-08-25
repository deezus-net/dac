import * as mysql from 'promise-mysql';
import {Db} from '../interfaces/db';
import {DbHost} from '../interfaces/dbHost';
import {DbInterface} from '../interfaces/dbInterface';
import {DbTable} from '../interfaces/dbTable';
import * as util from 'util';
import ObjectContaining = jasmine.ObjectContaining;

export class DbMysql implements DbInterface {
    
    private connection: mysql.Connection;
    private dbHost: DbHost;
    
    constructor(dbHost: DbHost) {
        this.dbHost = dbHost;
    }
    
    public async connect(){
        this.connection = await mysql.createConnection({
            host: this.dbHost.host,
            user: this.dbHost.user,
            password: this.dbHost.password,
            database: this.dbHost.database,
            multipleStatements: true,
            
        });
    }

    public async end(){
        await this.connection.end();
    }

    public async create(db: Db) {
        const query = this.createQuery(db.tables);
        await this.connection.query(query);
        return true;
    }

    public diff(db: Db) {

    }

    public extract() {
        return null;
    }
    
    public query(db: Db) {
        return this.createQuery(db.tables);
    }


    private createQuery(tables: { [key: string]: DbTable }) {
        const query: string[] = [];
        
        for (const tableName of  Object.keys(tables)) {
            const table = tables[tableName];
            
            query.push(`CREATE TABLE \`${tableName}\` (`);
            const columnQuery: string[] = [];
            const pk: string[] = [];

            for (const columnName of Object.keys(table.columns)) {

                const column = table.columns[columnName];
                if (column.id)
                {
                    column.notNull = true;
                    column.type = 'int';
                }
                const notNull = column.notNull ? ' NOT NULL ' : '';
                const check = column.check ? ` CHECK(${column.check}) ` : '';
                const def = column.default ? ` DEFAULT ${column.default} ` : '';
                const type = column.type + (column.length > 0 ? `(${column.length})` : '');

                columnQuery.push(`    \`${columnName}\` ${type}${(column.id ? ' AUTO_INCREMENT ' : '')}${notNull}${def}${check}`);
                if (column.pk || column.id)
                {
                    pk.push(columnName);
                }
            }
            query.push(columnQuery.join(",\n") + (pk.length > 0 ? ',' : ''));


            if (pk.length > 0)
            {
                query.push('    PRIMARY KEY');
                query.push('    (');
                
                const pkQuery: string[] = [];
                pk.forEach(p =>
                {
                    pkQuery.push(`        \`${p}\``);
                });
                query.push(pkQuery.join(",\n"));
                query.push('    )' + (Object.keys(table.indexes).length > 0 ? ',' : ''));
            }

            let num = 1;

            const indexQuery: string[] = [];
            for (const indexName of Object.keys(table.indexes))
            {
                const index = table.indexes[indexName];
                const indexColumns = [];
                for (const c in index.columns) {
                    indexColumns.push(c);
                }
                
                const tmp: string[] = [];
                const name = indexName ? indexName : `INDEX_${tableName}_${num}`;
                tmp.push(`    ${(index.unique ? 'UNIQUE ' : '')}INDEX \`${name}\``);
                tmp.push('    (');
                tmp.push('        ' + indexColumns.map(c => `\`${c}\` ${index.columns[c]}`).join(','));
                tmp.push(`    )`);

                indexQuery.push(tmp.join("\n"));
            }
            query.push(indexQuery.join(",\n"));
            query.push(');');
            
        }


        // foregin key
        for (const tableName of Object.keys(tables))
        {
            const table = tables[tableName];
            for (const columnName of Object.keys(table.columns).filter(c => table.columns[c].foreignKey))
            {
                const column = table.columns[columnName];
                
                for (const fkName of Object.keys(column.foreignKey))
                {
                    const fk = column.foreignKey[fkName];
                    query.push(this.createAlterForeignKey(tableName, columnName, fkName, fk.update, fk.delete, tables));
                }

            }
        }

        return query.join('\n');

        
    }
    
   
    
    public async reCreate(db: Db) {
        const trn = await this.connection.beginTransaction();
        console.log(trn);
        const tables = [];
        const data = await this.connection.query('show tables');
        for (const row of data){
            tables.push(data[0][Object.keys(row)[0]]);
        } 
        
        if (tables.length > 0) {
            let query = `
                SET FOREIGN_KEY_CHECKS = 0;
                DROP TABLE ${tables.map(t => `\`${t}\``).join(',')};
                SET FOREIGN_KEY_CHECKS = 1;
            `;
            await this.connection.query(query);
        }
        
        const query = this.createQuery(db.tables);
        await this.connection.query(query);
        await this.connection.commit();
        return true;

    }
    
    public update(db: Db) {

    }


    private createAlterForeignKey(table: string, column: string, fk: string, onupdate: string, ondelete: string, tables: {[key: string]: DbTable}) {
        
        const foreignTable = fk.split('.')[0];
        const foreignColumn = fk.split('.')[1];

        if (onupdate) {
            onupdate = ` ON UPDATE ${onupdate} `;
        }

        if (ondelete) {
            ondelete = ` ON DELETE ${ondelete} `;
        }

        let query = "";
        
        // check index
        let hasIndex = false;
        //const hasIndex = tables[foreignTable].indexes.Any(i => i.Value.Columns.All(c => c.Key == foreignColumn));
        if (!hasIndex) {
            query += `ALTER TABLE \`${foreignTable}\` ADD INDEX \`fk_${foreignTable}_${foreignColumn}_index\` (\`${foreignColumn}\` ASC);\n`;
        }
        //hasIndex = tables[table].Indexes.Any(i => i.Value.Columns.All(c => c.Key == column));
        if (!hasIndex) {
            query += `ALTER TABLE \`${table}\` ADD INDEX \`fk_${table}_${column}_index\` (\`${column}\` ASC);\n`;
        }


        query += `ALTER TABLE \`${table}\` ADD FOREIGN KEY (\`${column}\`) REFERENCES \`${foreignTable}\`(\`${foreignColumn}\`)${onupdate}${ondelete};\n`;

        return query;
       // return '';
    }
}