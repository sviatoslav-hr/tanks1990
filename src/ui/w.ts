import {effect, type EffectDestroyFn, signal, Signal} from '#/signals';

// Q: Should components have scoped css or screw it?

type WProducerFn<T> = () => T;
type WProducerFnOr<T> = T | WProducerFn<T>;
type WRenderCollectionItemFn<T> = (item: T, index: number) => WRawChild;

function toProducerFn<T>(value: WProducerFnOr<T>): WProducerFn<T> {
    return typeof value === 'function' ? (value as WProducerFn<T>) : () => value;
}

export interface WContext extends WElementCreationFnMap {
    each: <T>(getItems: WProducerFnOr<T[]>, render: WRenderCollectionItemFn<T>) => WCollectionNode;
    // TODO: Hide the input field from the public API because it's not supposed to be used by the user.
    dom: WDom;
}

export interface WDom {
    createText: typeof createWTextDom;
    createElement: typeof createWElementDom;
    createAnchor: typeof createWAnchorDom;
}

const W_DOM_CONTEXT: WDom = Object.freeze({
    createText: createWTextDom,
    createElement: createWElementDom,
    createAnchor: createWAnchorDom,
});

export function createWContext(input: WDom = W_DOM_CONTEXT): WContext {
    function makeWElementCreatorByTag<TTag extends keyof WElementCreationFnMap>(
        tag: TTag,
    ): (
        attributes?: WElementAttributesMap[TTag],
        ...children: WProducerFnOr<WRawChild>[]
    ) => WElementNode {
        return (attributes, ...children) => {
            const element = input.createElement(tag);
            const node = makeWElementNode<TTag>(tag, element);
            if (attributes) {
                handleWElementAttributes(element, attributes as Record<string, unknown>);
            }
            mountWElementChildren(w, node, children);
            return node;
        };
    }
    const w: WContext = {
        h1: makeWElementCreatorByTag('h1'),
        h2: makeWElementCreatorByTag('h2'),
        h3: makeWElementCreatorByTag('h3'),
        h4: makeWElementCreatorByTag('h4'),
        h5: makeWElementCreatorByTag('h5'),
        h6: makeWElementCreatorByTag('h6'),
        div: makeWElementCreatorByTag('div'),
        ul: makeWElementCreatorByTag('ul'),
        ol: makeWElementCreatorByTag('ol'),
        li: makeWElementCreatorByTag('li'),
        span: makeWElementCreatorByTag('span'),
        code: makeWElementCreatorByTag('code'),
        button: makeWElementCreatorByTag('button'),
        label: makeWElementCreatorByTag('label'),
        input: makeWElementCreatorByTag('input'),
        each: (getItems, render) =>
            makeWCollectionNode<unknown>(getItems, render as WRenderCollectionItemFn<unknown>),
        dom: input,
    };
    return w;
}

type WComponentRenderFn<TProps, TChildren extends unknown[]> = (
    w: WContext,
    props: TProps,
    children: TChildren,
) => WProducerFnOr<WRawChild> | WProducerFnOr<WRawChild>[];

type WComponentCreateFn<TProps, TChildren extends unknown[]> = (
    props: TProps,
    ...children: TChildren
) => WComponentNode;

export interface WComponentNode {
    type: 'component';
    constructor: WComponentCreateFn<any, any>;
    render: WComponentRenderFn<any, any>;
    propsSignal: Signal<any>;
    slotChildren: unknown[];
    effectDestroys: (EffectDestroyFn | null)[];
    /** Anchor node is created right before mounting the component to the DOM, not during initialization */
    anchor: WDomChildNode | null;
    children: (WAnyNode | null)[];
}

// TODO: Should this really be generic or just have a common options type?
export interface WElementNode {
    type: 'element';
    tag: WElementTag;
    children: (WAnyNode | null)[];
    element: WDomElement;
}

export interface WTextNode {
    type: 'text';
    // TODO: This is probably since there is textContent in DOM node, do I need both?
    value: string;
    node: WDomChildNode;
}

