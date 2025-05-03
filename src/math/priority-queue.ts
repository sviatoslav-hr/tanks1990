export class MinPriorityQueue<T> {
    private heap: T[] = [];

    constructor(private compare: (a: T, b: T) => number) {}

    enqueue(item: T): void {
        this.heap.push(item);
        this.bubbleUp(this.heap.length - 1);
    }

    enqueueAll(items: T[]): void {
        for (const item of items) {
            this.enqueue(item);
        }
    }

    dequeue(): T | null {
        if (this.heap.length === 0) return null;
        const min = this.heap[0]!;
        const last = this.heap.pop()!;
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.bubbleDown(0);
        }
        return min;
    }

    isEmpty(): boolean {
        return this.heap.length === 0;
    }

    some(predicate: (value: T, index: number, array: T[]) => unknown): boolean {
        return this.heap.some(predicate);
    }

    get length(): number {
        return this.heap.length;
    }

    private bubbleUp(index: number): void {
        assert(index < this.heap.length);
        const item = this.heap[index]!;
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            const parent = this.heap[parentIndex]!;
            if (this.compare(item, parent) >= 0) break;
            this.heap[index] = parent;
            index = parentIndex;
        }
        this.heap[index] = item;
    }

    private bubbleDown(index: number): void {
        const length = this.heap.length;
        assert(index < length);
        const item = this.heap[index]!;
        while (true) {
            const left = 2 * index + 1;
            const right = 2 * index + 2;
            let smallest = index;

            if (left < length && this.compare(this.heap[left]!, this.heap[smallest]!) < 0) {
                smallest = left;
            }
            if (right < length && this.compare(this.heap[right]!, this.heap[smallest]!) < 0) {
                smallest = right;
            }
            if (smallest === index) break;

            this.heap[index] = this.heap[smallest]!;
            index = smallest;
        }
        this.heap[index] = item;
    }
}
