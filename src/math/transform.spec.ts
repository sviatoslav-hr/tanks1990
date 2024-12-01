import {describe, it, expect} from 'vitest';

import {toDegrees} from '#/math';
import {Transform} from '#/math/transform';
import {Vector2} from '#/math/vector';

describe('Transform', () => {
    it('should multiply the matrices', () => {
        const m1 = {
            a: 1,
            c: 0,
            e: 40,
            b: 0,
            d: 1,
            f: 40,
        };
        const m2 = {
            a: 2,
            c: 0,
            e: 0,
            b: 0,
            d: 2,
            f: 0,
        };

        const m12 = {
            a: 2,
            c: 0,
            e: 40,
            b: 0,
            d: 2,
            f: 40,
        };
        const result = Transform.from(m1).multiply(Transform.from(m2));
        expect(result).toEqual(m12);
    });

    it('should translate(move) the matrix', () => {
        const t = Transform.from({a: 1, b: 0, c: 0, d: 1, e: 2, f: 2});
        t.translate(Vector2.create(5, 9));
        expect(t.position).toEqual(Vector2.create(7, 11));
    });

    it('should rotate the matrix', () => {
        const t = Transform.makeTranslation(Vector2.create(50, 80));
        t.rotate(Math.PI / 2);
        const position = t.position;
        const expectedPosition = Vector2.create(80, -50);
        expect(Math.round(position.x)).toEqual(expectedPosition.x);
        expect(Math.round(position.y)).toEqual(expectedPosition.y);
        expect(toDegrees(t.rotation)).toEqual(90);
    });

    it('should rotate already rotated matrix', () => {
        const t = Transform.makeTranslation(Vector2.create(50, 80));
        t.rotate(Math.PI / 2);
        t.rotate(Math.PI / 2);
        const position = t.position;
        const expectedPosition = Vector2.create(-50, -80);
        expect(Math.round(position.x)).toEqual(expectedPosition.x);
        expect(Math.round(position.y)).toEqual(expectedPosition.y);
        expect(toDegrees(t.rotation)).toEqual(180);
    });

    it('should rotate the matrix as THREE.js', () => {
        const t = new Transform(1, 4, 2, 5, 3, 6);
        const expected = new Transform(
            3.5355339059327373,
            2.121320343559643,
            4.949747468305833,
            2.121320343559643,
            6.363961030678928,
            2.1213203435596433,
        );
        t.rotate(Math.PI / 4);
        expect(t).toEqual(expected);
    });

    it('should scale the matrix', () => {
        const t = Transform.makeTranslation(Vector2.create(5, 8));
        t.scale(10);
        expect(t.scaling).toEqual(Vector2.create(10, 10));
        expect(t.position).toEqual(Vector2.create(50, 80));
    });
});
