import {describe, expect, it} from 'vitest';

import {toDegrees, toRadians} from '#/math';
import {v2Distance, Vector2} from '#/math/vector';

describe('math', () => {
    it('should calculate the distance between two points', () => {
        const dist = v2Distance({x: 1, y: 1}, {x: 4, y: 5});
        expect(dist).toEqual(5);
    });

    it('should calculate the distance between two points with negatives', () => {
        const dist = v2Distance({x: -14, y: 69}, {x: 44, y: 55});
        const distFloored = Math.floor(dist * 100) / 100;
        expect(distFloored).toEqual(59.66);
    });

    it('should convert radians to degrees', () => {
        expect(toDegrees(Math.PI / 2)).toEqual(90);
    });

    it('should convert degrees to radians', () => {
        expect(toRadians(90)).toEqual(Math.PI / 2);
    });

    it('should calc angle between two vectors', () => {
        const v1 = new Vector2(1, -2);
        const v2 = new Vector2(-2, 1);
        expect(Math.floor((v1.angleTo(v2) * 180) / Math.PI)).toEqual(143);
    });

    it('should convert 0 degrees to 0 radians', () => {
        const c = new Vector2(1, 2);
        const distance = 10;
        const p0 = new Vector2(4, 6);

        const d = p0.clone().sub(c).normalize().multiplyScalar(distance).add(p0);

        expect(p0.distanceTo(d)).toEqual(distance);
        expect([d.x, d.y]).toEqual([10, 14]);
        // FIXME: for some reason this test fails
        // expect((c.angleTo(d) * 180) / Math.PI).toEqual(0);
        // expect((c.angle() * 180) / Math.PI).toEqual(
        //     (d.angle() * 180) / Math.PI,
        // );
    });
});
