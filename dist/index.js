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
const fs = require("fs");
const yaml = require("js-yaml");
const util_1 = require("util");
const dbPostgres_1 = require("./class/dbPostgres");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const text = yield util_1.promisify(fs.readFile)('./test_data/hosts.yml', 'utf8');
        const hosts = yaml.safeLoad(text);
        console.log(hosts);
        const p = new dbPostgres_1.DbPostgres(hosts['postgres']);
        //const m = new DbMysql(hosts['mysql']);
    });
}
main();
//# sourceMappingURL=index.js.map