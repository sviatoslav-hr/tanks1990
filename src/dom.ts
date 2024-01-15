import { Opt } from "./option";

export function querySelector<K extends keyof HTMLElementTagNameMap>(
    selectors: K,
): Opt<HTMLElementTagNameMap[K]>;
export function querySelector<K extends keyof SVGElementTagNameMap>(
    selectors: K,
): Opt<SVGElementTagNameMap[K]>;
export function querySelector<K extends keyof MathMLElementTagNameMap>(
    selectors: K,
): Opt<MathMLElementTagNameMap[K]>;
export function querySelector<E extends Element = Element>(
    selectors: string,
): Opt<E>;
export function querySelector(selectors: string): Opt<Element> {
    return Opt.from(document.querySelector(selectors));
}