export interface WCollectionNode<TItem = unknown> {
    type: 'collection';
    anchor: WDomChildNode | null;
    getItems: WProducerFnOr<TItem[]>;
    render: WRenderCollectionItemFn<TItem>;
    children: (WAnyNode | null)[];
}

// NOTE: All children for all element should be provided via a function call,
//       this way we can return this function for each signal update and we
//       know exactly what children should be re-evaluated.
export type WAnyNode = WTextNode | WComponentNode | WElementNode | WCollectionNode;

export type WChildrenInput = (WRawChild | WProducerFn<WRawChild>)[];

export type WRawChild =
    | WTextLike
    | WComponentNode
    | WElementNode
    | WCollectionNode
    | null
    | undefined;

export function wComponent<TProps = void, TChildren extends unknown[] = never[]>(
    render: WComponentRenderFn<TProps, TChildren>,
): WComponentCreateFn<TProps, TChildren> {
    const constructor: WComponentCreateFn<TProps, TChildren> = (props, ...slotChildren) => {
        const propsSignal = signal(props as TProps);
        const component: WComponentNode = {
            type: 'component',
            constructor,
            render: render,
            propsSignal,
            slotChildren,
            effectDestroys: [],
            children: [],
            anchor: null,
        };
        return component;
    };
    return constructor;
}

type WTextLike = string | number | boolean;

function isWTextLike(value: unknown): value is WTextLike {
    if (value == null) return false;
    const type = typeof value;
    return type === 'string' || type === 'number' || type === 'boolean';
}
export type WCssStyles = Omit<
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
>;

export interface WCssStyleInput extends Partial<WCssStyles> {
    [key: `--${string}`]: string | null | undefined;
}

type WClassValueDict = {[className: string]: boolean};
type WClassValue = string | WClassValueDict | (string | WClassValueDict)[];

export interface WElementBasicAttributes {
    id?: WProducerFnOr<string>;
    class?: WProducerFnOr<WClassValue>;
    style?: WProducerFnOr<WCssStyleInput>;
    title?: WProducerFnOr<string>;
    onclick?: (event: GlobalEventHandlersEventMap['click']) => void;
}

export interface WElementInputAttributes extends WElementBasicAttributes {
    type?: WProducerFnOr<string>;
    value?: WProducerFnOr<string | number | boolean>;
    name?: WProducerFnOr<string>;
    min?: WProducerFnOr<number>;
    max?: WProducerFnOr<number>;
    step?: WProducerFnOr<number>;
    oninput?: (event: GlobalEventHandlersEventMap['input']) => void;
}

export interface WElementLabelAttributes extends WElementBasicAttributes {
    for?: WProducerFnOr<string>;
}

export interface WElementAttributesMap {
    h1: WElementBasicAttributes;
    h2: WElementBasicAttributes;
    h3: WElementBasicAttributes;
    h4: WElementBasicAttributes;
    h5: WElementBasicAttributes;
    h6: WElementBasicAttributes;
    div: WElementBasicAttributes;
    ul: WElementBasicAttributes;
    ol: WElementBasicAttributes;
    li: WElementBasicAttributes;
    span: WElementBasicAttributes;
    code: WElementBasicAttributes;
    button: WElementBasicAttributes;
    input: WElementInputAttributes;
    label: WElementLabelAttributes;
}

type WElementTag = keyof WElementCreationFnMap;

export type WElementCreationFnMap = {
    [K in keyof WElementAttributesMap]: (
        attributes?: WElementAttributesMap[K],
        // TODO: Do I enforce to use a callback and have guaranteed reactivity,
        //       or do I allow static values and ask to use callback only when reactivity needed?
        //       Trying to allow static for now and I'll see how it goes.
        ...children: WChildrenInput
    ) => WElementNode;
};

