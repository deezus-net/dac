import * as mysql from 'mysql';
import {Db} from '../interfaces/db';
import {DbHost} from '../interfaces/dbHost';
import {DbInterface} from '../interfaces/dbInterface';
import {DbTable} from '../interfaces/dbTable';
import ObjectContaining = jasmine.ObjectContaining;
import * as util from 'util';

export class DbMysql implements DbInterface {
    
    private pool;
    constructor(dbHost: DbHost) {
        try {
            this.pool = mysql.createPool({
                host: dbHost.host,
                user: dbHost.user,
                password: dbHost.password,
                database: dbHost.database,
            });
            this.pool.query = util.promisify(this.pool.query)

        } catch (e) {
            console.log(e);
        }
    }

    public async end(){
        await this.pool.end();
    }

    public async create(db: Db) {
        const query = this.createQuery(db.tables);
        
        console.log(query);
        await this.pool.query(query);
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
    
    public async test() {

      //  var q = util.promisify(this.pool.query);
        const data = await this.pool.query('SELECT NOW()');
        console.log(data);
        
console.log('cxxxx')
//        return true;
        /*
        this.connection.connect((e) => {
            console.log(e);


            /*this.connection.query('show tables', (e, d) => {
                console.log(e);
                console.log(d)
            });*/
     //   });
        this.pool.end((e) => {
            console.log(e);
        });
        return true;
    }
    
    public async reCreate(db: Db) {
        try {
        //    const query = this.createQuery(db.tables);
         //   const trn = this.connection.beginTransaction();
            
            const data = await this.pool.query('show tables');
            console.log(data);
            
           // console.log(data);
           // await this.connection.query('COMMIT;');
        }
        catch (e) {
            console.log(e)
        }
return true;
        /*
        
        using (var con = Connection)
        {
            using (var trn = con.BeginTransaction())
            {
                // get table list
                var tables = new Dictionary<string, DbTable>();
                using (var cmd = new MySqlCommand("show tables", trn.Connection, trn))
                {
                    using (var reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            tables.Add(reader.GetString(0), new DbTable());
                        }
                    }
                }
                // drop exist tables
                using (var cmd = new MySqlCommand("", trn.Connection, trn))
                {
                    var drop = new List<string>
                        {
                            "SET FOREIGN_KEY_CHECKS = 0;",
                            $"DROP TABLE {string.Join(",", tables.Keys.Select(t => $"`{t}`"))};",
                            "SET FOREIGN_KEY_CHECKS = 1;"
                        };

                    cmd.CommandText = string.Join("\r\n", drop);
                    cmd.ExecuteNonQuery();
                }


                using (var cmd = new MySqlCommand(query, trn.Connection, trn))
                {
                    cmd.ExecuteNonQuery();
                }

                trn.Commit();
            }
        }*/


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