import { DbHost } from '../interfaces/dbHost';
import * as yaml from 'js-yaml';
import {promisify} from 'util';
import * as fs from 'fs';
import { DbInterface} from '../interfaces/dbInterface';

import ObjectContaining = jasmine.ObjectContaining;
import {Create, Diff, Extract, MsSql, Mysql, Postgres, ReCreate, Update} from './define';
import {DbMysql} from './dbMysql';
import {load} from 'js-yaml';
import {DbPostgres} from './dbPostgres';
import {DbMssql} from './dbMssql';
import {Db} from '../interfaces/db';
import {dbToYaml, yamlToDb} from './utility';
import * as path from 'path';

export class Core {
    private dbHosts: DbHost[] = [];
    private db: Db;
    private outDir: string;
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
                    return hosts[n]});
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
        }
        this.outDir = args.outDir;
    }

    /**
     * 
     * @param {string} command
     * @returns {Promise<void>}
     */
    public async execute(command: string){
        for (const dbHost of this.dbHosts){
            let db: DbInterface;
            switch (dbHost.type) {
                case Mysql:
                    db = new DbMysql(dbHost);
                    break;
                case Postgres:
                    db = new DbPostgres(dbHost);
                    break;
                case MsSql:
                    db = new DbMssql(dbHost);
                    break;
            }
            await db.connect();
            switch (command) {
                case Extract:
                    await this.extract(db, dbHost.name);
                    break;
                case Create:
                    await this.create(db);
                    break;
                case ReCreate:
                    await this.reCreate(db);
                    break;
                case Update:
                    await this.update(db);
                    break;
                case Diff:
                    await this.diff(db);
                    break;
            }
            await db.close();
        }
    
    }

    /**
     * 
     * @param {DbInterface} db
     * @returns {Promise<void>}
     */
    private async extract(db: DbInterface, name: string) {
        const data = await db.extract();
        const yaml = dbToYaml(data);
        await promisify(fs.writeFile)(path.join(this.outDir, `${name}.yaml`), yaml);
    }

    /**
     * 
     * @param {DbInterface} db
     * @returns {Promise<void>}
     */
    private async create(db: DbInterface) {
        await db.create(this.db);
    }

    /**
     * 
     * @param {DbInterface} db
     * @returns {Promise<void>}
     */
    private async reCreate(db: DbInterface) {
        await db.reCreate(this.db);
    }

    /**
     * 
     * @param {DbInterface} db
     * @returns {Promise<void>}
     */
    private async update(db: DbInterface) {
        await db.update(this.db);
    }

    /**
     * 
     * @param {DbInterface} db
     * @returns {Promise<void>}
     */
    private async diff(db: DbInterface) {
        await db.diff(this.db);
    }

}

interface Args {
    type: string;
    host: string;
    port: string;
    user: string;
    password: string;
    database: string;
    hosts: string;
    input: string;
    outDir: string;
}