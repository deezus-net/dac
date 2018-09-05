#! /usr/bin/env node
import * as program from 'commander';
import * as fs from 'fs';
import {promisify} from 'util';
import { Core } from './class/core';
import {Command} from './class/define';

(async () => {

    const argChecks = async (command: string) => {
        if (program.hosts) {
            if (!await promisify(fs.exists)(program.hosts)) {
                console.log(`${program.hosts} not found`);
                return false;
            }

        } else {
            if (!program.type || !program.host || !program.user || !program.password || !program.database) {
                console.log(`type, host, user, password, database are required`);
                return false;
            }
        }

        if (command === Command.extract && !program.outDir) {
            console.log(`outDir is required`);
            return false;
        }

        if ([Command.create, Command.reCreate, Command.update, Command.diff].indexOf(command) !== -1 && !program.input) {
            console.log(`input is required`);
            return false;
        }
        
        return true;
    };
    
    const core = new Core();
    
    program.command(Command.extract).description('Create yaml from database').action(async () => {
        if (await argChecks(Command.extract)) {
            await core.setHosts({
                type: program.type,
                host: program.host,
                port: program.port,
                hosts: program.hosts,
                user: program.user,
                password: program.password,
                database: program.database,
                input: program.input,
                outDir: program.outDir,
                query: program.query
            });
            await core.execute(Command.extract);
        }
    });

    program.command(Command.create).description('Create tables by yaml').action(async () => {
        if (await argChecks(Command.create)) {
            await core.setHosts({
                type: program.type,
                host: program.host,
                port: program.port,
                hosts: program.hosts,
                user: program.user,
                password: program.password,
                database: program.database,
                input: program.input,
                outDir: program.outDir,
                query: program.query
            });
            await core.execute(Command.create);
        }
    });

    program.command(Command.reCreate).description('Drop and Create tables by yaml (lost your all data)').action(async () => {
        if (await argChecks(Command.reCreate)) {
            await core.setHosts({
                type: program.type,
                host: program.host,
                port: program.port,
                hosts: program.hosts,
                user: program.user,
                password: program.password,
                database: program.database,
                input: program.input,
                outDir: program.outDir,
                query: program.query
            });
            await core.execute(Command.reCreate);
        }
    });

    program.command(Command.update).description('Alter tables by yaml (your data is kept)').action(async () => {
        if (await argChecks(Command.update)) {
            await core.setHosts({
                type: program.type,
                host: program.host,
                port: program.port,
                hosts: program.hosts,
                user: program.user,
                password: program.password,
                database: program.database,
                input: program.input,
                outDir: program.outDir,
                query: program.query
            });
            await core.execute(Command.update);
        }
    });

    program.command(Command.diff).description('Show difference between yaml and server').action(async () => {
        if (await argChecks(Command.diff)) {
            await core.setHosts({
                type: program.type,
                host: program.host,
                port: program.port,
                hosts: program.hosts,
                user: program.user,
                password: program.password,
                database: program.database,
                input: program.input,
                outDir: program.outDir,
                query: program.query
            });
            await core.execute(Command.diff);
        }
    });

    
    program.version('0.0.1', '-v, --version')
        .usage('[command] [options]')
        
        .option('-f, --hosts <value>', 'Hosts file path.')
        .option('-H, --host <value>', 'Database server / DataBase name when use hosts file. (required if not use hosts)')
        .option('-t, --type <value>', 'database type. (required if not use hosts)', /^(mysql|postgres|mssql)$/i, '')
        .option('-u, --user <value>', 'Database user. (required if not use hosts)')
        .option('-p, --password <value>', 'Database password. (required if not use hosts)')
        .option('-P, --port <value>', 'Database port. (required if not use hosts)')
        .option('-d, --database <value>', 'Database name. (required if not use hosts)')
        .option('-i, --input <value>', 'Yaml path.')
        .option('-q, --query', 'Create Query.')
        .option('-o, --outDir <value>', 'output when extracting, querying.');

    program.parse(process.argv);

})();
