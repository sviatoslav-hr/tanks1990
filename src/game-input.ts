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
    | 'KeyJ'
    | 'Backquote'
    | 'Space'
    | 'Escape'
    | 'Semicolon'
    | 'BracketRight'
    | 'Backslash';
export type KeysState = Partial<Record<KeyCode, boolean>>;
export type KeyHandler = (event: Event, code: KeyCode) => void;

export class GameInput {
    private currentPressed: KeysState = {};
    private previousPressed: KeysState = {};
    private keydownHandlers: Partial<Record<KeyCode, KeyHandler[]>> = {};

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

    nextTick() {
        this.previousPressed = {...this.currentPressed};
    }

    // TODO: remove it, use isPressed()
    onKeydown(code: KeyCode, handler: KeyHandler): void {
        const handlers = this.keydownHandlers[code];
        if (handlers) {
            handlers.push(handler);
        } else {
            this.keydownHandlers[code] = [handler];
        }
    }

    listen(element: HTMLElement) {
        element.addEventListener('keydown', (ev) => {
            const code = ev.code as KeyCode;
            this.setPressed(code);
            for (const handler of this.keydownHandlers[code] ?? []) {
                handler(ev, code);
            }
        });
        element.addEventListener('keyup', (ev) =>
            this.setReleased(ev.code as KeyCode),
        );
    }

    private setPressed(code: KeyCode) {
        this.currentPressed[code] = true;
    }

    private setReleased(code: KeyCode) {
        this.currentPressed[code] = false;
    }
}
