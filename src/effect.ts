import { Animation, easeOut2 } from '#/animation';
import { Rect } from '#/math';
import { Duration } from '#/math/duration';
import { Vector2 } from '#/math/vector';
import { Renderer } from '#/renderer';
import { getCachedImage, setCachedImage } from '#/renderer/sprite';
import { assert } from '#/utils';

const EXPLOSION_IMAGE_PATH = './assets/scorch.png';

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
    static readonly IMAGE_MAX_SCALE = 4;
    static readonly ANIMATION_DURATION = Duration.milliseconds(1500);

    // TODO: consider using a simpler data type for image instead of HTMLImageElement
    private explosionImage: HTMLImageElement;
    readonly animation = new Animation(ExplosionEffect.ANIMATION_DURATION, easeOut2);

    private constructor(
        public boundary: Rect,
        private particles: Particle[],
        private sourceImageData: ImageData,
    ) {
        this.explosionImage = getExplosionImage();
    }

    static fromImageData(image: ImageData, boundary: Rect): ExplosionEffect {
        const particles = ExplosionEffect.generateParticles(image, boundary);
        return new ExplosionEffect(boundary, particles, image);
    }

    private static generateParticles(image: ImageData, boundary: Rect): Particle[] {
        assert(boundary.width > 0);
        assert(boundary.height > 0);

        const xScale = image.width / boundary.width;
        const yScale = image.height / boundary.height;
        const scale = Math.min(xScale, yScale);
        // NOTE: Take 1/16 of the boundary width as a particle size
        //       because sprite image has 16 actual pixels
        const particleSize = (boundary.width * scale) / 16;
        const particles: Particle[] = [];
        for (let y = 0; y < image.height; y += particleSize) {
            const yr = Math.floor(y);
            for (let x = 0; x < image.width; x += particleSize) {
                // NOTE: Generate only 40% of particles for performance reasons, randomly picked.
                if (Math.random() > 0.6) continue;
                const xr = Math.floor(x);
                const index = (yr * image.width + xr) * 4;
                const red = image.data[index];
                const green = image.data[index + 1];
                const blue = image.data[index + 2];
                const alpha = image.data[index + 3];
                assert(
                    red != null && green != null && blue != null && alpha != null,
                    'Invalid image data. Cannot extract color components',
                );
                if (!alpha || alpha < 0) continue;

                let color: string | undefined;
                if (alpha < 255) {
                    color = `rgba(${red},${green},${blue},${alpha / 255})`;
                } else {
                    color = `rgb(${red},${green},${blue})`;
                }
                const particle = new Particle(
                    new Vector2(x / xScale, y / yScale).add(boundary),
                    new Vector2(particleSize / scale, particleSize / scale),
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

        return particles;
    }

    draw(renderer: Renderer): void {
        if (this.animation.finished) {
            logger.warn('Trying to draw finished explosion effect');
            return;
        }
        renderer.setGlobalAlpha(1 - this.animation.progress);
        this.drawExplosionImage(renderer);
        for (const p of this.particles) {
            p.draw(renderer);
        }
        renderer.setGlobalAlpha(1);
    }

    private drawExplosionImage(renderer: Renderer): void {
        if (!this.explosionImage.complete) {
            logger.warn('Explosion image not loaded');
            return;
        }

        const imageScale =
            Math.min(this.animation.progress * 2, 1) * ExplosionEffect.IMAGE_MAX_SCALE;

        const xOffset = (this.boundary.width * imageScale - this.boundary.width) / 2;
        const yOffset = (this.boundary.height * imageScale - this.boundary.height) / 2;
        renderer.drawImage(
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
        if (this.animation.finished) {
            return;
        }
        this.animation.update(dt);
        for (const p of this.particles) {
            p.update(this.animation.progress);
        }
    }

    clone(boundary: Rect = this.boundary): ExplosionEffect {
        const particles = ExplosionEffect.generateParticles(this.sourceImageData, boundary);
        const clone = new ExplosionEffect(boundary, particles, this.sourceImageData);
        clone.animation.progress = 0;
        return clone;
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
        const travelDistance = new Vector2(boundary.width / 2, boundary.height / 2);
        travelDistance.multiply({x: Math.random(), y: Math.random()});
        this.destination = position
            .clone()
            .sub(boundaryCenter)
            .normalize()
            .multiply(travelDistance)
            .add(position);
    }

    draw(renderer: Renderer): void {
        renderer.setFillColor(this.color);
        renderer.fillRect(this.position.x, this.position.y, this.size.width, this.size.height);
    }

    update(animationProgress: number): void {
        const distance = this.destination
            .clone()
            .sub(this.initialPosition)
            .multiplyScalar(animationProgress);
        this.position.setFrom(distance.add(this.initialPosition));
    }
}
