import {fmod, Rect} from '#/math';
import {Duration} from '#/math/duration';
import {Transform} from '#/math/transform';
import {Vector2} from '#/math/vector';
import {Renderer} from '#/renderer';

const ASSETS_URL = './assets';
// TODO: consider using a simpler data type for images instead of HTMLImageElement
const imageCache: Record<string, HTMLImageElement> = {};

export function getCachedImage(src: string): HTMLImageElement | undefined {
    return imageCache[src];
}

export function setCachedImage(src: string, image: HTMLImageElement): void {
    if (imageCache[src]) {
        logger.warn('Overwriting cached image for "%s"', src);
    }
    imageCache[src] = image;
}

type SpriteOpts<K extends string> = {
    key: string;
    colorOverlay?: string;
    offsetX?: number;
    offsetY?: number;
    framePadding?: number;
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
    private loaded = false;
    private state?: SpriteState<K>;
    readonly frameWidth: number;
    readonly frameHeight: number;
    readonly framePadding: number;
    private readonly offset: Vector2;
    private readonly stateKeys: readonly K[];
    private readonly frameDuration = new Duration(100);
    private readonly image: HTMLImageElement;
    private readonly stateMap: SpriteStateMap<K>;

    constructor(opts: SpriteOpts<K>) {
        const {key, frameWidth, frameHeight, frameDuration, states} = opts;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.framePadding = opts.framePadding ?? 0;
        if (frameDuration) {
            this.frameDuration.setFrom(frameDuration);
        }
        const src = `${ASSETS_URL}/${key}.png`;
        const cached = getCachedImage(src);
        if (cached) {
            this.image = cached;
            this.loaded = this.image.complete;
        } else {
            this.image = new Image();
            this.image.alt = `Asset ${key}`;
            this.image.src = src;
            setCachedImage(src, this.image);
        }
        if (!this.image.complete) {
            const self = this;
            const prevOnload = this.image.onload;
            this.image.onload = function (...args) {
                self.loaded = true;
                prevOnload?.call(this, ...args);
            };
            const prevOnerror = this.image.onerror;
            this.image.onerror = function (...args) {
                if (!cached) logger.error('Failed to load asset "%s"', key);
                self.loaded = false;
                prevOnerror?.call(this, ...args);
            };
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
        this.offset = new Vector2(opts.offsetX ?? 0, opts.offsetY ?? 0);
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
        if (!this.loaded) return;
        if (!renderer.camera.isRectVisible(boundary)) return;
        const alreadyInCameraCoords = renderer.usingCameraCoords;
        if (!alreadyInCameraCoords) renderer.useCameraCoords(true); // NOTE: It's easier to rotate in camera coords
        // NOTE: Set origin at the center of tank since it's easier to rotate that way.
        const boundaryCenterX = boundary.x + boundary.width / 2;
        const boundaryCenterY = boundary.y + boundary.height / 2;
        const translation = new Vector2(
            boundaryCenterX -
                renderer.camera.worldOffset.x +
                renderer.camera.screenSize.width / 2 / renderer.camera.scale,
            boundaryCenterY -
                renderer.camera.worldOffset.y +
                renderer.camera.screenSize.height / 2 / renderer.camera.scale,
        );
        renderer.setTransform(Transform.makeTranslation(translation).scale(renderer.camera.scale));
        renderer.rotate(rotationDeg);
        try {
            let fx = this.frameWidth * this.frameIndex + this.offset.x + this.framePadding;
            let fy = this.state.index * this.frameHeight + this.offset.y + this.framePadding;
            let fw = this.frameWidth - this.framePadding * 2;
            let fh = this.frameHeight - this.framePadding * 2;
            const isHorizontal = fmod(rotationDeg, 180) === 90;
            let dx = -boundary.width / 2;
            let dy = -boundary.height / 2;
            let dw = boundary.width;
            let dh = boundary.height;
            if (isHorizontal) {
                dx = -boundary.height / 2;
                dy = -boundary.width / 2;
                dw = boundary.height;
                dh = boundary.width;
            }
            renderer.drawImage(this.image, fx, fy, fw, fh, dx, dy, dw, dh);
        } catch (e) {
            assert(false);
        }
        renderer.resetTransform();
        renderer.rotate(0);
        if (!alreadyInCameraCoords) renderer.useCameraCoords(false);
    }

    selectState(state: K): void {
        this.state = this.stateMap[state];
        this.animationDt.milliseconds = 0;
        this.frameIndex = 0;
    }

    reset(): void {
        const stateKey = this.stateKeys[0];
        if (!stateKey) {
            logger.warn('No states found for sprite %s', this.image.alt);
            return;
        }
        this.selectState(stateKey);
    }
}

export function createShieldSprite(type: 'player' | 'enemy') {
    const key = type === 'player' ? 'shield6_blue' : 'shield6_red';
    return new Sprite({
        key: key,
        frameWidth: 64,
        frameHeight: 64,
        framePadding: 0,
        frameDuration: Duration.milliseconds(100),
        states: [{name: 'anim', frames: 6}],
    });
}

export function createStaticSprite(opts: Omit<SpriteOpts<'static'>, 'states'>): Sprite<'static'> {
    const states = [{name: 'static', frames: 1} as const];
    return new Sprite({...opts, states});
}
