# Recursion: The Trace Tree

## 1. The "Inception" Rule

Recursion is just a function calling itself.
Each call creates a new **Stack Frame**.
The CPU pauses the current function and jumps to the new one.

---

## 2. Visualizing Fibonacci(3)

Code:
```python
def fib(n):
    if n <= 1: return n
    return fib(n-1) + fib(n-2)
```

**Trace Tree**:

```
          fib(3)
         /      \
    fib(2)      fib(1) -> Returns 1
    /    \
fib(1)  fib(0)
  |       |
Returns 1 Returns 0
```

**Execution Order**:
1. `fib(3)` calls `fib(2)`
2. `fib(2)` calls `fib(1)` -> returns 1
3. `fib(2)` calls `fib(0)` -> returns 0
4. `fib(2)` computes `1 + 0 = 1` -> returns 1
5. `fib(3)` calls `fib(1)` -> returns 1
6. `fib(3)` computes `1 + 1 = 2` -> returns 2

---

## 3. The Stack Overflow

If you forget the **Base Case** (`if n <= 1`), the tree grows infinitely deep.
The Stack runs out of memory.
**Stack Overflow Error**.
