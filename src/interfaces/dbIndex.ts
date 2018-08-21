export interface DbIndex {
    columns: { [key: string]: string };
    unique: boolean;
}