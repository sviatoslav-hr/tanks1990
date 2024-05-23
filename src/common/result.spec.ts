import { Result } from './result';

describe('Result', () => {
    it('should unwrap value', () => {
        const val = 123;
        const res = Result.Ok(val);
        expect(res.unwrapOr(0)).toEqual(val);
    });
});
