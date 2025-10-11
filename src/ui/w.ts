import {effect} from '#/signals';

// Q: Should components have scoped css or screw it?

export interface WContext extends WElementCreationFnMap {
    currentComponent: WComponentNode | null;
}

export interface WContextInput {
    createElement?: typeof createWElement;
}

export function createWContext(input: WContextInput = {}): WContext {
    const createElement = input.createElement ?? createWElement;
    function wrapCreateWElement<TTag extends keyof WElementCreationFnMap>(
        tag: TTag,
    ): (options?: WElementOptionsMap[TTag], ...children: WChildInput[]) => WElementNode {
        return (options, ...children) => createElement<TTag>(tag, options, children);
    }
    return {
        div: wrapCreateWElement('div'),
        h1: wrapCreateWElement('h1'),
        button: wrapCreateWElement('button'),
        span: wrapCreateWElement('span'),
        currentComponent: null,
    };
}

type WComponentRenderFn<TProps extends object, TChildren extends unknown[]> = (
    ui: WContext,
    props: TProps,
    children: TChildren,
) => WChildInput | WChildInput[];

type WComponentCreateFn<TProps extends object, TChildren extends unknown[]> = (
    ui: WContext,
    props: TProps,
    ...children: TChildren
) => WComponentNode;

export interface WComponentNode {
    type: 'component';
    children: WChildInput[];
}

// TODO: Should this really be generic or just have a common options type?
export interface WElementNode<TTag extends WElementTag = WElementTag> {
    type: 'element';
    tag: TTag;
    options: WElementOptionsMap[TTag];
    children: WChildInput[]; // TODO: Should this just be WChild[]?
}

export function wComponent<TProps extends object = {}, TChildren extends unknown[] = never[]>(
    render: WComponentRenderFn<TProps, TChildren>,
): WComponentCreateFn<TProps, TChildren> {
    return (ui, props, ...children) => {
        const prevComponent = ui.currentComponent;
        const component: WComponentNode = {type: 'component', children: []};
        ui.currentComponent = component;
        effect(() => {
            const rendered = render(ui, props, children);
            component.children = Array.isArray(rendered) ? rendered : [rendered];
        });
        ui.currentComponent = prevComponent;
        return component;
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
type WPrimitive = string | number | null | undefined;
type WChild = WPrimitive | WComponentNode | WElementNode;
export type WChildInput = WChild | (() => WChild);

interface WElementOptionsMap {
    h1: WElementBasicOptions;
    div: WElementBasicOptions;
    button: WElementBasicOptions;
    span: WElementBasicOptions;
}

type WElementTag = keyof WElementCreationFnMap;

export type WElementCreationFnMap = {
    [K in keyof WElementOptionsMap]: (
        options?: WElementOptionsMap[K],
        // TODO: Do I enforce to use a callback and have guaranteed reactivity,
        //       or do I allow static values and ask to use callback only when reactivity needed?
        //       Trying to allow static for now and I'll see how it goes.
        ...children: WChildInput[]
    ) => WElementNode;
};

function createWElement<K extends keyof WElementCreationFnMap>(
    tag: K,
    options: WElementOptionsMap[K] | undefined,
    children: WChildInput[],
): WElementNode {
    return {type: 'element', tag: tag, options: options ?? {}, children};
}
