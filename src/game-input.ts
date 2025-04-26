import {Vector2} from '#/math/vector';

export type KeyCode =
    | 'KeyQ'
    | 'KeyW'
    | 'KeyR'
    | 'KeyA'
    | 'KeyS'
    | 'KeyD'
    | 'KeyF'
    | 'KeyB'
    | 'KeyP'
    | 'KeyO'
    | 'KeyU'
    | 'KeyH'
    | 'KeyL'
    | 'KeyJ'
    | 'KeyK'
    | 'Backquote'
    | 'Space'
    | 'Escape'
    | 'Semicolon'
    | 'BracketRight'
    | 'Backslash'
    | 'Digit1'
    | 'Digit2'
    | 'Digit0'
    | 'MouseLeft'
    | 'MouseMiddle'
    | 'MouseRight'
    | 'ShiftLeft'
    | 'ControlLeft'
    | 'MetaLeft'
    | 'ArrowLeft'
    | 'ArrowRight'
    | 'ArrowUp'
    | 'ArrowDown';

export type KeysState = Partial<Record<KeyCode, boolean>>;
export type KeyHandler = (event: Event, code: KeyCode) => void;

export interface MouseState {
    currentPosition: Vector2;
    previousPosition: Vector2;
    currentWheenDelta: number;
    previousWheelDelta: number;
}

export class GameInput {
    private currentPressed: KeysState = {};
    private previousPressed: KeysState = {};
    private mouse: MouseState = {
        currentPosition: Vector2.zero(),
        previousPosition: Vector2.zero(),
        currentWheenDelta: 0,
        previousWheelDelta: 0,
    };

    isPressed(code: KeyCode): boolean {
        return !this.previousPressed[code] && !!this.currentPressed[code];
    }

    isDown(code: KeyCode): boolean {
        return !!this.currentPressed[code];
    }

    isReleased(code: KeyCode): boolean {
        return !!this.previousPressed[code] && !this.currentPressed[code];
    }

    isUp(code: KeyCode): boolean {
        return !this.currentPressed[code];
    }

    getMouseX(): number {
        return this.mouse.currentPosition.x;
    }

    getMouseY(): number {
        return this.mouse.currentPosition.y;
    }

    getMousePosition(): Vector2 {
        // WARN: This shouldn't be modified outside of the input class
        return this.mouse.currentPosition;
    }

    getMouseDelta(): Vector2 {
        return this.mouse.currentPosition.clone().sub(this.mouse.previousPosition);
    }

    getMouseWheelDelta(): number {
        return this.mouse.currentWheenDelta;
    }

    listen(element: HTMLElement, canvas: HTMLCanvasElement) {
        assert(canvas);

        element.addEventListener('keydown', (ev) => {
            const code = ev.code as KeyCode;
            this.setPressed(code);
        });
        element.addEventListener('keyup', (ev) => {
            this.setReleased(ev.code as KeyCode);
        });
        element.addEventListener('mousedown', (ev) => {
            switch (ev.button) {
                case 0:
                    this.setPressed('MouseLeft');
                    break;
                case 1:
                    this.setPressed('MouseMiddle');
                    break;
                case 2:
                    this.setPressed('MouseRight');
                    break;
            }
        });
        element.addEventListener('mouseup', (ev) => {
            switch (ev.button) {
                case 0:
                    this.setReleased('MouseLeft');
                    break;
                case 1:
                    this.setReleased('MouseMiddle');
                    break;
                case 2:
                    this.setReleased('MouseRight');
                    break;
            }
        });
        element.addEventListener('mousemove', (ev) => {
            const x = ev.clientX - canvas.offsetLeft;
            const y = ev.clientY - canvas.offsetTop;
            this.mouse.currentPosition
                .set(x, y)
                .max(0, 0)
                .min(canvas.offsetWidth, canvas.offsetHeight);
        });
        element.addEventListener('wheel', (ev) => {
            this.mouse.currentWheenDelta = ev.deltaY;
        });
    }

    nextTick() {
        this.previousPressed = {...this.currentPressed};
        this.mouse.previousPosition.setFrom(this.mouse.currentPosition);
        this.mouse.previousWheelDelta = this.mouse.currentWheenDelta;
        this.mouse.currentWheenDelta = 0;
    }

    private setPressed(code: KeyCode) {
        this.currentPressed[code] = true;
    }

    private setReleased(code: KeyCode) {
        this.currentPressed[code] = false;
    }
}
