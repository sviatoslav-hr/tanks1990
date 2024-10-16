import { Context } from '../context';
import { Rect } from '../math';
import { assert } from '../utils';
import { getCachedImage, setCachedImage } from './sprite';

const EXPLOSION_IMAGE_PATH = './assets/kenney_particle-pack/scorch_01.png';

export function preloadEffectImages(): void {
    // TODO: handle possible errors?
    getExplosionImage();
}

function getExplosionImage(): HTMLImageElement {
    const cached = getCachedImage(EXPLOSION_IMAGE_PATH);
    if (cached) {
        return cached;
    }
    const image = new Image();
    image.src = EXPLOSION_IMAGE_PATH;
    image.alt = 'Explosion';
    setCachedImage(EXPLOSION_IMAGE_PATH, image);
    return image;
}

export class ExplosionEffect {
    // TODO: consider using a simpler data type for image instead of HTMLImageElement
    private explosionImage: HTMLImageElement;
    private animationTimeMS = 0;
    private animationProgress = 0;
    static readonly IMAGE_MAX_SCALE = 4;
    static readonly ANIMATION_DURATION_MS = 1000;

    private constructor(
        private boundary: Rect,
        private particles: Particle[],
    ) {
        this.explosionImage = getExplosionImage();
    }

    static fromImageData(
        image: ImageData,
        boundary: Rect,
        particleSize: number,
    ): ExplosionEffect | null {
        const { width, height } = boundary;
        assert(image.width === width);
        assert(image.height === height);
        const particles: Particle[] = [];
        // const cx = boundary.x + width / 2;
        // const cy = boundary.y + height / 2;
        const cx = boundary.x;
        const cy = boundary.y;
        for (let y = 0; y < height; y += particleSize) {
            for (let x = 0; x < width; x += particleSize) {
                const index = (y * width + x) * 4;
                const red = image.data[index];
                const green = image.data[index + 1];
                const blue = image.data[index + 2];
                const alpha = image.data[index + 3];
                if (
                    red == null ||
                    green == null ||
                    blue == null ||
                    alpha == null
                ) {
                    console.error(
                        'ERROR: Invalid image data. Cannot extract color components',
                    );
                    return null;
                }
                if (!alpha) continue;
                const color = `rgb(${red},${green},${blue})`;
                const particle = new Particle(
                    x + boundary.x,
                    y + boundary.y,
                    particleSize,
                    particleSize,
                    color,
                );
                if (particle.x - width / 2 < cx) particle.vx *= -1;
                if (particle.y - width / 2 < cy) particle.vy *= -1;
                particles.push(particle);
            }
        }
        boundary = {
            x: boundary.x,
            y: boundary.y,
            width: width,
            height: height,
        };
        return new ExplosionEffect(boundary, particles);
    }

    get isAnimationFinished(): boolean {
        return this.animationProgress >= 1;
    }

    draw(ctx: Context): void {
        ctx.setGlobalAlpha(1 - easeOut(this.animationProgress));
        this.drawExplosionImage(ctx);
        for (const p of this.particles) {
            p.draw(ctx);
        }
        ctx.setGlobalAlpha(1);
    }

    private drawExplosionImage(ctx: Context): void {
        if (!this.explosionImage.complete) {
            // TODO: preload image
            console.warn('WARN: Explosion image not loaded');
            return;
        }

        const imageScale =
            Math.min(easeOut(this.animationProgress) * 2, 1) *
            ExplosionEffect.IMAGE_MAX_SCALE;

        const xOffset =
            (this.boundary.width * imageScale - this.boundary.width) / 2;
        const yOffset =
            (this.boundary.height * imageScale - this.boundary.height) / 2;
        ctx.drawImage(
            this.explosionImage,
            0,
            0,
            this.explosionImage.width,
            this.explosionImage.height,
            this.boundary.x - xOffset,
            this.boundary.y - yOffset,
            this.boundary.width + xOffset * 2,
            this.boundary.height + yOffset * 2,
        );
    }

    update(dt: number): void {
        if (this.isAnimationFinished) {
            return;
        }
        this.animationTimeMS += dt;
        this.animationProgress =
            this.animationTimeMS / ExplosionEffect.ANIMATION_DURATION_MS;
        if (this.isAnimationFinished) {
            return;
        }
        for (const p of this.particles) {
            p.update(dt, this.animationProgress);
        }
    }
}

class Particle {
    vx: number;
    vy: number;
    velocityChangeLeftMS = Particle.VELOCITY_CHANGE_INTERVAL_MS;
    static readonly MAX_VELOCITY = 30;
    static readonly VELOCITY_CHANGE_INTERVAL_MS = 50;

    constructor(
        public x: number,
        public y: number,
        public width: number,
        public height: number,
        public color: string,
    ) {
        this.vx = Math.random() * Particle.MAX_VELOCITY;
        this.vy = Math.random() * Particle.MAX_VELOCITY;
    }

    draw(ctx: Context): void {
        ctx.setFillColor(this.color);
        ctx.drawRect(this.x, this.y, this.width, this.height);
    }

    update(dt: number, animationProgress: number): void {
        const friction = 1 - easeOut(animationProgress);
        this.x += this.vx * (dt / 1000) * friction;
        this.y += this.vy * (dt / 1000) * friction;
    }
}

function easeOut(t: number): number {
    return 1 - (1 - t) * (1 - t); // Basic quadratic ease-out
}
