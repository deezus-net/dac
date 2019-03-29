export interface DbIndex {
    name?: string;
    type?: string;
    columns: { [key: string]: string };
    unique: boolean;
}