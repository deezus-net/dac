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
const core_1 = require("./core");
describe('core', () => {
    let core = null;
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        core = new core_1.Core();
        yield core.setHosts({
            hosts: './test_data/hosts.yml',
            host: null,
            password: null,
            port: null,
            user: null,
            database: null,
            type: null
        });
    }));
    it('extract', () => __awaiter(this, void 0, void 0, function* () {
        yield core.execute('extract');
    }));
});
//# sourceMappingURL=core.spec.js.map