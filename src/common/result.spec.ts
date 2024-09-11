import { Result, wrapError } from './result';

describe('Result', () => {
    it('Ok', () => {
        const val = 123;
        const result = Result.Ok(val);
        expect(result.isOk()).toBeTruthy();
        expect(result.isErr()).toBeFalsy();
        expect(result.isOkAnd(() => true)).toBeTruthy();
        expect(result.isOkAnd(() => false)).toBeFalsy();
        expect(result.unwrap()).toEqual(val);
        expect(result.nullable()).toEqual(val);
    });

    it('Err', () => {
        const err = new Error('this is an error');
        const result = Result.Err(err);
        expect(result.isErr()).toBeTruthy();
        expect(result.isOk()).toBeFalsy();
        expect(result.isErrAnd(() => true)).toBeTruthy();
        expect(result.isErrAnd(() => false)).toBeFalsy();
        expect(() => result.unwrap()).toThrow(err);
        expect(result.nullable()).toEqual(null);
    });

    it('call', () => {
        const val = 123;
        const err = new Error('this is an error');
        const valResult = Result.call(() => val);
        const errResult = Result.call(() => {
            throw err;
        });
        expect(valResult.isOk()).toBeTruthy();
        expect(valResult.unwrap()).toEqual(val);
        expect(errResult.isErr()).toBeTruthy();
        expect(() => errResult.unwrap()).toThrow(err);
    });

    it('async', async () => {
        const val = 123;
        const err = new Error('this is an error');
        const valResult = await Result.async(async () => val);
        const errResult = await Result.async(async () => {
            throw err;
        });
        expect(valResult.isOk()).toBeTruthy();
        expect(valResult.unwrap()).toEqual(val);
        expect(errResult.isErr()).toBeTruthy();
        expect(() => errResult.unwrap()).toThrow(err);
    });

    it('promise', async () => {
        const val = 123;
        const err = new Error('this is an error');
        const valResult = await Result.promise<number>((res) => res(val));
        const errResult = await Result.promise((_, rej) => rej(err));
        expect(valResult.isOk()).toBeTruthy();
        expect(valResult.unwrap()).toEqual(val);
        expect(errResult.isErr()).toBeTruthy();
        expect(() => errResult.unwrap()).toThrow(err);
    });

    it('unwrap', () => {
        const val = 123;
        const ok = Result.Ok(val);
        const err = Result.Err('err');
        expect(ok.unwrap()).toEqual(val);
        expect(() => err.unwrap()).toThrow('err');
        expect(() => err.unwrap('error wrapper')).toThrow(
            wrapError('err', 'error wrapper'),
        );
        expect(ok.unwrapOr(0)).toEqual(val);
        expect(err.unwrapOr(0)).toEqual(0);
    });

    it('map', () => {
        const val = 123;
        const ok = Result.Ok(val);
        const err = Result.Err<number, string>('err');
        const map = (v: number) => v * 2;
        expect(ok.map(map).unwrap()).toEqual(map(val));
        expect(() => err.map(map).unwrap()).toThrow('err');
        expect(ok.mapOr(0, map)).toEqual(map(val));
        expect(err.mapOr(0, map)).toEqual(0);
    });

    it('orElse', () => {
        const val = 123;
        const other = 456;
        const ok = Result.Ok(val);
        const err = Result.Err<number, string>('err');
        expect(ok.orElse(() => other)).toEqual(val);
        expect(err.orElse(() => other)).toEqual(other);
    });

    it('Error.context', () => {
        const err = Result.Err('err');
        const ctx = 'context';
        const val = 123;
        expect(Result.Ok(val).context(ctx).unwrap()).toEqual(val);
        expect(() => err.context(ctx).unwrap()).toThrow(wrapError('err', ctx));
    });
});
