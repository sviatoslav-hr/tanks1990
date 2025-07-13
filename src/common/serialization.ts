type TypeMap = {
    string: string;
    number: number;
    boolean: boolean;
};

type SerializablePrimitive = keyof TypeMap;

interface FieldSchema<TType extends SerializablePrimitive> {
    key: string;
    type: TType;
    get: () => TypeMap[TType];
    set?: (value: TypeMap[TType]) => void;
    // TODO: Support nested objects and arrays
    // TOOD: Support required fields, default values or fallback strategies
}

export class SerializationSchema {
    private fields: FieldSchema<keyof TypeMap>[] = [];

    private constructor() {}

    static build(): SerializationSchema {
        return new SerializationSchema();
    }

    field<T extends SerializablePrimitive>(field: FieldSchema<T>): this {
        const existingField = this.fields.find((f) => f.key === field.key);
        if (existingField) {
            throw new Error(`Field with key '${field.key}' already exists in the schema.`);
        }
        this.fields.push(field as FieldSchema<any>);
        return this;
    }

    serialize(): string {
        const result: Record<string, unknown> = {};
        for (const field of this.fields) {
            result[field.key] = field.get();
        }
        return JSON.stringify(result);
    }

    deserialize(data: string): void {
        const parsedData: unknown = JSON.parse(data);
        assert(parsedData !== null && typeof parsedData === 'object');

        for (const field of this.fields) {
            const key = field.key;
            if (hasOwnProperty(parsedData, key)) {
                const value = parsedData[key];
                if (typeof value !== field.type) {
                    logger.warn(
                        'Skipping serialization for field %s, expected type %s, got %s',
                        key,
                        field.type,
                        typeof value,
                    );
                    continue;
                }
                if (field.set) {
                    field.set(value as TypeMap[typeof field.type]);
                }
            }
        }
    }
}

function hasOwnProperty<T extends object, K extends PropertyKey>(
    obj: T,
    key: K,
): obj is T & {[P in K]: unknown} {
    return Object.hasOwn(obj, key);
}
