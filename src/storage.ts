const BEST_SCORE_KEY = "best_score";
const BEST_SCORE_AT_KEY = "best_score_at";
const SHOW_FPS_KEY = "show_fps";
const SHOW_BOUNDARIES = "show_boundaries";

type ScoreRecord = {
    score: number;
    createdAt: Date;
};

export function saveBestScore(storage: Storage, score: number): void {
    const storedScore = Number(storage.getItem(BEST_SCORE_KEY));
    if (score > storedScore) {
        storage.setItem(BEST_SCORE_KEY, score.toString());
        storage.setItem(BEST_SCORE_AT_KEY, new Date().toISOString());
    }
}

export function getBestScore(storage: Storage): ScoreRecord | null {
    const scoreStr = storage.getItem(BEST_SCORE_KEY);
    if (!scoreStr) return null;
    const createdAtStr = storage.getItem(BEST_SCORE_AT_KEY);
    if (!createdAtStr) {
        console.warn("WARN: Found best score, but no creation date");
        return null;
    }
    const score = Number(scoreStr);
    if (score === 0) return null;
    const createdAt = new Date(createdAtStr);
    if (isNaN(score)) {
        console.warn("WARN: best score is NaN");
        return null;
    }
    if (isNaN(createdAt.getTime())) {
        console.warn("WARN: creation date is invalid");
        return null;
    }
    return { score, createdAt };
}

export function getStoredShowFps(storage: Storage): boolean {
    return storage.getItem(SHOW_FPS_KEY) === "true";
}

export function setStoredShowFps(storage: Storage, value: boolean): void {
    storage.setItem(SHOW_FPS_KEY, value.toString());
}

export function getStoredShowBoundaries(storage: Storage): boolean {
    return storage.getItem(SHOW_BOUNDARIES) === "true";
}

export function setStoredShowBoundaries(
    storage: Storage,
    value: boolean,
): void {
    storage.setItem(SHOW_BOUNDARIES, value.toString());
}