function makeWElementNode<K extends keyof WElementCreationFnMap>(
    tag: K,
    element: WDomElement,
): WElementNode {
    const node: WElementNode = {
        type: 'element' as const,
        tag: tag,
        children: [],
        element: element,
    };
    return node;
}

function mountWElementChildren(
    w: WContext,
    parent: WElementNode,
    children: WProducerFnOr<WRawChild>[],
): void {
    parent.children = Array(children.length).fill(null);
    for (const [index, childOrFn] of children.entries()) {
        if (typeof childOrFn === 'function') {
            let prevChild: WAnyNode | null = null;
            effect(() => {
                const newChildRaw = childOrFn();
                const newChild = updateWChildAtIndex(w, parent, prevChild, newChildRaw, index);
                prevChild = newChild;
            });
        } else {
            updateWChildAtIndex(w, parent, null, childOrFn, index);
        }
    }
}

function wChildChanged(node: WAnyNode | null, rawUpdate: WRawChild): boolean {
    if (node === rawUpdate) return false;
    if (node == null && rawUpdate == null) return false;
    if (node == null || rawUpdate == null) return true;
    if (isWTextLike(rawUpdate)) {
        if (node.type !== 'text') return true;
        if (node.value !== String(rawUpdate)) return true;
        return false;
    }
    // NOTE: Assume there are node changes. In this is just an update for the same node, it should be handled accordingly.
    return true;
}

function isSameWComponent(component: WComponentNode, updatedComponent: WComponentNode): boolean {
    return component.constructor === updatedComponent.constructor;
}

// ------------- Collection ----------------

function makeWCollectionNode<TItem>(
    getItems: WProducerFnOr<TItem[]>,
    render: WRenderCollectionItemFn<TItem>,
): WCollectionNode<TItem> {
    const collection: WCollectionNode<TItem> = {
        type: 'collection',
        anchor: null,
        children: [],
        getItems,
        render,
    };
    return collection;
}

export function mountWComponent(w: WContext, component: WComponentNode, parent: WDomElement): void {
    if (component.anchor != null) {
        throw new Error('Component is already mounted');
    }
    const anchor = createWComponentDomAnchor(w.dom);
    component.anchor = anchor;
    parent.append(anchor);
    renderWComponent(w, component);
}

function mountWComponentBefore(
    w: WContext,
    component: WComponentNode,
    before: WDomChildNode,
): void {
    if (component.anchor != null) {
        throw new Error('Component is already mounted');
    }
    const anchor = createWComponentDomAnchor(w.dom);
    component.anchor = anchor;
    before.before(anchor);
    renderWComponent(w, component);
}

function renderWComponent(w: WContext, component: WComponentNode): void {
    const props = component.propsSignal();
    const rawChildren = toArray(component.render(w, props, component.slotChildren));

    for (let index = rawChildren.length; index < component.children.length; index++) {
        const destroyEffect = component.effectDestroys[index];
        destroyEffect?.();
        const prevChild = component.children[index];
        if (prevChild != null) {
            destroyWNode(prevChild, w.dom);
        }
    }
    component.children.length = rawChildren.length;
    component.effectDestroys.length = rawChildren.length;

    for (const [index, rawChildOrFn] of rawChildren.entries()) {
        const destroyPrevEffect = component.effectDestroys[index];
        destroyPrevEffect?.();
        if (typeof rawChildOrFn === 'function') {
            let prevChild = component.children[index] ?? null;
            const destroyEffect = effect(() => {
                const newChildRaw = rawChildOrFn();
                prevChild = updateWChildAtIndex(w, component, prevChild, newChildRaw, index);
            });
            component.effectDestroys[index] = destroyEffect;
        } else {
            const prevChild = component.children[index] ?? null;
            const newChild = updateWChildAtIndex(w, component, prevChild, rawChildOrFn, index);
            component.children[index] = newChild;
            component.effectDestroys[index] = null;
        }
    }
}

