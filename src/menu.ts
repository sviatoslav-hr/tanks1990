import { GameStatus } from "./game";

enum MenuState {
    HIDDEN = "hidden",
    START = "start",
    PAUSE = "pause",
    DEAD = "dead",
}

type MenuClickCallback = () => void;

// TODO: should this be a WebComponent?
export class Menu {
    private state: MenuState = MenuState.START;

    constructor(private element: HTMLElement) {
        if (!element) {
            throw new Error("Menu expect an html element to initialize");
        }
        this.onButtonClick(() => {
            if (this.state === MenuState.HIDDEN) {
                this.button?.blur();
            } else {
                this.hide();
            }
        });
    }

    private get button(): HTMLButtonElement | null {
        const button = this.element.querySelector<HTMLButtonElement>("button");
        if (!button) {
            console.warn("Cannot find menu button");
        }
        return button;
    }

    showMain(): void {
        this.update(MenuState.START);
    }

    hide(): void {
        this.update(MenuState.HIDDEN);
    }

    showPause(): void {
        this.update(MenuState.PAUSE);
    }

    showDead(): void {
        this.update(MenuState.DEAD);
    }

    onButtonClick(callback: MenuClickCallback): void {
        this.button?.addEventListener("click", callback);
    }

    updateByGame(status: GameStatus): void {
        switch (status) {
            case GameStatus.START:
                this.showMain();
                break;
            case GameStatus.PLAYING:
                this.hide();
                break;
            case GameStatus.PAUSED:
                this.showPause();
                break;
            case GameStatus.DEAD:
                this.showDead();
                break;
            default:
                console.warn("Unexpected status ", status);
        }
    }

    private update(state: MenuState): void {
        this.element.className = state;
        this.focusButton(state);
    }

    private focusButton(state: MenuState): void {
        if (state == MenuState.HIDDEN) return;
        // TODO: each state should have it's own group of buttons and header
        this.button?.focus();
    }
}
