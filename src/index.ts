#! /usr/bin/env node
import * as program from 'commander';
import { Core } from './class/core';

(async () => {
    const core = new Core();
    
    program.command('extract').description('').action(async () => {
        await core.setHosts({
            type: program.type,
            host: program.host,
            port: program.port,
            hosts: program.hosts,
            user: program.user,
            password: program.password,
            database: program.database,
            input: program.input,
            outDir: program.outDir
        });
        await core.execute('extract');
    });
    
    program.version('0.0.1')
        .option('-h, --host <value>', 'host')
        .option('-H, --hosts <value>', 'hosts file')
        .option('-t, --type <value>', 'database type', /^(mysql|postgres|mssql)$/i, '')
        .option('-u, --user <value>', 'user id')
        .option('-p, --password <value>', 'database password')
        .option('-P, --port <value>', 'port')
        .option('-i, --input <value>', 'yaml file path')
        .option('-o, --outDir <value>', 'output directory');
 
    program.parse(process.argv);
    
})();
