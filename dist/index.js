#! /usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const program = require("commander");
const core_1 = require("./class/core");
(() => __awaiter(this, void 0, void 0, function* () {
    const core = new core_1.Core();
    program.command('extract').description('').action(() => __awaiter(this, void 0, void 0, function* () {
        yield core.setHosts({
            type: program.type,
            host: program.host,
            port: program.port,
            hosts: program.hosts,
            user: program.user,
            password: program.password,
            database: program.database
        });
        yield core.execute('extract');
    }));
    program.version('0.0.1')
        .option('-h, --host <value>', 'host')
        .option('-H, --hosts <value>', 'hosts file')
        .option('-t, --type <value>', 'database type', /^(mysql|postgres|mssql)$/i, '')
        .option('-u, --user <value>', 'user id')
        .option('-p, --password <value>', 'database password')
        .option('-P, --port <value>', 'port');
    program.parse(process.argv);
}))();
//# sourceMappingURL=index.js.map