export class JSONObjectParser {
    json: Record<string, unknown>;

    constructor(data: string) {
        try {
            this.json = JSON.parse(data);
        } catch (e) {
            throw new Error(`Faile to parse JSON data`, {cause: e});
        }
        if (this.type !== 'object') {
            throw new Error(
                `Invalid JSON data. Expected 'object', got: '${this.type}'`,
            );
        }
    }

    get type():
        | 'object'
        | 'array'
        | 'number'
        | 'string'
        | 'boolean'
        | 'null'
        | 'undefined'
        | 'bigint'
        | 'symbol'
        | 'function' {
        if (this.json === null) return 'null';
        if (this.json === undefined) return 'undefined';
        if (Array.isArray(this.json)) return 'array';
        return typeof this.json;
    }

    getNumber(key: string): number | undefined {
        const value = this.json[key];
        if (typeof value === 'number') {
            return value;
        }
        console.warn(`JSONObjectParser: Expected number, got: ${typeof value}`);
        return undefined;
    }

    getBoolean(key: string): boolean | undefined {
        const value = this.json[key];
        if (typeof value === 'boolean') {
            return value;
        }
        console.warn(
            `JSONObjectParser: Expected boolean, got: ${typeof value}`,
        );
        return undefined;
    }
}
