import {effect} from '#/signals';

const DOCUMENT = window.document;

// Q: Should components have scoped css or screw it?

type WEachFn<T = unknown> = (
    children: T[],
    mapper: (value: T, index: number) => WChildInput,
) => WCollectionNode;

export interface WContext extends WElementCreationFnMap {
    each: WEachFn; // TODO: implement collections (variable amount of nodes)
    currentComponent: WComponentNode | null;
}

export interface WContextInput {
    createElement?: typeof createWElementDom;
    appendToElement?: typeof mountWElementToDom;
}

export function createWContext(input: WContextInput = {}): WContext {
    const createDom = input.createElement ?? createWElementDom;
    const appendDom = input.appendToElement ?? mountWElementToDom;

    function wrapCreateWElement<TTag extends keyof WElementCreationFnMap>(
        tag: TTag,
    ): (options?: WElementOptionsMap[TTag], ...children: WChildInput[]) => WElementNode {
        return (options, ...children) => {
            const element = createWElement<TTag>(tag, options);
            createDom(element);
            for (const child of resolveWElementChildren(children)) {
                appendDom(element, child);
                element.children.push(child);
            }
            return element;
        };
    }
    return {
        div: wrapCreateWElement('div'),
        h1: wrapCreateWElement('h1'),
        button: wrapCreateWElement('button'),
        span: wrapCreateWElement('span'),
        currentComponent: null,
        each: (data, mapper) => {
            const children = resolveWElementChildren(data.map(mapper));
            return {type: 'collection', children};
        },
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
    children: WChild[];
}

// TODO: Should this really be generic or just have a common options type?
export interface WElementNode<TTag extends WElementTag = WElementTag> {
    type: 'element';
    tag: TTag;
    options: WElementOptionsMap[TTag];
    children: WChild[];
}

export interface WPrimitiveNode {
    type: 'primitive';
    value: string | null;
}

export interface WCollectionNode {
    type: 'collection';
    children: WChild[];
}

export function wComponent<TProps extends object = {}, TChildren extends unknown[] = never[]>(
    render: WComponentRenderFn<TProps, TChildren>,
): WComponentCreateFn<TProps, TChildren> {
    return (ui, props, ...slotChildren) => {
        const prevComponent = ui.currentComponent;
        const component: WComponentNode = {type: 'component', children: []};
        ui.currentComponent = component;
        effect(() => {
            const rendered = render(ui, props, slotChildren);
            // component.children = Array.isArray(rendered) ? rendered : [rendered];
            const childrenToProcess = Array.isArray(rendered) ? rendered : [rendered];
            component.children = resolveWElementChildren(childrenToProcess);
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
type WPrimitive = string | number | null | undefined | boolean;
type WChild = WPrimitiveNode | WComponentNode | WElementNode;
export type WChildInput =
    | WPrimitive
    | WComponentNode
    | WElementNode
    | (() => WPrimitive | WComponentNode | WElementNode);

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

interface WElementDomInfo {
    domElement: HTMLElement;
    anchorElement: Comment;
}

const elementsDomMap = new WeakMap<WElementNode, WElementDomInfo>();

function createWElement<K extends keyof WElementCreationFnMap>(
    tag: K,
    options: WElementOptionsMap[K] | undefined,
): WElementNode {
    const element: WElementNode = {
        type: 'element' as const,
        tag: tag,
        options: options ?? {},
        children: [],
    };
    return element;
}

function createWElementDom(element: WElementNode): void {
    const domElement = DOCUMENT.createElement(element.tag);
    const anchorElement = DOCUMENT.createComment(`w-element/${element.tag}`);
    elementsDomMap.set(element, {domElement, anchorElement});
}

function mountWElementToDom(parent: WElementNode, child: WChild): void {
    const parentDomInfo = elementsDomMap.get(parent);
    if (!parentDomInfo) {
        logger.error('Dom info not found for tag %s', parent.tag);
        return;
    }
    switch (child.type) {
        case 'primitive': {
            if (child.value != null) {
                parentDomInfo.domElement.appendChild(new Text(child.value));
            }
            break;
        }
        case 'element': {
            const elementDomInfo = elementsDomMap.get(child);
            if (!elementDomInfo) {
                logger.error('Dom info not found for tag %s', child.tag);
                return;
            }
            parentDomInfo.domElement.appendChild(elementDomInfo.domElement);
            break;
        }
    }
}

function resolveWElementChildren(children: WChildInput[]): WChild[] {
    const results: WChild[] = [];
    for (let child of children) {
        if (typeof child === 'function') {
            child = child();
        }

        if (isWPrimitive(child)) {
            const str = WPrimitiveToDom(child);
            results.push({type: 'primitive', value: str});
            continue;
            // if
        }
        if (child.type === 'element') {
        }
        if (child.type === 'component') {
        }
    }
    return results;
}

function isWPrimitive(value: unknown): value is WPrimitive {
    return (
        value === null ||
        value === undefined ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    );
}

function WPrimitiveToDom(value: WPrimitive): string | null {
    if (value === null) return null;
    if (value === undefined) return null;
    if (typeof value === 'string') return value;
    return String(value);
}
