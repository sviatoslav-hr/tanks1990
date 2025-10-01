// https://www.geeksforgeeks.org/javascript/implementation-priority-queue-javascript/
export class MinPriorityQueue<T> {
    private heap: T[] = [];

    constructor(private compare: (a: T, b: T) => number) {}

    peek(): T | null {
        return this.heap[0] ?? null;
    }

    enqueue(item: T): void {
        this.heap.push(item);
        let index = this.heap.length - 1;
        while (this.hasParent(index) && this.compare(this.getParent(index), item) > 0) {
            const parentIndex = this.getParentIndex(index);
            this.swapHeapElements(parentIndex, index);
            index = parentIndex;
        }
    }

    enqueueAll(...items: T[]): void {
        for (const item of items) {
            this.enqueue(item);
        }
    }

    dequeue(): T | null {
        if (this.heap.length === 0) return null;
        const item = this.heap[0];
        this.heap[0] = this.heap[this.heap.length - 1]!;
        this.heap.pop();
        let index = 0;
        while (this.hasLeftChild(index)) {
            let smallerChildIndex = this.getLeftChildIndex(index);
            if (
                this.hasRightChild(index) &&
                this.compare(this.getRightChild(index), this.getLeftChild(index)) < 0
            ) {
                smallerChildIndex = this.getRightChildIndex(index);
            }
            if (this.compare(this.heap[index]!, this.heap[smallerChildIndex]!) <= 0) break;
            this.swapHeapElements(index, smallerChildIndex);
            index = smallerChildIndex;
        }
        return item ?? null;
    }

    isEmpty(): boolean {
        return this.heap.length === 0;
    }

    some(predicate: (value: T, index: number, array: T[]) => unknown): boolean {
        return this.heap.some(predicate);
    }

    find(predicate: (value: T) => unknown): T | null {
        for (const item of this.heap) {
            if (predicate(item)) return item;
        }
        return null;
    }

    get length(): number {
        return this.heap.length;
    }

    [Symbol.iterator](): IterableIterator<T> {
        const heap = this.heap.slice();
        heap.sort(this.compare);
        return heap.values();
    }

    private getParentIndex(childIndex: number): number {
        return Math.floor((childIndex - 1) / 2);
    }

    private getParent(index: number): T {
        const parent = this.heap[this.getParentIndex(index)];
        if (!parent) throw new Error('Parent not found');
        return parent;
    }

    private hasParent(childIndex: number): boolean {
        return this.getParentIndex(childIndex) >= 0;
    }

    private getLeftChildIndex(parentIndex: number): number {
        return 2 * parentIndex + 1;
    }

    private getLeftChild(index: number): T {
        const leftChild = this.heap[this.getLeftChildIndex(index)];
        if (!leftChild) throw new Error('Left child not found');
        return leftChild;
    }

    private hasLeftChild(index: number): boolean {
        return this.getLeftChildIndex(index) < this.heap.length;
    }

    private getRightChildIndex(parentIndex: number): number {
        return 2 * parentIndex + 2;
    }

    private getRightChild(index: number): T {
        const rightChild = this.heap[this.getRightChildIndex(index)];
        if (!rightChild) throw new Error('Right child not found');
        return rightChild;
    }

    private hasRightChild(index: number): boolean {
        return this.getRightChildIndex(index) < this.heap.length;
    }

    private swapHeapElements(index1: number, index2: number): void {
        const temp = this.heap[index1]!;
        this.heap[index1] = this.heap[index2]!;
        this.heap[index2] = temp;
    }
}
