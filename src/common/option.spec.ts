import { Opt } from './option';

describe('Option', () => {
    it('should unwrap the value', () => {
        const nullable: string | null = 'hello';
        const opt = Opt.from(nullable);
        const res: string = opt.unwrapOr('default');
        expect(res).toEqual(nullable);
    });
});
