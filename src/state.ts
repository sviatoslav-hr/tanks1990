import { Tank } from "./entity";

type GameState = {
    tanks: Tank[];
};

export const STATE: GameState = { tanks: [] };
