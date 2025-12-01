# Algorithmic Utilities: Sorting, Searching, Data Structures

JavaScript implementations of common algorithms and data structures.

## 1. Bubble Sort

### Question
Implement a function that performs a bubble sort.

### Solution

```javascript
function bubbleSort(array) {
    const arr = [...array]; // Don't mutate original
    const n = arr.length;

    for (let i = 0; i < n - 1; i++) {
        let swapped = false;

        for (let j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                // Swap
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
                swapped = true;
            }
        }

        // Optimization: If no swaps, array is sorted
        if (!swapped) break;
    }

    return arr;
}

// Usage
const numbers = [64, 34, 25, 12, 22, 11, 90];
const sorted = bubbleSort(numbers);
console.log(sorted); // [11, 12, 22, 25, 34, 64, 90]
```

### Explanation
- **Bubble Up**: Largest elements bubble to end
- **Optimization**: Early exit if no swaps
- **Time Complexity**: O(n²) worst case, O(n) best case
- **Space Complexity**: O(1)
- **Stable**: Maintains relative order of equal elements

---

## 2. Selection Sort

### Question
Implement a function that performs a selection sort.

### Solution

```javascript
function selectionSort(array) {
    const arr = [...array];
    const n = arr.length;

    for (let i = 0; i < n - 1; i++) {
        let minIndex = i;

        // Find minimum element in unsorted portion
        for (let j = i + 1; j < n; j++) {
            if (arr[j] < arr[minIndex]) {
                minIndex = j;
            }
        }

        // Swap with first element of unsorted portion
        if (minIndex !== i) {
            [arr[i], arr[minIndex]] = [arr[minIndex], arr[i]];
        }
    }

    return arr;
}

// Usage
const numbers = [64, 25, 12, 22, 11];
const sorted = selectionSort(numbers);
console.log(sorted); // [11, 12, 22, 25, 64]
```

### Explanation
- **Selection**: Selects minimum and places at start
- **Time Complexity**: O(n²)
- **Space Complexity**: O(1)
- **Not Stable**: May change order of equal elements

---

## 3. Binary Search

### Question
Implement a function that performs binary search on an array of numbers.

### Solution

```javascript
function binarySearch(array, target) {
    let left = 0;
    let right = array.length - 1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);

        if (array[mid] === target) {
            return mid;
        } else if (array[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    return -1; // Not found
}

// Recursive version
function binarySearchRecursive(array, target, left = 0, right = array.length - 1) {
    if (left > right) return -1;

    const mid = Math.floor((left + right) / 2);

    if (array[mid] === target) {
        return mid;
    } else if (array[mid] < target) {
        return binarySearchRecursive(array, target, mid + 1, right);
    } else {
        return binarySearchRecursive(array, target, left, mid - 1);
    }
}

// Usage
const sorted = [1, 3, 5, 7, 9, 11, 13, 15];
console.log(binarySearch(sorted, 7)); // 3
console.log(binarySearch(sorted, 10)); // -1
```

### Explanation
- **Divide and Conquer**: Splits search space in half
- **Requires Sorted**: Array must be sorted
- **Time Complexity**: O(log n)
- **Space Complexity**: O(1) iterative, O(log n) recursive
- **Efficient**: Much faster than linear search

---

## 4. Stack Implementation

### Question
Implement a stack data structure containing the common stack methods.

### Solution

```javascript
class Stack {
    constructor() {
        this.items = [];
    }

    push(element) {
        this.items.push(element);
    }

    pop() {
        if (this.isEmpty()) {
            return undefined;
        }
        return this.items.pop();
    }

    peek() {
        if (this.isEmpty()) {
            return undefined;
        }
        return this.items[this.items.length - 1];
    }

    isEmpty() {
        return this.items.length === 0;
    }

    size() {
        return this.items.length;
    }

    clear() {
        this.items = [];
    }

    toArray() {
        return [...this.items];
    }
}

// Usage
const stack = new Stack();
stack.push(1);
stack.push(2);
stack.push(3);
console.log(stack.peek()); // 3
console.log(stack.pop()); // 3
console.log(stack.size()); // 2
```

### Explanation
- **LIFO**: Last In First Out
- **Array-based**: Uses array internally
- **Methods**: push, pop, peek, isEmpty, size
- **Time Complexity**: O(1) for all operations
- **Space Complexity**: O(n)

---

## 5. Queue Implementation

### Question
Implement a queue data structure containing the common queue methods.

### Solution

```javascript
class Queue {
    constructor() {
        this.items = [];
    }

    enqueue(element) {
        this.items.push(element);
    }

    dequeue() {
        if (this.isEmpty()) {
            return undefined;
        }
        return this.items.shift();
    }

    front() {
        if (this.isEmpty()) {
            return undefined;
        }
        return this.items[0];
    }

    isEmpty() {
        return this.items.length === 0;
    }

    size() {
        return this.items.length;
    }

    clear() {
        this.items = [];
    }

    toArray() {
        return [...this.items];
    }
}

// Optimized version using object
class QueueOptimized {
    constructor() {
        this.items = {};
        this.frontIndex = 0;
        this.rearIndex = 0;
    }

    enqueue(element) {
        this.items[this.rearIndex] = element;
        this.rearIndex++;
    }

    dequeue() {
        if (this.isEmpty()) {
            return undefined;
        }
        const item = this.items[this.frontIndex];
        delete this.items[this.frontIndex];
        this.frontIndex++;
        return item;
    }

    front() {
        if (this.isEmpty()) {
            return undefined;
        }
        return this.items[this.frontIndex];
    }

    isEmpty() {
        return this.rearIndex === this.frontIndex;
    }

    size() {
        return this.rearIndex - this.frontIndex;
    }
}

// Usage
const queue = new Queue();
queue.enqueue(1);
queue.enqueue(2);
queue.enqueue(3);
console.log(queue.dequeue()); // 1
console.log(queue.front()); // 2
```

