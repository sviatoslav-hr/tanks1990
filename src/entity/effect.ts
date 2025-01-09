import {Rect} from '#/math';
import {Vector2} from '#/math/vector';
import {assert} from '#/utils';
import {getCachedImage, setCachedImage} from '#/entity/sprite';
import {Duration} from '#/math/duration';
import {Animation, easeOut2} from '#/animation';
import {Renderer} from '#/renderer';

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
    readonly animation = new Animation(
        ExplosionEffect.ANIMATION_DURATION,
        easeOut2,
    );
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
    ): ExplosionEffect {
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
                assert(
                    red != null &&
                        green != null &&
                        blue != null &&
                        alpha != null,
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
        return new ExplosionEffect(boundary, particles);
    }

    draw(renderer: Renderer): void {
        renderer.setGlobalAlpha(1 - this.animation.progress);
        this.drawExplosionImage(renderer);
        for (const p of this.particles) {
            p.draw(renderer);
        }
        renderer.setGlobalAlpha(1);
    }

    private drawExplosionImage(renderer: Renderer): void {
        if (!this.explosionImage.complete) {
            console.warn('WARN: Explosion image not loaded');
            return;
        }

        const imageScale =
            Math.min(this.animation.progress * 2, 1) *
            ExplosionEffect.IMAGE_MAX_SCALE;

        const xOffset =
            (this.boundary.width * imageScale - this.boundary.width) / 2;
        const yOffset =
            (this.boundary.height * imageScale - this.boundary.height) / 2;
        renderer.drawImage(
            this.explosionImage,
            0,
            0,
            this.explosionImage.width,
            this.explosionImage.height,
            this.boundary.x - xOffset - renderer.camera.position.x,
            this.boundary.y - yOffset - renderer.camera.position.y,
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
        renderer.drawRect(
            this.position.x - renderer.camera.position.x,
            this.position.y - renderer.camera.position.y,
            this.size.width,
            this.size.height,
        );
    }

    update(animationProgress: number): void {
        const distance = this.destination
            .clone()
            .sub(this.initialPosition)
            .multiplyScalar(animationProgress);
        this.position.setFrom(distance.add(this.initialPosition));
    }
}
