// A port of an algorithm by Johannes Baagøe <baagoe@baagoe.com>, 2010
// http://baagoe.com/en/RandomMusings/javascript/
// https://github.com/nquinlan/better-random-numbers-for-javascript-mirror
// Original work is under MIT license -

// Copyright (C) 2010 by Johannes Baagøe <baagoe@baagoe.org>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

interface AleaState {
    c: number;
    s0: number;
    s1: number;
    s2: number;
}

type Seed = string | number;

interface RNGOptions {
    state?: AleaState;
}

export class RNG {
    c: number;
    s0: number;
    s1: number;
    s2: number;
    private initial: AleaState;

    constructor(
        readonly seed: string,
        opts?: RNGOptions,
    ) {
        let mash = makeMash();
        this.c = 1;
        this.s0 = mash(' ');
        this.s1 = mash(' ');
        this.s2 = mash(' ');
        this.s0 -= mash(seed);
        if (this.s0 < 0) {
            this.s0 += 1;
        }
        this.s1 -= mash(seed);
        if (this.s1 < 0) {
            this.s1 += 1;
        }
        this.s2 -= mash(seed);
        if (this.s2 < 0) {
            this.s2 += 1;
        }
        mash = null as any;
        const state = opts?.state;
        if (state && typeof state == 'object') {
            copyInto(state, this);
        }
        this.initial = this.state();
    }

    float(): number {
        const t = 2091639 * this.s0 + this.c * 2.3283064365386963e-10; // 2^-32
        this.s0 = this.s1;
        this.s1 = this.s2;
        return (this.s2 = t - (this.c = t | 0));
    }

    double(): number {
        return this.float() + ((this.float() * 0x200000) | 0) * 1.1102230246251565e-16; // 2^-53
    }

    int32Range(min: number, max: number): number {
        // TODO: Assert min < max and
        // const n = this.float();
        // return Math.floor(n * (max - min) + min);
        const n = this.uint32();
        return min + (n % (max - min));
    }

    int32(): number {
        return (this.float() * 0x100000000) | 0;
    }

    uint32(): number {
        return this.int32() >>> 0;
    }

    quick(): number {
        return this.float();
    }

    private state(): AleaState {
        const state: Partial<AleaState> = {};
        copyInto(this, state);
        return state as AleaState;
    }

    reset(): void {
        copyInto(this.initial, this);
    }
}

export const random = new RNG('default');

function makeMash() {
    let n = 0xefc8249d;
    return (data: Seed): number => {
        data = String(data);
        for (let i = 0; i < data.length; i++) {
            n += data.charCodeAt(i);
            let h = 0.02519603282416938 * n;
            n = h >>> 0;
            h -= n;
            h *= n;
            n = h >>> 0;
            h -= n;
            n += h * 0x100000000; // 2^32
        }
        return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
    };
}

function copyInto(source: AleaState, target: Partial<AleaState>): void {
    target.c = source.c;
    target.s0 = source.s0;
    target.s1 = source.s1;
    target.s2 = source.s2;
}
