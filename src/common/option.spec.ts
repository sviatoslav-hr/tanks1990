import {describe, it, expect} from 'vitest';

import {Opt} from '#/common/option';

describe('Option', () => {
    it('should unwrap the value', () => {
        const nullable: string | null = 'hello';
        const opt = Opt.from(nullable);
        const res: string = opt.unwrapOr('default');
        expect(res).toEqual(nullable);
    });
});
