import {computed, effect, isReadableSignal, ReadableSignal, signal, Signal} from '#/signals';

// Q: Should components have scoped css or screw it?

export interface WContext extends WElementCreationFnMap {
    thing: boolean;
}

export function createWContext(): WContext {
    function createElement<K extends keyof WElementCreationFnMap>(
        tag: K,
        opts?: WElementOptionsMap[K],
    ): WComponentNode {
        tag;
        opts;
        return {thing: true};
    }
    return {
        div: (opts) => createElement('div', opts),
        h1: (opts) => createElement('h1', opts),
        button: (opts) => createElement('button', opts),
        span: (opts) => createElement('span', opts),
        thing: true,
    };
}

type WChildrenInput = object; // TODO: Define properly

type WComponentRenderFn<TProps extends object, TChildren extends unknown[]> = (
    ui: WContext,
    props: TProps,
    children: TChildren,
) => WChildrenInput | WChildrenInput[];

type WComponentNodeFn<TProps extends object, TChildren extends unknown[]> = (
    ui: WContext,
    props: TProps,
    ...children: TChildren
) => WComponentNode;

interface WComponentNode {
    thing: boolean;
}

export function wComponent<TProps extends object = {}, TChildren extends unknown[] = never[]>(
    render: WComponentRenderFn<TProps, TChildren>,
): WComponentNodeFn<TProps, TChildren> {
    return (ui, props, ...children) => {
        render(ui, props, children);
        // TODO: Implement properly
        throw new Error('TODO: Not implemented');
        // return {thing: true};
    };
}

export type CssStyleConfig = Partial<
    Omit<
        CSSStyleDeclaration,
        | 'parentRule'
        | 'length'
        | 'getPropertyPriority'
        | 'getPropertyValue'
        | 'item'
        | 'removeProperty'
        | 'setProperty'
        | number
        | symbol
    >
>;

interface WElementBasicOptions {
    id?: string;
    class?: string;
    style?: object;
    title?: string;
    onClick?: (event: MouseEvent) => void;
}

// NOTE: All children for all element should be provided via a function call,
//       this way we can return this function for each signal update and we
//       know exactly what children should be re-evaluated.
type WElementTextValue = string | number | null | undefined;
type WElementChildren = WElementTextValue | WComponentNode;
type WElementChildrenFn = () => WElementChildren;
export type WElementChildrenInput = (WElementChildren | WElementChildrenFn)[];

interface WElementOptionsMap {
    h1: WElementBasicOptions;
    div: WElementBasicOptions;
    button: WElementBasicOptions;
    span: WElementBasicOptions;
}

type WElementCreationFnMap = {
    [K in keyof WElementOptionsMap]: (
        options?: WElementOptionsMap[K],
        // TODO: Do I enforce to use a callback and have guaranteed reactivity,
        //       or do I allow static values and ask to use callback only when reactivity needed?
        //       Trying to allow static for now and I'll see how it goes.
        ...children: WElementChildrenInput
    ) => WComponentNode;
};
