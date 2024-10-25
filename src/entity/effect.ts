import { Context } from '../context';
import { Rect, clamp } from '../math';
import { Vector2 } from '../math/vector';
import { assert } from '../utils';
import { getCachedImage, setCachedImage } from './sprite';
import {Duration} from "../math/duration.ts";

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
    private animationTime = Duration.zero();
    private animationProgress = 0;
    static readonly IMAGE_MAX_SCALE = 4;
    static readonly ANIMATION_DURATION = Duration.milliseconds(1000);

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
        assert(image.width === boundary.width);
        assert(image.height === boundary.height);

        const particles: Particle[] = [];
        for (let y = 0; y < boundary.height; y += particleSize) {
            for (let x = 0; x < boundary.width; x += particleSize) {
                const index = (y * boundary.width + x) * 4;
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
                if (!alpha || alpha < 0) continue;

                let color: string | undefined;
                if (alpha < 255) {
                    color = `rgba(${red},${green},${blue},${alpha / 255})`;
                } else {
                    color = `rgb(${red},${green},${blue})`;
                }
                const particle = new Particle(
                    new Vector2(x, y).add(boundary),
                    new Vector2(particleSize, particleSize),
                    color,
                    boundary,
                );
                particles.push(particle);
            }
        }
        let neParticles = 0;
        let nwParticles = 0;
        let swParticles = 0;
        let seParticles = 0;
        const cx = boundary.x + boundary.width / 2;
        const cy = boundary.y + boundary.height / 2;
        for (const p of particles) {
            if (p.destination.x > cx && p.destination.y > cy) {
                seParticles++;
            } else if (p.destination.x > cx && p.destination.y < cy) {
                neParticles++;
            } else if (p.destination.x < cx && p.destination.y > cy) {
                swParticles++;
            } else {
                nwParticles++;
            }
        }
        console.log(
            `Explosion particles: NE=${neParticles}, NW=${nwParticles}, SW=${swParticles}, SE=${seParticles}`,
        );
        return new ExplosionEffect(boundary, particles);
    }

    get isAnimationFinished(): boolean {
        return this.animationProgress >= 1;
    }

    draw(ctx: Context): void {
        ctx.setGlobalAlpha(1 - easeOut2(this.animationProgress));
        for (const p of this.particles) {
            p.draw(ctx);
        }
        this.drawExplosionImage(ctx);
        ctx.setGlobalAlpha(1);
    }

    private drawExplosionImage(ctx: Context): void {
        if (!this.explosionImage.complete) {
            console.warn('WARN: Explosion image not loaded');
            return;
        }

        const imageScale =
            Math.min(easeOut2(this.animationProgress) * 2, 1) *
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

    update(dt: Duration): void {
        if (this.isAnimationFinished) {
            return;
        }
        this.animationTime.add(dt);
        this.animationProgress = clamp(
            this.animationTime.milliseconds / ExplosionEffect.ANIMATION_DURATION.milliseconds,
            0,
            1,
        );
        if (this.isAnimationFinished) {
            return;
        }
        for (const p of this.particles) {
            p.update(this.animationProgress);
        }
    }
}

class Particle {
    public readonly destination: Vector2;
    public initialPosition: Vector2;

    constructor(
        public readonly position: Vector2,
        public readonly size: Vector2,
        public readonly color: string,
        boundary: Rect,
    ) {
        this.initialPosition = position.clone();
        const boundaryCenter = new Vector2(boundary.width, boundary.height)
            .divideScalar(2)
            .add(boundary);
        const travelDistance = new Vector2(
            boundary.width / 2,
            boundary.height / 2,
        );
        travelDistance.multiply({ x: Math.random(), y: Math.random() });
        this.destination = position
            .clone()
            .sub(boundaryCenter)
            .normalize()
            .multiply(travelDistance)
            .add(position);
    }

    draw(ctx: Context): void {
        ctx.setFillColor(this.color);
        ctx.drawRect(
            this.position.x,
            this.position.y,
            this.size.width,
            this.size.height,
        );
    }

    update(animationProgress: number): void {
        const distance = this.destination
            .clone()
            .sub(this.initialPosition)
            .multiplyScalar(easeOut2(animationProgress));
        this.position.setFrom(distance.add(this.initialPosition));
    }
}

// TODO: move to a separate file
function easeOut2(t: number): number {
    return easeOut(easeOut(t));
    // return 1 - Math.pow(1 - t, 3); // Cubic ease-out, end slow
}

function easeOut(t: number): number {
    return 1 - (1 - t) * (1 - t); // Basic quadratic ease-out, end slow
}
