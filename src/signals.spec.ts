import {describe, expect, it} from 'vitest';
import {computed, effect, signal} from '#/signals';

describe('signals', () => {
    it('should store and update value', () => {
        const a = signal(1);
        expect(a()).toBe(1);
        a.set(2);
        expect(a()).toBe(2);
        a.update((v) => v + 1);
        expect(a()).toBe(3);
        a.set(7);
        expect(a()).toBe(7);
    });

    it('should call effect when changed', () => {
        const a = signal(1);
        let callCount = 0;
        effect(() => {
            a();
            callCount += 1;
        });

        expect(callCount).toBe(1);
        a.set(2);
        expect(callCount).toBe(2);
        a.set(2); // shouldn't trigger with the same value
        expect(callCount).toBe(2);
    });

    it('should update computed when changed', () => {
        const a = signal(1);
        const b = signal(2);
        const sum = computed(() => a() + Math.abs(b()));
        const doubled = computed(() => sum() * 2);
        let callsCounts = {sum: 0, double: 0};
        effect(() => {
            sum();
            callsCounts.sum += 1;
        });
        effect(() => {
            doubled();
            callsCounts.double += 1;
        });

        expect(sum()).toBe(3);
        expect(doubled()).toBe(6);
        expect(callsCounts).toEqual({sum: 1, double: 1});
        a.set(3);
        expect(sum()).toBe(5);
        expect(doubled()).toBe(10);
        expect(callsCounts).toEqual({sum: 2, double: 2});
        b.set(4);
        expect(sum()).toBe(7);
        expect(callsCounts).toEqual({sum: 3, double: 3});
        expect(doubled()).toBe(14);
        b.set(-4);
        expect(sum()).toBe(7);
        // effect shouldn't be called because the computed value didn't change
        expect(callsCounts).toEqual({sum: 3, double: 3});
    });

    it('should call nested effects correctly', () => {
        const a = signal(1);
        const b = signal(1);
        const c = signal(1);
        const d = signal(1);

        const callsCounts = {a: 0, b: 0, c: 0, d: 0};

        effect(() => {
            a();
            callsCounts.a += 1;
            effect(() => {
                b();
                callsCounts.b += 1;
                effect(() => {
                    c();
                    callsCounts.c += 1;
                });
                effect(() => {
                    d();
                    callsCounts.d += 1;
                });
            });
        });

        expect(callsCounts).toEqual({a: 1, b: 1, c: 1, d: 1});

        d.set(2);
        expect(callsCounts).toEqual({a: 1, b: 1, c: 1, d: 2});

        c.set(2);
        expect(callsCounts).toEqual({a: 1, b: 1, c: 2, d: 2});

        b.set(2);
        expect(callsCounts).toEqual({a: 1, b: 2, c: 3, d: 3});

        a.set(2);
        expect(callsCounts).toEqual({a: 2, b: 3, c: 4, d: 4});

        b.set(3);
        expect(callsCounts).toEqual({a: 2, b: 4, c: 5, d: 5});

        c.set(3);
        expect(callsCounts).toEqual({a: 2, b: 4, c: 6, d: 5});

        d.set(3);
        expect(callsCounts).toEqual({a: 2, b: 4, c: 6, d: 6});
    });
});