function updateWChildAtIndex(
    w: WContext,
    parent: WElementNode | WCollectionNode | WComponentNode,
    prevChild: WAnyNode | null,
    newChildRaw: WRawChild,
    index: number,
): WAnyNode | null {
    if (!wChildChanged(prevChild, newChildRaw)) return prevChild;
    if (
        isComponentNode(prevChild) &&
        isComponentNode(newChildRaw) &&
        isSameWComponent(prevChild, newChildRaw)
    ) {
        updateWComponent(w, prevChild, newChildRaw);
        parent.children[index] = prevChild;
        return prevChild;
    }
    // TODO/PERF: Handle changes to the same element node.
    // TODO/PERF: Handle changes to the same element collection node?
    //            (Not sure how that would work though, same source array maybe?)
    const newChild = createWChild(newChildRaw, w.dom);
    if (prevChild != null) {
        destroyWNode(prevChild, w.dom);
    }
    parent.children[index] = newChild;
    if (newChild != null) {
        switch (parent.type) {
            case 'element':
                mountWNodeInsideElement(w, parent, index, newChild);
                break;
            case 'collection':
            case 'component':
                mountWNodeBeforeParentAtIndex(w, parent, index, newChild);
                break;
        }
    }
    return newChild;
}

function updateWComponent(w: WContext, target: WComponentNode, source: WComponentNode): void {
    target.slotChildren = source.slotChildren;
    const nextProps = source.propsSignal();
    target.propsSignal.set(nextProps);
    renderWComponent(w, target);
}

function mountWCollection(w: WContext, collection: WCollectionNode, parent: WDomElement): void {
    if (collection.anchor != null) {
        throw new Error('Component is already mounted');
    }
    const anchor = createWCollectionDomAnchor(w.dom);
    collection.anchor = anchor;
    parent.append(anchor);
    mountWCollectionItems(w, collection);
}

function mountWCollectionBefore(
    w: WContext,
    collection: WCollectionNode,
    before: WDomChildNode,
): void {
    if (collection.anchor != null) {
        throw new Error('Component is already mounted');
    }
    const anchor = createWCollectionDomAnchor(w.dom);
    collection.anchor = anchor;
    before.before(anchor);
    mountWCollectionItems(w, collection);
}

function mountWCollectionItems(w: WContext, collection: WCollectionNode): void {
    const prevItems: unknown[] = [];
    let newItems: unknown[] = [];
    effect(() => {
        prevItems.length = 0;
        prevItems.push(...newItems);
        newItems = toProducerFn(collection.getItems)();
        // TODO/PERF: Instead of removing and adding, maybe just update in place where possible.
        const {addedItems, removedItems} = collectWCollectionItemsUpdate(prevItems, newItems);
        for (const removed of removedItems) {
            const child = collection.children[removed.index];
            assert(child);
            destroyWNode(child, w.dom);
            collection.children[removed.index] = null;
        }
        for (const added of addedItems) {
            // TODO: Add support for children to be produced via function for reactivity per child.
            const rawNode = collection.render(added.item, added.index);
            const prevChild = collection.children[added.index] ?? null;
            updateWChildAtIndex(w, collection, prevChild, rawNode, added.index);
        }
    });
}

interface WCollectionItem<TItem> {
    item: TItem;
    index: number;
}

export function collectWCollectionItemsUpdate<TItem>(
    prevItems: TItem[],
    newItems: TItem[],
): {
    addedItems: WCollectionItem<TItem>[];
    removedItems: WCollectionItem<TItem>[];
} {
    const addedItems: WCollectionItem<TItem>[] = [];
    const removedItems: WCollectionItem<TItem>[] = [];
    const maxLength = Math.max(prevItems.length, newItems.length);
    for (let index = 0; index < maxLength; index++) {
        const prev = prevItems[index];
        const curr = newItems[index];
        if (prev === curr) continue;

        if (prev != null) {
            removedItems.push({item: prev, index});
        }
        if (curr != null) {
            addedItems.push({item: curr, index});
        }
    }
    return {addedItems, removedItems};
}

// ---------------- DOM -------------------

