import {DbForeignKey} from './dbForeignKey';

export interface DbColumn {
    displayName?: string;
    type?: string;
    length?: number;
    pk?: boolean;
    id?: boolean;
    notNull?: boolean;
    check?: string;
    foreginKey?: { [key: string]: DbForeignKey };
    default?: string;
    comment?: string;
}


