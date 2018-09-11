import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import {promisify} from 'util';
import {Db} from '../interfaces/db';
import { DbHost } from '../interfaces/dbHost';
import { DbInterface} from '../interfaces/dbInterface';
import {DbMssql} from './dbMssql';
import {DbMysql} from './dbMysql';
import {DbPostgres} from './dbPostgres';
import {Command, ConsoleColor, DbType} from './define';
import {dbToYaml, trimDbProperties, yamlToDb} from './utility';
import ObjectContaining = jasmine.ObjectContaining;

export class Core {
    private dbHosts: DbHost[] = [];
    private db: Db;
    private outDir: string;
    private queryOnly;
    /**
     * 
     * @param {Args} args
     * @returns {Promise<void>}
     */
    public async setHosts(args: Args) {
        if (args.hosts) {
            const hostText = await promisify(fs.readFile)(args.hosts, 'utf8');
            const hosts = yaml.safeLoad(hostText) as {[key: string]: DbHost};

            if (args.host) {
                hosts[args.host].name = args.host;
                this.dbHosts = [
                  hosts[args.host]
                ];
            } else {
                this.dbHosts = Object.keys(hosts).map(n => {
                    hosts[n].name = n;
                    return hosts[n];
                });
            }
            
        } else {
            this.dbHosts = [
                {
                    type: args.type,
                    host: args.host,
                    port: args.port,
                    user: args.user,
                    password: args.password,
                    database: args.database,
                    name: args.host
                } 
            ];
        }

        if (args.input) {
            const dbText = await promisify(fs.readFile)(args.input, 'utf8');
            this.db = yamlToDb(dbText);
            trimDbProperties(this.db);
        }
        this.outDir = args.outDir;
        this.queryOnly = args.query;
    }

    /**
     * 
     * @param {string} command
     * @returns {Promise<void>}
     */
    public async execute(command: string) {
        let res = true;
        for (const dbHost of this.dbHosts) {
            let db: DbInterface;
            switch (dbHost.type) {
                case DbType.mysql:
                    db = new DbMysql(dbHost);
                    break;
                case DbType.postgres:
                    db = new DbPostgres(dbHost);
                    break;
                case DbType.msSql:
                    db = new DbMssql(dbHost);
                    break;
            }
            await db.connect();
            try {
                switch (command) {
                    case Command.extract:
                        await this.extract(db, dbHost.name);
                        break;
                    case Command.create:
                        await this.create(db);
                        break;
                    case Command.reCreate:
                        await this.reCreate(db);
                        break;
                    case Command.update:
                        await this.update(db);
                        break;
                    case Command.diff:
                        await this.diff(db);
                        break;
                }
            } catch (e) {
                console.log(e);
                res = false;
            }
            await db.close();

        }
        return res;
    }

    /**
     * 
     * @param {DbInterface} db
     * @param {string} name
     * @returns {Promise<void>}
     */
    private async extract(db: DbInterface, name: string) {
        const data = await db.extract();
    //    trimDbProperties(data);
        await promisify(fs.writeFile)(path.join(this.outDir, `${name}.yaml`), dbToYaml(data));
    }

    /**
     * 
     * @param {DbInterface} db
     * @returns {Promise<void>}
     */
    private async create(db: DbInterface) {
        const query = await db.create(this.db, this.queryOnly);
        if (this.queryOnly){
            console.log(query);
        } 
    }

    /**
     * 
     * @param {DbInterface} db
     * @returns {Promise<void>}
     */
    private async reCreate(db: DbInterface) {
        const query = await db.reCreate(this.db, this.queryOnly);
        if (this.queryOnly){
            console.log(query);
        }
    }

    /**
     * 
     * @param {DbInterface} db
     * @returns {Promise<void>}
     */
    private async update(db: DbInterface) {
        await db.update(this.db, this.queryOnly);
    }

    /**
     * 
     * @param {DbInterface} db
     * @returns {Promise<void>}
     */
    private async diff(db: DbInterface) {
        
        
        const diff = await db.diff(this.db);
        for (const tableName of Object.keys(diff.addedTables)){
            console.log(`${ConsoleColor.fgCyan}%s${ConsoleColor.reset}`, `+ ${tableName}`);
        }

        for (const tableName of diff.deletedTableNames){
            console.log(`${ConsoleColor.fgRed}%s${ConsoleColor.reset}`, `- ${tableName}`);
        }
        
        for (const tableName of Object.keys(diff.modifiedTables)){
            console.log(`${ConsoleColor.fgGreen}%s${ConsoleColor.reset}`, `# ${tableName}`);
            
            for (const columnName of Object.keys(diff.modifiedTables[tableName].addedColumns)){
                console.log(`${ConsoleColor.fgCyan}%s${ConsoleColor.reset}`, `  + ${columnName}`);
            }

            for (const columnName of diff.modifiedTables[tableName].deletedColumnName){
                console.log(`${ConsoleColor.fgRed}%s${ConsoleColor.reset}`, `  - ${columnName}`);
            }

            for (const columnName of Object.keys(diff.modifiedTables[tableName].modifiedColumns)){
                const orgColumn = diff.currentDb.tables[tableName].columns[columnName];
                const column = diff.newDb.tables[tableName].columns[columnName];
                
                console.log(`${ConsoleColor.fgGreen}%s${ConsoleColor.reset}`, `  # ${columnName}`);
                
                if (orgColumn.type !== column.type || orgColumn.length !== column.length) {
                    console.log(`      type: ${orgColumn.type}${orgColumn.length ? `(${orgColumn.length})` : ``} -> ${column.type}${column.length ? `(${column.length})` : ``}`);
                }
                if (orgColumn.pk !== column.pk) {
                    console.log(`      pk: ${orgColumn.pk} -> ${column.pk}`);
                }
                if (orgColumn.notNull !== column.notNull) {
                    console.log(`      not null: ${orgColumn.notNull} -> ${column.notNull}`);
                }
            }
            
            for (const indexName of Object.keys(diff.modifiedTables[tableName].addedIndexes)){
                console.log(`${ConsoleColor.fgCyan}%s${ConsoleColor.reset}`, `  + ${indexName}`);
            }
            for (const indexName of diff.modifiedTables[tableName].deletedIndexNames){
                console.log(`${ConsoleColor.fgRed}%s${ConsoleColor.reset}`, `  - ${indexName}`);
            }

            for (const indexName of Object.keys(diff.modifiedTables[tableName].modifiedIndexes)){
                const orgIndex = diff.currentDb.tables[tableName].indexes[indexName];
                const index = diff.newDb.tables[tableName].indexes[indexName];
                
                console.log(`${ConsoleColor.fgGreen}%s${ConsoleColor.reset}`, `  # ${indexName}`);
                
                const orgIndexColumns = Object.keys(orgIndex.columns).map(c => `${c} ${orgIndex.columns[c]}`).join(',');
                const indexColumns = Object.keys(index.columns).map(c => `${c} ${index.columns[c]}`).join(',');
                if(orgIndexColumns !== indexColumns) {
                    console.log(`      columns: ${orgIndexColumns} -> ${indexColumns}`);
                }
                
                if (orgIndex.unique !== index.unique) {
                    console.log(`      unique: ${orgIndex.unique} -> ${index.unique}`);
                } 
                
            }
        } 
        
    }

}

interface Args {
    type?: string;
    host?: string;
    port?: string;
    user?: string;
    password?: string;
    database?: string;
    hosts?: string;
    input?: string;
    outDir?: string;
    query?: boolean;
}