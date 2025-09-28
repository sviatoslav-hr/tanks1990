import {Vector2} from '#/math/vector';

// PERF: It might not be the very efficient to use string every time to check
// if the button is pressed. Could be better to use a number even a number flag.
export type KeyCode =
    | 'KeyQ'
    | 'KeyW'
    | 'KeyR'
    | 'KeyA'
    | 'KeyS'
    | 'KeyD'
    | 'KeyF'
    | 'KeyC'
    | 'KeyV'
    | 'KeyB'
    | 'KeyI'
    | 'KeyO'
    | 'KeyP'
    | 'KeyU'
    | 'KeyH'
    | 'KeyL'
    | 'KeyJ'
    | 'KeyK'
    | 'KeyN'
    | 'KeyM'
    | 'Digit1'
    | 'Digit2'
    | 'Digit3'
    | 'Digit4'
    | 'Digit5'
    | 'Digit6'
    | 'Digit7'
    | 'Digit8'
    | 'Digit9'
    | 'Digit0'
    | 'Minus'
    | 'Equal'
    | 'Escape'
    | 'Space'
    | 'Backquote'
    | 'Semicolon'
    | 'Quote'
    | 'BracketLeft'
    | 'BracketRight'
    | 'Backslash'
    | 'Slash'
    | 'ShiftLeft'
    | 'ShiftRight'
    | 'ControlLeft'
    | 'ControlRight'
    | 'AltLeft'
    | 'AltRight'
    | 'MetaLeft'
    | 'ArrowLeft'
    | 'ArrowRight'
    | 'ArrowUp'
    | 'ArrowDown'
    | 'MouseLeft'
    | 'MouseMiddle'
    | 'MouseRight';

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
        return this.mouse.previousPosition.clone().sub(this.mouse.currentPosition);
    }

    getMouseWheelDelta(): number {
        return this.mouse.currentWheenDelta;
    }

    listen(element: HTMLElement, mouseElement: HTMLElement) {
        element.addEventListener('keydown', (ev) => {
            const code = ev.code as KeyCode;
            this.setPressed(code);
        });
        // FIXME: If between ticks happen both keydown and keyup events, the keypress will be missed
        element.addEventListener('keyup', (ev) => {
            const code = ev.code as KeyCode;
            this.setReleased(code);
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
            // NOTE: We need a specific element just in case there are other elements on top
            //       and we want mouse to be handled only for this specific element.
            const x = ev.clientX - mouseElement.offsetLeft;
            const y = ev.clientY - mouseElement.offsetTop;
            this.mouse.currentPosition
                .set(x, y)
                .max(0, 0)
                .min(mouseElement.offsetWidth, mouseElement.offsetHeight);
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
