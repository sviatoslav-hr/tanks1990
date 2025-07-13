import {logger} from '#/common/logger';

export function exportAsJson(obj: object, fileName = 'data.json'): void {
    const jsonStr = JSON.stringify(obj); // Pretty-print with 2 spaces
    const blob = new Blob([jsonStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export class GameStorage {
    constructor(private readonly storage: Storage) {}

    set(key: string, value: unknown): void {
        this.storage.setItem(key, stringifyUnknown(value));
    }

    get(key: string): string | null {
        return this.storage.getItem(key);
    }

    getBool(key: string): boolean | null {
        const value = this.get(key);
        if (value == null) return null;
        return value === 'true';
    }

    getNumber(key: string): number | null {
        const value = this.get(key);
        if (value == null) return null;
        const num = Number(value);
        if (isNaN(num)) {
            logger.warn('Storage: "%s" is NaN', key);
            return null;
        }
        return num;
    }

    getDate(key: string): Date | null {
        const value = this.get(key);
        if (value == null) return null;
        const date = new Date(value);
        if (isNaN(date.getTime())) {
            logger.warn('Storage: "%s" is an invalid date', key);
            return null;
        }
        return date;
    }
}

function stringifyUnknown(value: unknown): string {
    switch (typeof value) {
        case 'string':
            return value;
        case 'number':
        case 'boolean':
            return value.toString();
        case 'object':
            if (value instanceof Date) {
                return value.toISOString();
            }
            return JSON.stringify(value);
        default:
            throw new Error(`Unsupported type: ${typeof value}`);
    }
}
