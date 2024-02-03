export class Vector2 {
    constructor(
        public x: number,
        public y: number,
    ) {}

    static create(x: number, y: number): Vector2 {
        return new Vector2(x, y);
    }
}
