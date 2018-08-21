import { Client } from 'pg';
import {Db} from '../interfaces/db';
import {DbHost} from '../interfaces/dbHost';
import {DbInterface} from '../interfaces/dbInterface';
import {DbTable} from '../interfaces/dbTable';

export class DbPostgres implements DbInterface {
    private client: Client;

    constructor(dbHost: DbHost) {
        try {
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

    public async create() {

    }

    public async diff(db: Db) {

    }

    public extract() {
        return null;
    }
    
    public query(db: Db) {
        return this.CreateQuery(db.tables);
        
        
    }
    
    private CreateQuery(tables: {[key: string]: DbTable}) {
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

            if (pk.length > 0)
            {
                query.push(`    CONSTRAINT PK_${tableName} PRIMARY KEY `);
                query.push('    (');
                const pkQuery: string[] = [];
                pk.forEach(p =>
                {
                    pkQuery.push(`        ${p}`);
                });
                query.push(pkQuery.join('\n'));
                query.push('    )');
            }
            query.push(');');

            for (const indexName in tables[tableName].indexes)
            {
                const index = tables[tableName].indexes[indexName];
                const indexColumns = [];
                for (const c in index.columns){
                    indexColumns.push(c);
                } 
                query.push(`CREATE ${(index.unique ? 'UNIQUE ' : '')}INDEX ${indexName} ON ${tableName}(`);
                query.push('    ' + indexColumns.join(','));
                query.push(');');
            }
            
        } 
        return query.join('\n');
        /*
        

        var query = new List<string>();
        foreach (var table in tables)
        {
            query.Add($"CREATE TABLE {table.Key}(");
            var columnQuery = new List<string>();
            var pk = new List<string>();

            foreach (var column in table.Value.Columns)
            {
                if (column.Value.Id)
                {
                    column.Value.NotNull = true;
                    column.Value.Type = "serial";
                }

                var notNull = column.Value.NotNull ? " NOT NULL " : "";
                var check = !string.IsNullOrWhiteSpace(column.Value.Check) ? " CHECK(" + column.Value.Check + ") " : "";
                var def = !string.IsNullOrWhiteSpace(column.Value.Default) ? " DEFAULT " + column.Value.Default : "";
                var type = column.Value.Type + (column.Value.Length > 0 ? $"({column.Value.Length})" : "");


                columnQuery.Add($"    {column.Key} {type}{notNull}{check}{def}");
                if (column.Value.Pk || column.Value.Id)
                {
                    pk.Add(column.Key);
                }

            }
            query.Add(string.Join(",\n", columnQuery) + (pk.Count > 0 ? "," : ""));


            if (pk.Count > 0)
            {
                query.Add("    CONSTRAINT PK_" + table.Key + " PRIMARY KEY ");
                query.Add("    (");
                var pkQuery = new List<string>();
                pk.ForEach(p =>
                {
                    pkQuery.Add($"        {p}");
                });
                query.Add(string.Join(",\n", pkQuery));
                query.Add("    )");
            }
            query.Add(");");


            var num = 1;
            foreach (var index in table.Value.Indexes)
            {
                var name = !string.IsNullOrWhiteSpace(index.Key) ? index.Key : $"INDEX_{table.Key}_{num++}";
                query.Add($"CREATE {(index.Value.Unique ? "UNIQUE " : "")}INDEX {name} ON {table.Key}(");
                query.Add("    " + string.Join(",", index.Value.Columns.Select(c => $"{c.Key}")));
                query.Add(");");
            }

        }

        // foregin key
        foreach(var table in tables)
        {
            foreach(var col in table.Value.Columns.Where(c => c.Value.ForeignKey != null))
            {
                foreach (var f in col.Value.ForeignKey)
                {
                    query.Add(CreateAlterForeignKey(table.Key, col.Key, f.Key, f.Value.Update, f.Value.Delete));
                }

            }
        }


        return string.Join("\n", query);
        return '';*/
    }
    
    public async reCreate(db: Db) {

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
