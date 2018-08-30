import * as mysql from 'promise-mysql';
import {Db} from '../interfaces/db';
import {DbHost} from '../interfaces/dbHost';
import {DbInterface} from '../interfaces/dbInterface';
import {DbTable} from '../interfaces/dbTable';
import {DbColumn} from '../interfaces/dbColumn';
import {checkDbDiff, equalColumn, equalIndex} from './utility';


export class DbMysql implements DbInterface {
    
    private connection: mysql.Connection;
    private dbHost: DbHost;
    
    constructor(dbHost: DbHost) {
        this.dbHost = dbHost;
    }
    
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

    public async close() {
        await this.connection.end();
        return true;
    }

    public async create(db: Db) {
        const query = this.createQuery(db.tables);
        await this.connection.query(query);
        return true;
    }

    public async diff(db: Db) {
        const orgDb = await this.extract();
        return checkDbDiff(orgDb, db);
    }

    public async extract() {
        const tables: { [key: string]: DbTable } = {};
        
        const data = await this.connection.query('show tables');
        for (const row of data){
            tables[row[Object.keys(row)[0]]] = {
                columns: {},
                indexes: {}
            };
        }
        console.log(tables);
        for (const tableName of Object.keys(tables)) {
            // get column list
            for (const row of await this.connection.query(`DESCRIBE ${tableName}`)) {
                let type = row['Type'];
                const length = parseInt((type.match(/\(([0-9]+)\)/) || [])[1] || 0, 10);
                type = type.replace(/\([0-9]+\)/, '');

                const column: DbColumn = {
                    type: type,
                    length: length,
                    pk: row["Key"] == "PRI",
                    notNull: row["Null"] == "NO"
                };
                if (row["Default"]) {
                    column.default = row["Default"];
                }

                tables[tableName].columns[row["Field"]] = column;
            }

            // get index list
            for (const row of await this.connection.query(`SHOW INDEX FROM ${tableName} WHERE Key_name != 'PRIMARY'`)) {

                const indexName = row['Key_name'];
                const nonUnique = parseInt(row["Non_unique"], 10);
                const collation = row["Collation"];
                if (!tables[tableName].indexes[indexName]) {
                    tables[tableName].indexes[indexName] = {
                        unique: nonUnique === 0,
                        columns: {}
                    };
                }
                tables[tableName].indexes[indexName].columns[row['Column_name']] = collation === "A" ? "ASC" : "DESC";
            }

            // get foregin key
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
            console.log(this.dbHost.database, tableName);
            for (const row of await this.connection.query(query, [this.dbHost.database, tableName])) {

                const columnName = row['column_name'];
                console.log(columnName);
                if (!tables[tableName].columns[columnName].foreignKey) {
                    tables[tableName].columns[columnName].foreignKey = {};
                }
                


                if (Object.keys(tables[tableName].columns).indexOf(columnName) === -1) {
                    continue;
                }

                let updateRule = row['UPDATE_RULE'];
                let deleteRule = row['DELETE_RULE'];

                if (updateRule == 'NO ACTION') {
                    updateRule = '';
                }
                if (deleteRule == 'NO ACTION') {
                    deleteRule = '';
                }

                const fkName = `${row['foreign_table_name']}.${row['foreign_column_name']}`;
                tables[tableName].columns[columnName].foreignKey[fkName] = {
                    name: row['constraint_name'],
                    update: updateRule,
                    delete: deleteRule
                }
            }
        }
        return {tables: tables};

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
                    query.push(DbMysql.createAlterForeignKey(tableName, columnName, fkName, fk.update, fk.delete, tables));
                }

            }
        }

        return query.join('\n');

        
    }
    
   
    
    public async reCreate(db: Db) {
        
        await this.connection.query('BEGIN');
       // const trn = await this.connection.beginTransaction();
       // console.log(trn);
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
      //  await this.connection.commit();
        await this.connection.query('COMMIT');
        return true;

    }

    /**
     * 
     * @param {Db} db
     * @returns {Promise<void>}
     */
    public async update(db: Db) {
        //const trn = await this.connection.beginTransaction();
        await this.connection.query('BEGIN');
        const currentDb = await this.extract();

        let change = 0;

        // foregin key indexes
        const fkIndexes: string[] = [];
        for (const tableName of Object.keys(db.tables)) {
            const table = db.tables[tableName];
            for (const columnName of Object.keys(table.columns).filter(c => table.columns[c].foreignKey)) {
                fkIndexes.push(`${tableName}.${columnName}`);
                for (const fk of Object.keys(table.columns[columnName].foreignKey)) {
                    fkIndexes.push(fk);
                }
            }
        }

        for (const tableName of Object.keys(db.tables)) {
            const table = db.tables[tableName];

            const orgTable = currentDb.tables[tableName];

            if (orgTable) {
                // alter
                for (const columnName of Object.keys(table.columns)) {
                    const col = table.columns[columnName];
                    const orgCol = orgTable.columns[columnName];

                    const notNull = col.notNull ? ' NOT NULL ' : ' NULL ';
                    const def = col.default ? ` DEFAULT ${col.default} ` : '';
                    const type = (col.id ? 'int' : col.type) + (col.length > 0 ? `(${col.length})` : '');

                    if (!orgCol) {
                        // add column
                        const query = `
                                ALTER TABLE 
                                    \`${tableName}\` 
                                ADD COLUMN \`${columnName}\` ${type}${ (col.id ? ' AUTO_INCREMENT' : '')}${notNull}${def}`;
                        await this.connection.query(query);
                        change++;

                    } else if (!equalColumn(col, orgCol)) {
                        // if change execute alter
                        const query = `
                                ALTER TABLE 
                                    \`${tableName}\`
                                MODIFY \`${columnName}\` ${type}${(col.id ? ' AUTO_INCREMENT' : '')}${notNull}${def}`;
                        console.log(query);
                        await this.connection.query(query);
                        change++;
                    }
                }

                for (const delCol of Object.keys(orgTable.columns).filter(oc => Object.keys(table.columns).indexOf(oc) === -1)) {
                    const query = `
                                ALTER TABLE 
                                    \`${tableName}\` 
                                DROP COLUMN \`${delCol}\``;
                    console.log(query)
                    await this.connection.query(query);
                    change++;
                }


                for (const indexName in table.indexes) {
                    const orgIndex = orgTable.indexes[indexName];
                    const index = table.indexes[indexName];

                    if (!orgIndex) {
                        // add index
                        const query = `
                                ALTER TABLE 
                                    \`${tableName}\`
                                ADD ${(index.unique ? 'UNIQUE ' : '')}INDEX \`${indexName}\` (${Object.keys(index.columns).map(c => `\`${c}\` ${index.columns[c]}`)})`;
                        await this.connection.query(query);
                        change++;

                    } else if (!equalIndex(index, orgIndex)) {
                        // if change execute alter
                        const query = `
                                ALTER TABLE 
                                    \`${tableName}\`
                                DROP INDEX 
                                    \`${indexName}\`,
                                ADD ${(index.unique ? 'UNIQUE ' : '')}INDEX \`${indexName}\` (${Object.keys(index.columns).map(c => `\`${c}\` ${index.columns[c]}`)})`;
                        await this.connection.query(query);
                        change++;
                    }
                }

                for (const indexName of Object.keys(orgTable.indexes)) {
                    if (table.indexes[indexName]) {
                        continue;
                    }

                    // ignore foreign key index 
                    console.log(fkIndexes);
                    console.log(tableName + "." + Object.keys(orgTable.indexes[indexName].columns).map(c => c.split(' ')[0]).join(''));
                    if (fkIndexes.indexOf(tableName + "." + Object.keys(orgTable.indexes[indexName].columns).map(c => c.split(' ')[0]).join('')) === -1) {
                        const query = `
                                ALTER TABLE 
                                    \`${tableName}\` 
                                DROP INDEX \`${indexName}\``;
                        await this.connection.query(query);
                        change++;
                    }
                }

                // foregin key
                for (const columnName of Object.keys(table.columns).filter(c => table.columns[c].foreignKey)) {
                    for (const fkName of Object.keys(table.columns[columnName].foreignKey)) {
                        console.log(orgTable.columns[columnName].foreignKey);
                        const orgForeignKey = orgTable.columns[columnName] &&
                        orgTable.columns[columnName].foreignKey &&
                        orgTable.columns[columnName].foreignKey[fkName] ? orgTable.columns[columnName].foreignKey[fkName] : null;
                        const foreignKey = table.columns[columnName].foreignKey[fkName];
                        if (orgForeignKey !== null) {
                            if (foreignKey.update !== orgForeignKey.update || foreignKey.delete !== orgForeignKey.delete) {
                                // drop
                                const query = `
                                        ALTER TABLE 
                                            \`${tableName}\` 
                                        DROP FOREIGN KEY \`${orgForeignKey.name}\``;
                                await this.connection.query(query);
                                change++;
                            }
                            else {
                                continue;
                            }
                        }

                        const query = DbMysql.createAlterForeignKey(tableName, columnName, fkName, foreignKey.update, foreignKey.delete, db.tables);
                        await this.connection.query(query);
                        change++;
                    }

                }

                // drop foreign key
                /*var fks = table.Value.Columns.Values.Where(c => c.ForeignKey != null).Select(c => c.ForeignKey.First().Key).ToList();
                foreach (var fk in orgTable.Columns.Values.Where(c => c.ForeignKey != null).Select(c => c.ForeignKey.First()))
                {
                    if (fks.Contains(fk.Key)) continue;
                    using (var cmd = new MySqlCommand($"ALTER TABLE `{table.Key}` DROP FOREIGN KEY `{fk.Value.Name}`;", trn.Connection, trn))
                    {
                        cmd.ExecuteNonQuery();
                        change++;
                    }
                }*/

            }
            else {
                // create
                const data = {};
                data[tableName] = table;
                const query = this.createQuery(data);
                await this.connection.query(query);
                change++;
            }


            // drop tables
            for (const tableName of Object.keys(currentDb.tables).filter(t => !db.tables[t])) {
                const query = `
                        SET FOREIGN_KEY_CHECKS = 0;
                        DROP TABLE \`${tableName}\`;
                        SET FOREIGN_KEY_CHECKS = 1;
                `;
                await this.connection.query(query);
                change++;

            }

        //    await this.connection.commit();
            await this.connection.query('COMMIT');

            if (change == 0) {
                console.log('nothing is changed');
            }

        }

        return true;

    }


    private static createAlterForeignKey(table: string, column: string, fk: string, onupdate: string, ondelete: string, tables: {[key: string]: DbTable}) {
        
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