// NOTE: WDom types are used instead of actual DOM types to simplify since I don't need full DOM API here.
//       Also, that means in tests I don't have to reimplement full DOM API.

export interface WDomNode {
    /** {@link Node#parentElement} */
    readonly parentElement: WDomElement | null;

    /** {@link Node#textContent} */
    textContent: string | null;
}

export interface WDomChildNode extends WDomNode {
    // NOTE: Cannot have these methods in the base node because `before` and `append` accept nodes,
    //       not child nodes... Sad.

    /** {@link ChildNode#before} */
    before(...nodes: (WDomNode | string)[]): void;

    /** {@link ChildNode#remove} */
    remove(): void;
}

export interface WDomStyles extends WCssStyles {
    /** {@link CSSStyleDeclaration#setProperty} */
    setProperty(property: string, value: string | null): void;
}

export interface WDomElement extends WDomChildNode {
    /** {@link Element#tagName} */
    readonly tagName: string;

    /** {@link Element#id} */
    id: string;

    /** {@link Element#className} */
    className: string;

    /** {@link HTMLElement#style} */
    style: WDomStyles;

    /** {@link ParentNode#appendChild} */
    append(...nodes: (WDomNode | string)[]): void;

    /** {@link GlobalEventHandlers#addEventListener} */
    addEventListener(event: string, listener: EventListener): void;

    /** {@link GlobalEventHandlers#removeEventListener} */
    removeEventListener(event: string, listener: EventListener): void;

    /** {@link Element#getAttribute} */
    getAttribute(qualifiedName: string): string | null;

    /** {@link Element#setAttribute} */
    setAttribute(qualifiedName: string, value: string): void;
}

function createWElementDom(tagName: string): WDomElement {
    const domElement = document.createElement(tagName);
    return domElement;
}

function createWTextDom(text: string): WDomChildNode {
    const node = document.createTextNode(text);
    return node;
}

function createWAnchorDom(description: string): WDomChildNode {
    const anchor = document.createComment(description);
    return anchor;
}

function getClosestWDomNode(node: WAnyNode): WDomChildNode {
    switch (node.type) {
        case 'text':
            return node.node;
        case 'element':
            return node.element;
        case 'component':
        case 'collection': {
            assert(node.anchor != null, 'Anchor DOM must be created to get node DOM');
            let closestChild: WAnyNode | null = null;
            for (const child of node.children) {
                if (child == null) continue;
                if (child.type === 'component' || child.type === 'collection') {
                    if (child.anchor == null) continue;
                }
                closestChild = child;
                break;
            }
            if (closestChild != null) return getClosestWDomNode(closestChild);
            return node.anchor;
        }
    }
}

function mountWNodeBeforeParentAtIndex(
    w: WContext,
    parent: WCollectionNode | WComponentNode,
    index: number,
    target: WAnyNode,
): void {
    assert(parent.anchor != null, 'Parent anchor must be available for mounting');
    let anchor: WAnyNode | null = null;
    if (index < parent.children.length - 1) {
        anchor = findNextAnchorNode(parent.children, index + 1, target);
    }
    const anchorNode = anchor ? getClosestWDomNode(anchor) : parent.anchor;
    assert(anchorNode.parentElement != null, 'Anchor node must have a parent element');
    switch (target.type) {
        case 'text': {
            anchorNode.before(target.node);
            break;
        }
        case 'element': {
            anchorNode.before(target.element);
            break;
        }
        case 'component': {
            mountWComponentBefore(w, target, anchorNode);
            break;
        }
        case 'collection': {
            mountWCollectionBefore(w, target, anchorNode);
            break;
        }
    }
}