### Explanation
- **FIFO**: First In First Out
- **Array-based**: Simple but shift() is O(n)
- **Optimized**: Object-based for O(1) dequeue
- **Methods**: enqueue, dequeue, front, isEmpty, size
- **Time Complexity**: O(1) optimized, O(n) array-based dequeue

---

## 6. Linked List Implementation

### Question
Implement a linked list data structure containing the common linked list methods.

### Solution

```javascript
class ListNode {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

class LinkedList {
    constructor() {
        this.head = null;
        this.length = 0;
    }

    append(value) {
        const newNode = new ListNode(value);

        if (!this.head) {
            this.head = newNode;
        } else {
            let current = this.head;
            while (current.next) {
                current = current.next;
            }
            current.next = newNode;
        }

        this.length++;
        return this;
    }

    prepend(value) {
        const newNode = new ListNode(value);
        newNode.next = this.head;
        this.head = newNode;
        this.length++;
        return this;
    }

    insertAt(index, value) {
        if (index < 0 || index > this.length) {
            return false;
        }

        if (index === 0) {
            return this.prepend(value);
        }

        const newNode = new ListNode(value);
        let current = this.head;

        for (let i = 0; i < index - 1; i++) {
            current = current.next;
        }

        newNode.next = current.next;
        current.next = newNode;
        this.length++;
        return true;
    }

    removeAt(index) {
        if (index < 0 || index >= this.length) {
            return undefined;
        }

        if (index === 0) {
            const value = this.head.value;
            this.head = this.head.next;
            this.length--;
            return value;
        }

        let current = this.head;
        for (let i = 0; i < index - 1; i++) {
            current = current.next;
        }

        const value = current.next.value;
        current.next = current.next.next;
        this.length--;
        return value;
    }

    getAt(index) {
        if (index < 0 || index >= this.length) {
            return undefined;
        }

        let current = this.head;
        for (let i = 0; i < index; i++) {
            current = current.next;
        }

        return current.value;
    }

    indexOf(value) {
        let current = this.head;
        let index = 0;

        while (current) {
            if (current.value === value) {
                return index;
            }
            current = current.next;
            index++;
        }

        return -1;
    }

    reverse() {
        let prev = null;
        let current = this.head;

        while (current) {
            const next = current.next;
            current.next = prev;
            prev = current;
            current = next;
        }

        this.head = prev;
        return this;
    }

    toArray() {
        const result = [];
        let current = this.head;
        while (current) {
            result.push(current.value);
            current = current.next;
        }
        return result;
    }
}

// Usage
const list = new LinkedList();
list.append(1).append(2).append(3);
console.log(list.toArray()); // [1, 2, 3]
list.reverse();
console.log(list.toArray()); // [3, 2, 1]
```

### Explanation
- **Node-based**: Each node has value and next pointer
- **Dynamic Size**: Grows/shrinks as needed
- **Methods**: append, prepend, insertAt, removeAt, getAt, reverse
- **Time Complexity**: O(n) for most operations, O(1) for prepend
- **Space Complexity**: O(n)

---

## 7. Balanced Brackets

### Question
Implement a function to determine if a string contains balanced brackets.

### Solution

```javascript
function isBalanced(str) {
    const stack = [];
    const pairs = {
        '(': ')',
        '[': ']',
        '{': '}'
    };

    for (let char of str) {
        if (pairs[char]) {
            // Opening bracket
            stack.push(char);
        } else if (Object.values(pairs).includes(char)) {
            // Closing bracket
            if (stack.length === 0) {
                return false; // No matching opening
            }

            const lastOpen = stack.pop();
            if (pairs[lastOpen] !== char) {
                return false; // Mismatched brackets
            }
        }
    }

    return stack.length === 0; // All brackets matched
}

// Usage
console.log(isBalanced('()')); // true
console.log(isBalanced('()[]{}')); // true
console.log(isBalanced('([{}])')); // true
console.log(isBalanced('([)]')); // false
console.log(isBalanced('(((')); // false
```

### Explanation
- **Stack-based**: Uses stack to track opening brackets
- **Pair Matching**: Matches opening with closing
- **Multiple Types**: Handles (), [], {}
- **Time Complexity**: O(n)
- **Space Complexity**: O(n)

---

## Key Patterns

1. **Sorting Algorithms**: Bubble, selection, insertion, merge, quick
2. **Search Algorithms**: Binary search, linear search
3. **Data Structures**: Stack, queue, linked list, tree
4. **Stack-based**: For bracket matching, expression evaluation
5. **Two Pointers**: For array manipulation
6. **Recursion**: For tree/graph traversal

## Best Practices

- ✅ Understand time/space complexity
- ✅ Handle edge cases
- ✅ Don't mutate input arrays
- ✅ Use appropriate data structure
- ✅ Optimize when possible
- ✅ Test with various inputs

