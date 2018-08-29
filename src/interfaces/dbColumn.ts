import {DbForeignKey} from './dbForeignKey';

export interface DbColumn {
    name?: string;
    displayName?: string;
    type?: string;
    length?: number;
    pk?: boolean;
    id?: boolean;
    notNull?: boolean;
    check?: string;
    foreignKey?: { [key: string]: DbForeignKey };
    default?: string;
    comment?: string;
}


