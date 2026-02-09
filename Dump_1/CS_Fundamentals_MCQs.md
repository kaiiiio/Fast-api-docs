# 🖥️ CS Fundamentals MCQs: Output, Syntax & Complexity

This document contains a curated list of output-based, syntax, and complexity questions for C, C++, Java, and general data structures. These are designed to mimic real technical interview patterns.

---

## 🔵 1. C Language (Output & Syntax)

**Q1: What is the output of the following C code?**
```c
#include <stdio.h>
int main() {
    int x = 5;
    printf("%d %d %d", x++, ++x, x);
    return 0;
}
```
- **A)** 5 7 7
- **B)** 7 7 7
- **C)** 6 7 7
- **D)** Behavior is undefined (Compiler dependent)
**Answer:** **D**
**Explanation:** In C, the order of evaluation of function arguments is not specified by the standard. Modifications to the same variable multiple times in a single sequence point (like `printf`) leads to undefined behavior.

**Q2: What is the size of the following union on a 32-bit system?**
```c
union Data {
    int i;
    char c;
    float f;
} data;
```
- **A)** 9 Bytes
- **B)** 4 Bytes
- **C)** 1 Byte
- **D)** 8 Bytes
**Answer:** **B**
**Explanation:** A union allocates memory based on the largest member. Here, `int` and `float` are both 4 bytes, so the union size is 4 bytes.

**Q3: What will be the output?**
```c
#include <stdio.h>
int main() {
    int arr[] = {10, 20, 30};
    int *p = arr;
    printf("%d", *(p++) + 1);
    return 0;
}
```
- **A)** 11
- **B)** 21
- **C)** 10
- **D)** 31
**Answer:** **A**
**Explanation:** `*(p++)` returns the current value `arr[0]` (10) and then increments the pointer. So `10 + 1 = 11`.

**Q4: Which of the following is used to prevent multiple inclusions of a header file?**
- **A)** `#ifndef`
- **B)** `#ifdef`
- **C)** `#pragma once`
- **D)** Both A and C
**Answer:** **D**
**Explanation:** Both `#ifndef` guards and `#pragma once` are standard ways to prevent redundant header inclusions.

---

## 🟢 2. C++ (OOP & Virtual Functions)

**Q5: What is the output of the following code?**
```cpp
#include <iostream>
using namespace std;
class Base {
public:
    virtual void show() { cout << "Base "; }
};
class Derived : public Base {
public:
    void show() { cout << "Derived "; }
};
int main() {
    Base *b = new Derived();
    b->show();
    return 0;
}
```
- **A)** Base
- **B)** Derived
- **C)** Base Derived
- **D)** Runtime Error
**Answer:** **B**
**Explanation:** Since `show()` is marked as `virtual` in the Base class, C++ uses dynamic dispatch (vtable) to call the function of the actual object type (`Derived`).

**Q6: Private members of a class are accessible to:**
- **A)** Only member functions of the same class
- **B)** Member functions and Friend functions
- **C)** Objects of the class
- **D)** Derived classes
**Answer:** **B**
**Explanation:** `private` members are protected from outside access but can be accessed by the class's own methods and specifically declared `friend` functions or classes.

**Q7: What is the default access specifier for members of a `struct` in C++?**
- **A)** Private
- **B)** Protected
- **C)** Public
- **D)** Internal
**Answer:** **C**
**Explanation:** In C++, the only difference between a `class` and a `struct` is that `struct` members are `public` by default, while `class` members are `private` by default.

---

## ☕ 3. Java (JVM & Behavior)

**Q8: What will be the output of the following Java snippet?**
```java
public class Main {
    public static void main(String[] args) {
        String s1 = "Hello";
        String s2 = new String("Hello");
        System.out.println(s1 == s2);
        System.out.println(s1.equals(s2));
    }
}
```
- **A)** true true
- **B)** false true
- **C)** true false
- **D)** false false
**Answer:** **B**
**Explanation:** `==` compares memory references. `s1` is in the String Pool, while `s2` is a new object on the heap. `.equals()` compares the actual content.

**Q9: Which keyword is used to prevent a method from being overridden?**
- **A)** static
- **B)** const
- **C)** final
- **D)** strictfp
**Answer:** **C**
**Explanation:** A `final` method cannot be overridden by subclasses.

**Q10: What is the initial capacity of an `ArrayList` in Java (JDK 8+)?**
- **A)** 5
- **B)** 10
- **C)** 16
- **D)** 0 (lazy initialization)
**Answer:** **D**
**Explanation:** Modern Java versions use lazy initialization; the internal array is empty until the first element is added, at which point it defaults to 10.

---

## ⏳ 4. Complexity Analysis (Loops & Recursion)

**Q11: What is the time complexity of the following loop?**
```javascript
for (let i = 1; i <= n; i = i * 2) {
    console.log(i);
}
```
- **A)** O(n)
- **B)** O(n log n)
- **C)** O(log n)
- **D)** O(1)
**Answer:** **C**
**Explanation:** The variable `i` doubles in each iteration. The number of steps to reach `n` is `log2(n)`.

**Q12: Find the time complexity of the following nested loops:**
```java
for (int i = 0; i < n; i++) {
    for (int j = 0; j < i; j++) {
        // Constant time operation
    }
}
```
- **A)** O(n)
- **B)** O(n²)
- **C)** O(n log n)
- **D)** O(2^n)
**Answer:** **B**
**Explanation:** The inner loop runs `0, 1, 2, ..., n-1` times. The total sum is `n(n-1)/2`, which simplifies to `O(n²)`.

**Q13: What is the space complexity of a recursive function that calculates Factorial of N?**
- **A)** O(1)
- **B)** O(N)
- **C)** O(log N)
- **D)** O(N²)
**Answer:** **B**
**Explanation:** Each recursive call adds a new frame to the call stack. For `factorial(N)`, there are `N` calls, resulting in `O(N)` space.

---

## 📂 General CS Questions

**Q14: Which data structure is used for Breadth First Search (BFS)?**
- **A)** Stack
- **B)** Queue
- **C)** Linked List
- **D)** Binary Tree
**Answer:** **B**
**Explanation:** BFS visits neighbors layer by layer, requiring a First-In-First-Out (FIFO) structure like a Queue.

**Q15: What is a "Memory Leak"?**
- **A)** When the program runs out of memory
- **B)** When memory is allocated but never released after use
- **C)** When a program accesses restricted memory
- **D)** When the CPU cache is full
**Answer:** **B**
**Explanation:** Memory leaks occur when heap-allocated memory is not freed (explicitly in C/C++ or by GC in Java/JS if references remain), leading to increased consumption over time.

---
*Good luck with your technical rounds! 🚀*
