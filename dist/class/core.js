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
const yaml = require("js-yaml");
const util_1 = require("util");
const fs = require("fs");
class Core {
    constructor() {
        this.dbHosts = [];
    }
    /**
     *
     * @param {Args} args
     * @returns {Promise<void>}
     */
    setHosts(args) {
        return __awaiter(this, void 0, void 0, function* () {
            if (args.hosts) {
                const hostText = yield util_1.promisify(fs.readFile)(args.hosts, 'utf8');
                const hosts = yaml.safeLoad(hostText);
                if (args.host) {
                    this.dbHosts = [
                        hosts[args.host]
                    ];
                }
                else {
                    this.dbHosts = Object.keys(hosts).map(n => hosts[n]);
                }
            }
            else {
                this.dbHosts = [
                    {
                        type: args.type,
                        host: args.host,
                        port: args.port,
                        user: args.user,
                        password: args.password,
                        database: args.database
                    }
                ];
            }
        });
    }
    execute(command) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const dbHost of this.dbHosts) {
                console.log(dbHost);
            }
        });
    }
}
exports.Core = Core;
//# sourceMappingURL=core.js.map