function mountWNodeInsideElement(
    w: WContext,
    parent: WElementNode,
    index: number,
    targetNode: WAnyNode,
): void {
    let anchor: WAnyNode | null = null;
    if (index < parent.children.length - 1) {
        anchor = findNextAnchorNode(parent.children, index + 1, targetNode);
    }
    if (anchor != null) {
        switch (targetNode.type) {
            case 'text': {
                const anchorNode = getClosestWDomNode(anchor);
                assert(anchorNode.parentElement != null, 'Anchor node must have a parent element');
                anchorNode.before(targetNode.node);
                targetNode.node.before();
                break;
            }
            case 'element': {
                const anchorNode = getClosestWDomNode(anchor);
                assert(anchorNode.parentElement != null, 'Anchor node must have a parent element');
                anchorNode.before(targetNode.element);
                break;
            }
            case 'component': {
                mountWComponentBefore(w, targetNode, getClosestWDomNode(anchor));
                break;
            }
            case 'collection': {
                mountWCollectionBefore(w, targetNode, getClosestWDomNode(anchor));
                break;
            }
        }
        return;
    }
    switch (targetNode.type) {
        case 'text': {
            parent.element.append(targetNode.node);
            break;
        }
        case 'element': {
            parent.element.append(targetNode.element);
            break;
        }
        case 'component': {
            mountWComponent(w, targetNode, parent.element);
            break;
        }
        case 'collection': {
            mountWCollection(w, targetNode, parent.element);
            break;
        }
    }
}

function findNextAnchorNode(
    children: (WAnyNode | null)[],
    startIndex: number,
    ignoreNode: WAnyNode,
): WAnyNode | null {
    assert(startIndex >= 0 && startIndex < children.length);
    for (let i = startIndex; i < children.length; i++) {
        const child = children[i];
        if (child == null) continue;
        if (child === ignoreNode) continue;
        // NOTE: If component is not mounted yet, its anchor won't exist, so we skip it.
        if ((child.type === 'component' || child.type === 'collection') && child.anchor == null) {
            continue;
        }
        return child;
    }
    return null;
}

function createWComponentDomAnchor(input: WDom): WDomChildNode {
    return input.createAnchor('w/component');
}

function createWCollectionDomAnchor(input: WDom): WDomChildNode {
    return input.createAnchor('w/collection');
}

function createWChild(childInput: WRawChild, input: WDom): WAnyNode | null {
    if (childInput == null) return null;
    if (isWTextLike(childInput)) {
        // TODO: It's a bit confusing to only create dom node in this function for text nodes...
        //       Ideally, all nodes should be created in a similar way.
        const text = String(childInput);
        const domNode = input.createText(text);
        const node: WTextNode = {type: 'text', value: text, node: domNode};
        return node;
    }
    switch (childInput.type) {
        case 'element': {
            // NOTE: element dom is created during node creation.
            return childInput;
        }
        case 'component': {
            return childInput;
        }
        case 'collection': {
            return childInput;
        }
    }
}

function isComponentNode(value: unknown): value is WComponentNode {
    return Boolean(
        value && typeof value === 'object' && (value as WComponentNode).type === 'component',
    );
}

function destroyWNode(node: WAnyNode, dom: WDom): void {
    switch (node.type) {
        case 'text': {
            node.node.remove();
            node.node = undefined as any;
            break;
        }
        case 'element': {
            node.element.remove();
            node.element = undefined as any;
            break;
        }
        case 'component': {
            cleanupWComponentEffects(node);
            for (const child of node.children) {
                if (child == null) continue;
                destroyWNode(child, dom);
            }
            node.anchor?.remove();
            node.anchor = null;
            break;
        }
        case 'collection': {
            for (const child of node.children) {
                if (child == null) continue;
                destroyWNode(child, dom);
            }
            node.anchor?.remove();
            node.anchor = null;
            break;
        }
    }
}

function cleanupWComponentEffects(component: WComponentNode): void {
    if (!component.effectDestroys?.length) return;
    for (const cleanup of component.effectDestroys) {
        cleanup?.();
    }
    component.effectDestroys.length = 0;
}

