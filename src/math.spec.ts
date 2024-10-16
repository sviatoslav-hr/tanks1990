import { distanceV2, toDegrees, toRadians } from './math';

describe('math', () => {
    it('should calculate the distance between two points', () => {
        const dist = distanceV2({ x: 1, y: 1 }, { x: 4, y: 5 });
        expect(dist).toEqual(5);
    });

    it('should calculate the distance between two points with negatives', () => {
        const dist = distanceV2({ x: -14, y: 69 }, { x: 44, y: 55 });
        const distFloored = Math.floor(dist * 100) / 100;
        expect(distFloored).toEqual(59.66);
    });

    it('should convert radians to degrees', () => {
        expect(toDegrees(Math.PI / 2)).toEqual(90);
    });

    it('should convert degrees to radians', () => {
        expect(toRadians(90)).toEqual(Math.PI / 2);
    });
});
