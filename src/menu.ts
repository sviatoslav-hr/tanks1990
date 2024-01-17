import { Game } from "./game";

enum MenuState {
    HIDDEN = "hidden",
    START = "start",
    PAUSE = "pause",
    DEAD = "dead",
}

type MenuClickCallback = (button: MenuButton) => void;

class MenuButton extends HTMLElement {
    private buttonEl: HTMLButtonElement;
    constructor(
        text: string,
        onClick: MenuClickCallback,
        public states: MenuState[],
    ) {
        super();
        this.buttonEl = document.createElement("button");
        this.append(this.buttonEl);
        this.buttonEl.append(text);
        this.buttonEl.classList.add("button");
        this.buttonEl.tabIndex = 1;
        this.buttonEl.addEventListener("click", () => onClick(this));
    }

    focus(options?: FocusOptions): void {
        this.buttonEl.focus(options);
    }

    blur(): void {
        this.buttonEl.blur();
    }
}

export function initMenu(menu: Menu, game: Game): void {
    menu.addButton(
        "New Game",
        () => {
            game.start();
            menu.hide();
        },
        [MenuState.START],
    );
    menu.addButton(
        "Resume",
        () => {
            game.resume();
            menu.hide();
        },
        [MenuState.PAUSE],
    );
    menu.addButton(
        "Restart",
        () => {
            game.start();
            menu.hide();
        },
        [MenuState.DEAD],
    );
    menu.addButton(
        "Main menu",
        () => {
            game.init();
            menu.showMain();
        },
        [MenuState.PAUSE, MenuState.DEAD],
    );
}

export class Menu extends HTMLElement {
    private state: MenuState = MenuState.START;
    private heading: HTMLHeadingElement;
    private buttonContainer: HTMLElement;
    private buttons: MenuButton[] = [];

    constructor() {
        super();
        this.classList.add("menu");
        this.heading = document.createElement("h2");
        this.append(this.heading);
        this.buttonContainer = document.createElement("div");
        this.buttonContainer.classList.add("flex-col");
        this.append(this.buttonContainer);
        this.buttonContainer.append(...this.buttons);
    }

    get dead(): boolean {
        return this.state === MenuState.DEAD;
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

    addButton(
        text: string,
        onClick: MenuClickCallback,
        states: MenuState[],
    ): void {
        const button = new MenuButton(
            text,
            this.createButtonCallback(onClick),
            states,
        );
        this.buttons.push(button);
        this.buttonContainer.append(button);
    }

    private update(state: MenuState): void {
        this.state = state;
        if (state === MenuState.HIDDEN) {
            this.hidden = true;
            return;
        } else {
            this.hidden = false;
        }
        this.setHeadingByState(state);
        let focused = false;
        for (const button of this.buttons) {
            button.hidden = !button.states.includes(state);
            if (!focused && !button.hidden) {
                focused = true;
                button.focus();
            }
        }
    }

    private createButtonCallback(
        callback: MenuClickCallback,
    ): MenuClickCallback {
        return (button) => {
            if (this.state === MenuState.HIDDEN) {
                button.blur();
                this.hide();
            }
            callback(button);
        };
    }

    private setHeadingByState(state: MenuState): void {
        if (state === MenuState.DEAD) {
            this.heading.classList.add("text-red");
        } else {
            this.heading.classList.remove("text-red");
        }
        switch (state) {
            case MenuState.HIDDEN:
                return;
            case MenuState.START:
                return this.setHeading("Tanks 1990");
            case MenuState.PAUSE:
                return this.setHeading("Paused");
            case MenuState.DEAD:
                return this.setHeading("You are dead");
        }
    }

    private setHeading(text: string): void {
        this.heading.textContent = text;
    }
}

customElements.define("game-menu", Menu);
customElements.define("game-menu-button", MenuButton);
