import {describe, it, expect} from 'vitest';

import {Result, wrapError} from '#/common/result';

describe('Result', () => {
    it('Ok', () => {
        const val = 123;
        const result = Result.ok(val);
        expect(result.isOk()).toBeTruthy();
        expect(result.isErr()).toBeFalsy();
        expect(result.isOkAnd(() => true)).toBeTruthy();
        expect(result.isOkAnd(() => false)).toBeFalsy();
        expect(result.unwrap()).toEqual(val);
        expect(result.nullable()).toEqual(val);
    });

    it('Err', () => {
        const err = new Error('this is an error');
        const result = Result.err(err);
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

        const map = (v: number) => v * 2;
        const mapped = await Result.async(Promise.resolve(val)).map(map);
        expect(mapped.isOk()).toBeTruthy();
        expect(mapped.unwrap()).toEqual(map(val));

        const err2 = new Error('this is an error 2');

        const mapPromise = (v: number) => Promise.resolve(map(v));
        const mappedAwaited = await Result.async(Promise.resolve(val)).mapPromise(mapPromise);
        expect(mappedAwaited.isOk()).toBeTruthy();
        expect(mappedAwaited.unwrap()).toEqual(map(val));

        const mapPromiseRej = (_v: number) => Promise.reject(err2);
        const mappedAwaitedFailed = await Result.async(Promise.resolve(val)).mapPromise(
            mapPromiseRej,
        );
        expect(mappedAwaitedFailed.isErr()).toBeTruthy();
        expect(() => mappedAwaitedFailed.unwrap()).toThrow(err2);

        const err3 = new Error('this is an error 3');
        const awaitedFailed = await Result.async(Promise.reject(err2)).mapErr((err) => {
            err3.cause = err;
            return err3;
        });
        expect(() => awaitedFailed.unwrap()).toThrow(err3);
        expect(awaitedFailed.isErr()).toBeTruthy();
        if (awaitedFailed.isErr()) {
            expect(awaitedFailed.err.cause).toBe(err2);
        }
    });

    it('promise', async () => {
        const val = 123;
        const err = new Error('this is an error');
        const valResult = await Result.promise<number>((res) => res(val));
        const errResult = await Result.promise<number>((_, rej) => rej(err));
        if (errResult.isErr()) {
        }
        expect(valResult.isOk()).toBeTruthy();
        expect(valResult.unwrap()).toEqual(val);
        expect(errResult.isErr()).toBeTruthy();
        expect(() => errResult.unwrap()).toThrow(err);
    });

    it('unwrap', () => {
        const val = 123;
        const ok = Result.ok(val);
        const err = Result.err('err');
        expect(ok.unwrap()).toEqual(val);
        expect(() => err.unwrap()).toThrow('err');
        expect(() => err.unwrap('error wrapper')).toThrow(wrapError('err', 'error wrapper'));
        expect(ok.unwrapOr()).toEqual(val);
        expect(err.unwrapOr(0)).toEqual(0);
    });

    it('map', () => {
        const val = 123;
        const ok = Result.ok<number, string>(val);
        const err = Result.err<number, string>('err');
        const map = (v: number) => v * 2;
        expect(ok.map(map).unwrap()).toEqual(map(val));
        expect(() => err.map().unwrap()).toThrow('err');
    });

    it('orElse', () => {
        const val = 123;
        const other = 456;
        const ok = Result.ok(val);
        const err = Result.err<number, string>('err');
        expect(ok.orElse()).toEqual(val);
        expect(err.orElse(() => other)).toEqual(other);
    });

    it('Error.context', () => {
        const err = Result.err('err');
        const ctx = 'context';
        const val = 123;
        expect(Result.ok(val).contextErr().unwrap()).toEqual(val);
        expect(() => err.contextErr(ctx).unwrap()).toThrow(wrapError('err', ctx));
    });
});