function handleWElementAttributes(node: WDomElement, attributes: Record<string, unknown>): void {
    for (const [key, valueOrFn] of Object.entries(attributes)) {
        // NOTE: Make sure to not mistreat event handlers as producer functions.
        if (!key.startsWith('on') && typeof valueOrFn === 'function') {
            let prevValue: unknown | null = null;
            effect(() => {
                const newValue = (valueOrFn as WProducerFn<unknown>)();
                if (newValue === prevValue) return;
                applyAttributeChangeToWElement(node, key, newValue, prevValue);
                prevValue = newValue;
            });
        } else {
            applyAttributeChangeToWElement(node, key, valueOrFn, null);
        }
    }
}

function applyAttributeChangeToWElement(
    node: WDomElement,
    optionsKey: string,
    newValue: unknown,
    prevValue: unknown | null,
): void {
    switch (optionsKey) {
        case 'class': {
            assert(
                Array.isArray(newValue) ||
                    typeof newValue === 'object' ||
                    typeof newValue === 'string',
            );
            applyWClassValueToDom(node, newValue as WClassValue);
            return;
        }
        case 'style': {
            assert(typeof newValue === 'object');
            applyWStyleValueToDom(
                node,
                newValue as WCssStyleInput,
                prevValue as WCssStyleInput | null,
            );
            return;
        }
    }
    if (
        typeof newValue === 'string' ||
        typeof newValue === 'number' ||
        typeof newValue === 'boolean'
    ) {
        node.setAttribute(optionsKey, String(newValue));
        return;
    }
    // NOTE: All expected event names start with lowercase, so skip if it's uppercase.
    if (optionsKey.startsWith('on') && optionsKey.length > 2 && isLowerCase(optionsKey[2]!)) {
        const eventName = optionsKey.substring(2);
        if (newValue !== prevValue && prevValue != null) {
            assert(typeof prevValue === 'function');
            node.removeEventListener(eventName, prevValue as EventListener);
        }
        if (newValue) {
            assert(typeof newValue === 'function');
            node.addEventListener(eventName, newValue as EventListener);
        }
        return;
    }
    logger.error('Unsupported WElement attribute key/value: %s=%o', optionsKey, newValue);
}

function applyWClassValueToDom(element: WDomElement, newClass: WClassValue): void {
    if (newClass == null) {
        element.className = '';
        return;
    }
    // TODO/PERF: Instead of overriding the entire className, figure out what changed and only add/remove those classes, so that classes added manually still stay.
    const classNames: string[] = [];
    if (typeof newClass === 'string') {
        classNames.push(newClass);
    } else if (Array.isArray(newClass)) {
        for (const classItem of newClass) {
            if (typeof classItem === 'string') {
                classNames.push(classItem);
            } else {
                for (const [key, value] of Object.entries(classItem)) {
                    if (value) classNames.push(key);
                }
            }
        }
    } else {
        for (const [key, value] of Object.entries(newClass)) {
            if (value) classNames.push(key);
        }
    }
    const classNamesSet = new Set(classNames.flatMap((c) => c.split(' ')));
    element.className = Array.from(classNamesSet).join(' ');
}

function applyWStyleValueToDom(
    element: WDomElement,
    newStyle: WCssStyleInput,
    prevStyle: WCssStyleInput | null,
): void {
    if (prevStyle) {
        for (const key of Object.keys(prevStyle) as (keyof WCssStyleInput)[]) {
            if (newStyle[key] == null) {
                newStyle[key] = '';
            }
        }
    }
    for (const pair of Object.entries(newStyle)) {
        const key = pair[0] as keyof WCssStyles;
        const value = pair[1] as WCssStyles[typeof key];
        if (key?.startsWith('--')) {
            element.style.setProperty(key, value); // css variables
        } else {
            // NOTE: Non-variables should be set this way because 'setProperty' uses kebab-case.
            element.style[key] = value;
        }
    }
}

function toArray<T>(value: T | T[]): T[] {
    return Array.isArray(value) ? value : [value];
}

function isLowerCase(char: string): boolean {
    const code = char.charCodeAt(0);
    return code >= 97 && code <= 122;
}
