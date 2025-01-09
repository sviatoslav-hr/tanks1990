import {Transform} from '#/math/transform';
import {Vector2} from '#/math/vector';
import {Duration} from '#/math/duration';
import {Rect} from '#/math';
import {Renderer} from '#/renderer';

const ASSETS_URL = './assets';
// TODO: consider using a simpler data type for images instead of HTMLImageElement
const imageCache: Record<string, HTMLImageElement> = {};

export function getCachedImage(src: string): HTMLImageElement | undefined {
    return imageCache[src];
}

export function setCachedImage(src: string, image: HTMLImageElement): void {
    if (imageCache[src]) {
        console.warn(`WARN: overwriting cached image for "${src}"`);
    }
    imageCache[src] = image;
}

type SpriteOpts<K extends string> = {
    key: string;
    frameWidth: number;
    frameHeight: number;
    frameDuration?: Duration; // default 100
    states: {name: K; frames: number}[];
};

type SpriteState<K extends string> = {name: K; index: number; frames: number};
type SpriteStateMap<K extends string> = {[Key in K]: SpriteState<Key>};

export class Sprite<K extends string> {
    private frameIndex = 0;
    private animationDt = Duration.zero();
    private state?: SpriteState<K>;
    private readonly frameWidth: number = 0;
    private readonly frameHeight: number = 0;
    private readonly stateKeys: readonly K[];
    private readonly frameDuration = new Duration(100);
    private readonly image: HTMLImageElement;
    private readonly stateMap: SpriteStateMap<K>;

    constructor(opts: SpriteOpts<K>) {
        const {key, frameWidth, frameHeight, frameDuration, states} = opts;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        if (frameDuration) {
            this.frameDuration.setFrom(frameDuration);
        }
        const src = `${ASSETS_URL}/${key}.png`;
        const cached = getCachedImage(src);
        if (cached) {
            this.image = cached;
        } else {
            this.image = new Image();
            this.image.alt = key;
            this.image.src = src;
            setCachedImage(src, this.image);
        }
        this.stateMap = {} as SpriteStateMap<K>;
        for (const [index, {name, frames}] of states.entries()) {
            const state = {name, frames, index};
            if (!this.state) {
                this.state = state;
            }
            this.stateMap[name] = state;
        }
        this.stateKeys = states.map((s) => s.name);
    }

    update(dt: Duration): void {
        this.animationDt.add(dt);
        if (this.animationDt.isMoreThan(this.frameDuration)) {
            this.frameIndex++;
            this.animationDt.sub(this.frameDuration);
        }
        const maxFrames = this.state?.frames ?? 1;
        if (this.frameIndex > maxFrames - 1) this.frameIndex = 0;
    }

    draw(renderer: Renderer, boundary: Rect, rotationDeg = 0): void {
        if (!this.state) return;
        // NOTE: set origin at the center of tank for proper rotation
        const translation = new Vector2(
            boundary.x - renderer.camera.position.x + boundary.width / 2,
            boundary.y - renderer.camera.position.y + boundary.height / 2,
        );
        renderer.setTransform(Transform.makeTranslation(translation));
        renderer.rotate(rotationDeg);
        // NOTE: draw the image respecting the moved origin
        renderer.drawImage(
            this.image,
            this.frameWidth * this.frameIndex,
            this.state.index * this.frameHeight,
            this.frameWidth,
            this.frameHeight,
            -boundary.width / 2,
            -boundary.height / 2,
            boundary.width,
            boundary.height,
        );
        renderer.resetTransform();
        renderer.rotate(0);
    }

    selectState(state: K): void {
        this.state = this.stateMap[state];
        this.animationDt.milliseconds = 0;
        this.frameIndex = 0;
    }

    reset(): void {
        const stateKey = this.stateKeys[0];
        if (!stateKey) {
            console.warn(`WARN: no states found for sprite ${this.image.alt}`);
            return;
        }
        this.selectState(stateKey);
    }
}

export function createShieldSprite() {
    return new Sprite({
        key: 'shield',
        frameWidth: 64,
        frameHeight: 64,
        frameDuration: Duration.milliseconds(100),
        states: [{name: 'flowing', frames: 6}],
    });
}

export function createTankSprite(key: 'tank_yellow' | 'tank_green') {
    return new Sprite({
        key: key,
        frameWidth: 64,
        frameHeight: 64,
        frameDuration: Duration.milliseconds(100),
        states: [{name: 'moving', frames: 2}],
    });
}

export function createStaticSprite(
    opts: Omit<SpriteOpts<'static'>, 'states'>,
): Sprite<'static'> {
    const states = [{name: 'static', frames: 1} as const];
    return new Sprite({...opts, states});
}
