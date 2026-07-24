# DSA for FDE Interviews - Senior Interview Deep Dive

> Module: CS & ML Foundations | Level: Senior/Staff | FDE Interview Prep

FDE and AI-engineer live-coding rounds are **not** competitive-programming gauntlets. Nobody asks you to solve a hard segment-tree problem in 25 minutes. What they *do* ask is a "medium" that you can solve cleanly while narrating your reasoning, handling every edge case, and stating complexity aloud — because the real signal is "can this person write correct code under mild pressure and communicate like a colleague." The canonical FDE screen is **binary search done right**: it looks trivial, and 60% of candidates get the termination condition or an off-by-one wrong. This file drills the patterns that actually appear — binary search in all its variants, two pointers, sliding window, hashing, and stack/queue — in complete TypeScript with tests, plus the communication protocol that turns a correct solution into a "strong hire."

All code is TypeScript. Run any snippet with `ts-node file.ts` or paste into the TS playground. Tests use plain `console.assert` so there are no dependencies.

---

## The Live-Coding Communication Protocol

### Q1. Before writing a single line, what should you say? (The protocol that separates senior from junior)

**Answer:**

Interviewers score *process*, not just the final code. Run this five-step protocol out loud on every problem. It is the single highest-leverage thing you can practice.

1. **Clarify (30–60s).** Restate the problem in your words. Ask about: input size (drives the target complexity), value ranges (negative? duplicates? overflow?), sorted-ness, empty/null inputs, and what to return on "not found." *"Is the array sorted? Can it contain duplicates? What do I return if the target isn't present — an index or -1? How large can n get?"*
2. **Examples (30s).** Write 2–3 concrete examples including an edge case (empty, single element, target at boundary). This catches misunderstandings before code and doubles as your test suite later.
3. **Brute force (30s).** State the naive solution and its complexity *even if you won't code it*: *"The brute force is a linear scan, O(n). Since the array is sorted, I can do better with binary search, O(log n)."* This shows you know the baseline and why the optimization is justified.
4. **Optimize & plan (1 min).** Name the pattern and the invariant before coding. *"I'll keep a half-open range [lo, hi) and maintain the invariant that the answer, if it exists, is always inside it."* Stating the invariant is what prevents off-by-one bugs.
5. **Code, then test out loud (last).** Write it, then *trace your examples through the code by hand*, narrating variable values. Finding your own bug during the trace is a strong-hire signal; the interviewer finding it for you is not.

**Interview trap:** Jumping straight to code. Even if you know the answer instantly, spend 60 seconds on clarify + examples. Candidates who code silently and correctly often score *below* candidates who are slightly slower but collaborative — the whole point of "Forward Deployed" is working *with* a customer's engineers, so communication is the job.

**Production war story:** In a real FDE loop, a candidate solved binary search flawlessly in 90 seconds — silently — then sat waiting. The interviewer's note read "correct but I have no idea how they think; would they explain a design to a customer's junior dev?" Downgraded to "no hire." The next candidate wrote a slightly buggier first draft but narrated the invariant, caught the bug in their own trace, and fixed it. "Strong hire — exactly the collaboration we need on-site."

---

### Q2. How do you state time and space complexity so it sounds senior?

**Answer:**

State it as a sentence with the *why*, not just a symbol. Compare:

- Junior: "It's O(log n)."
- Senior: "Each iteration halves the search range, so it's O(log n) time. Space is O(1) — I only use a constant number of index variables, no recursion stack."

Always cover **both** time and space, and always say *why* (what work happens per unit, how many units). For recursive solutions, remember the call stack counts toward space: a recursion of depth d is O(d) space even if it allocates nothing else.

The complexities you must recognize instantly:

| Pattern | Time | Space | Trigger phrase |
|---|---|---|---|
| Hash lookup / set membership | O(1) avg | O(n) | "have I seen this before?" |
| Binary search on sorted data | O(log n) | O(1) | "sorted" + "find" |
| Single pass / two pointers | O(n) | O(1) | "pair", "in-place", "sorted array" |
| Sliding window | O(n) | O(k) | "subarray/substring", "contiguous" |
| Sort then scan | O(n log n) | O(1)–O(n) | "need ordering first" |
| BFS/DFS over graph | O(V+E) | O(V) | "shortest unweighted", "reachable" |
| Heap for top-K | O(n log k) | O(k) | "top/smallest K", "K-th" |
| DP over 2D table | O(n·m) | O(n·m) | "count ways / min cost / can we" |

**Interview trap:** Saying "O(n log n)" for a hash-based solution because you sorted out of habit. If a hash set gives you O(n), *don't* sort — and if asked "can you do better than your O(n log n)?", the answer is usually "trade space for time with a hash structure."

---

## Binary Search — The Canonical FDE Question

### Q3. Write binary search for an exact match. What are the three details interviewers grill?

**Answer:**

```typescript
/** Returns index of target in a sorted ascending array, or -1 if absent. */
function binarySearch(arr: number[], target: number): number {
  let lo = 0;
  let hi = arr.length - 1; // inclusive high => closed interval [lo, hi]
  while (lo <= hi) {         // <= because [lo, hi] is non-empty when lo == hi
    const mid = lo + Math.floor((hi - lo) / 2); // overflow-safe midpoint
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) lo = mid + 1;        // discard mid; it's too small
    else hi = mid - 1;                          // discard mid; it's too big
  }
  return -1;
}

// Tests
console.assert(binarySearch([1, 3, 5, 7, 9], 7) === 3, "found mid-right");
console.assert(binarySearch([1, 3, 5, 7, 9], 1) === 0, "found first");
console.assert(binarySearch([1, 3, 5, 7, 9], 9) === 4, "found last");
console.assert(binarySearch([1, 3, 5, 7, 9], 4) === -1, "absent");
console.assert(binarySearch([], 4) === -1, "empty");
console.assert(binarySearch([5], 5) === 0, "single hit");
console.assert(binarySearch([5], 6) === -1, "single miss");
```

The three details they grill:

1. **The midpoint: `lo + (hi - lo) / 2`, never `(lo + hi) / 2`.** In languages with fixed-width integers (Java, C++, Go), `lo + hi` can overflow when both are near `INT_MAX` — this is a *famous* real bug that lived in the JDK's `Arrays.binarySearch` for nine years. In JavaScript numbers are 64-bit floats so it won't literally overflow at realistic sizes, but interviewers still expect the overflow-safe form because it proves you understand the failure mode. Always write `lo + Math.floor((hi - lo) / 2)`.
2. **The loop condition `lo <= hi` matches the closed interval `[lo, hi]`.** With an inclusive `hi`, the range `[lo, hi]` still contains one element when `lo === hi`, so you must use `<=` or you'll skip checking it. If you instead use an exclusive `hi = arr.length` (half-open `[lo, hi)`), the condition becomes `lo < hi`. **Pick one convention and keep it consistent** — mixing them is the #1 source of off-by-one bugs.
3. **Termination / progress.** Every branch must shrink the range: `lo = mid + 1` or `hi = mid - 1`, both moving *past* mid. If you ever write `lo = mid` or `hi = mid` in the exact-match version, you risk an infinite loop when `lo` and `hi` are adjacent. The `+1`/`-1` guarantee the interval strictly shrinks each step.

**Interview trap:** Being asked "why `lo <= hi` and not `lo < hi`?" and hand-waving. The precise answer: "Because `hi` is an inclusive index. When `lo === hi` the interval `[lo, hi]` holds exactly one unchecked element; `lo < hi` would exit before checking it, missing a target at that position." Demonstrate with `[5]` searching for `5`: `lo=hi=0`, `<=` enters the loop and finds it; `<` would return -1. That single example proves you understand it.

---

### Q4. Find the *first* occurrence of a target (lower_bound / leftmost). Why is this the version people get wrong?

**Answer:**

With duplicates, plain binary search returns *some* index of the target, not necessarily the first. To find the leftmost, you cannot stop when you find a match — you must keep searching the left half while *remembering* the match.

```typescript
/** Index of the FIRST element == target, or -1. (leftmost / lower bound for equality) */
function firstOccurrence(arr: number[], target: number): number {
  let lo = 0;
  let hi = arr.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (arr[mid] === target) {
      ans = mid;        // record candidate...
      hi = mid - 1;     // ...but keep looking LEFT for an earlier one
    } else if (arr[mid] < target) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

console.assert(firstOccurrence([1, 2, 2, 2, 3], 2) === 1, "first of duplicates");
console.assert(firstOccurrence([2, 2, 2], 2) === 0, "all duplicates");
console.assert(firstOccurrence([1, 2, 3], 4) === -1, "absent");
console.assert(firstOccurrence([1, 2, 3], 1) === 0, "at start");
```

The **generalized `lower_bound`** — the first index whose value is `>= target` (an *insertion point*, defined even when target is absent) — is the more reusable primitive and is worth memorizing in the half-open form:

```typescript
/** First index i where arr[i] >= target. Returns arr.length if all elements < target. */
function lowerBound(arr: number[], target: number): number {
  let lo = 0;
  let hi = arr.length; // EXCLUSIVE => half-open [lo, hi)
  while (lo < hi) {     // < matches half-open interval
    const mid = lo + Math.floor((hi - lo) / 2);
    if (arr[mid] < target) lo = mid + 1; // arr[mid] can't be the answer
    else hi = mid;                        // arr[mid] might BE the answer; keep it in range
  }
  return lo; // lo === hi === insertion point
}

console.assert(lowerBound([1, 2, 2, 2, 3], 2) === 1, "lb of dup start");
console.assert(lowerBound([1, 3, 5], 4) === 2, "insertion point");
console.assert(lowerBound([1, 3, 5], 6) === 3, "past end");
console.assert(lowerBound([1, 3, 5], 0) === 0, "before start");
```

**Why people get it wrong:** In `lowerBound`, note the asymmetry — `lo = mid + 1` (exclude mid) but `hi = mid` (include mid). Beginners reflexively write `hi = mid - 1` here and skip the very element they were looking for. The rule: **`hi = mid` (not `mid - 1`) whenever mid could still be the answer.** Because `hi = mid` doesn't strictly move past mid, the loop *must* use `lo < hi` (half-open) to terminate — with `lo <= hi` and `hi = mid` you'd loop forever when `lo === hi === mid`. This is why the convention pairing matters: **`hi = mid` ⟺ `lo < hi` ⟺ exclusive `hi`.**

**Interview trap:** "Prove your first-occurrence loop terminates." Answer: in every branch either `lo` strictly increases (`mid + 1 > lo` since `mid >= lo`) or `hi` strictly decreases (`mid - 1 < hi`), so the range `hi - lo` shrinks by at least 1 each iteration and the loop runs at most O(log n) times before `lo > hi`.

---

### Q5. Find the *last* occurrence (upper_bound / rightmost). Show the symmetry.

**Answer:**

Mirror image of first-occurrence: on a match, record it and search *right*.

```typescript
/** Index of the LAST element == target, or -1. */
function lastOccurrence(arr: number[], target: number): number {
  let lo = 0, hi = arr.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (arr[mid] === target) {
      ans = mid;
      lo = mid + 1;  // keep looking RIGHT for a later one
    } else if (arr[mid] < target) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

/** upper_bound: first index i where arr[i] > target (one past the last <= target). */
function upperBound(arr: number[], target: number): number {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (arr[mid] <= target) lo = mid + 1; // <= : push past equal elements
    else hi = mid;
  }
  return lo;
}

console.assert(lastOccurrence([1, 2, 2, 2, 3], 2) === 3, "last of duplicates");
console.assert(upperBound([1, 2, 2, 2, 3], 2) === 4, "one past last 2");

// COUNT of occurrences falls out for free — the classic follow-up:
function countOccurrences(arr: number[], target: number): number {
  return upperBound(arr, target) - lowerBound(arr, target);
}
console.assert(countOccurrences([1, 2, 2, 2, 3], 2) === 3, "count via bounds");
console.assert(countOccurrences([1, 2, 2, 2, 3], 9) === 0, "count absent");
```

The only difference between `lowerBound` and `upperBound` is `<` vs `<=` in the comparison. That single character shifts the boundary from "first `>= target`" to "first `> target`". Their difference is the count of elements equal to target — a common "count occurrences in O(log n)" follow-up.

**Interview trap:** Being asked "count occurrences of x in a sorted array in better than O(n)." The naive answer is "find one, then expand left and right linearly" — but that's **O(n)** worst case (an array of all x). The correct answer is `upperBound - lowerBound`, which is O(log n) regardless of how many duplicates exist. Interviewers deliberately feed you `[2,2,2,2,2]` to catch the linear-expand mistake.

---

### Q6. Search in a rotated sorted array (no duplicates). Walk through the logic.

**Answer:**

A rotated sorted array like `[4,5,6,7,0,1,2]` isn't globally sorted, but **at least one half of any `[lo, hi]` range is always sorted.** Identify which half is sorted, check if the target lies within its sorted bounds, and recurse into the correct half.

```typescript
/** Search target in an ascending array rotated at an unknown pivot. Returns index or -1. */
function searchRotated(arr: number[], target: number): number {
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (arr[mid] === target) return mid;

    if (arr[lo] <= arr[mid]) {
      // LEFT half [lo..mid] is sorted
      if (arr[lo] <= target && target < arr[mid]) hi = mid - 1; // target in left
      else lo = mid + 1;                                         // else go right
    } else {
      // RIGHT half [mid..hi] is sorted
      if (arr[mid] < target && target <= arr[hi]) lo = mid + 1;  // target in right
      else hi = mid - 1;                                         // else go left
    }
  }
  return -1;
}

console.assert(searchRotated([4, 5, 6, 7, 0, 1, 2], 0) === 4, "in rotated tail");
console.assert(searchRotated([4, 5, 6, 7, 0, 1, 2], 6) === 2, "in rotated head");
console.assert(searchRotated([4, 5, 6, 7, 0, 1, 2], 3) === -1, "absent");
console.assert(searchRotated([1], 1) === 0, "single");
console.assert(searchRotated([5, 1, 3], 5) === 0, "small rotation");
```

Reasoning to narrate: "I still get O(log n) because I discard half each step. The key insight is `arr[lo] <= arr[mid]` tells me the left half is sorted — then I use a *simple* range check `arr[lo] <= target < arr[mid]` to decide whether target is in that clean sorted half. If not, it must be in the messy half, so I go the other way."

**Interview trap 1:** The `<=` in `arr[lo] <= arr[mid]`. When the range has two elements, `mid === lo`, so `arr[lo] === arr[mid]` — you need `<=` (not `<`) to correctly classify the left half as "sorted," otherwise you mishandle two-element ranges.

**Interview trap 2:** "What if there are duplicates?" With duplicates like `[3,1,3,3,3]`, the condition `arr[lo] === arr[mid] === arr[hi]` becomes ambiguous — you can't tell which half is sorted. The fix is to shrink the window by one (`lo++`, `hi--`) when `arr[lo] === arr[mid] === arr[hi]`, which degrades the worst case to **O(n)**. Interviewers love this because it shows binary search's log-n guarantee can be *broken* by duplicates — a subtle depth check.

---

### Q7. "Binary search the answer space" — the pattern that unlocks hard-looking problems. Show Koko-eating-bananas style.

**Answer:**

Many problems that *aren't* about a sorted array are secretly binary-searchable. If you can define a **monotonic predicate** `feasible(x)` — false for small x, then true for all x above some threshold (or vice versa) — you binary-search for the threshold instead of the value. This is the single highest-value binary-search variant for FDE rounds because it makes a "hard" problem into a "medium."

Classic: *"You must finish N piles of bananas in H hours. At speed k you eat min(pile, k) per hour per pile. Find the minimum integer speed k that finishes in time."* Speed is monotonic — if speed `k` works, any `k' > k` also works — so binary-search the *speed*, not the array.

```typescript
/** Minimum eating speed to finish all piles within h hours. */
function minEatingSpeed(piles: number[], h: number): number {
  const hoursNeeded = (speed: number): number =>
    piles.reduce((sum, p) => sum + Math.ceil(p / speed), 0);

  let lo = 1;                    // speed 0 is nonsensical; min meaningful speed is 1
  let hi = Math.max(...piles);   // eating the biggest pile per hour always suffices
  while (lo < hi) {              // half-open search for the leftmost feasible speed
    const mid = lo + Math.floor((hi - lo) / 2);
    if (hoursNeeded(mid) <= h) hi = mid; // feasible => this could be the min; keep it
    else lo = mid + 1;                    // too slow => need faster
  }
  return lo; // smallest speed with hoursNeeded <= h
}

console.assert(minEatingSpeed([3, 6, 7, 11], 8) === 4, "koko example");
console.assert(minEatingSpeed([30, 11, 23, 4, 20], 5) === 30, "must be max");
console.assert(minEatingSpeed([30, 11, 23, 4, 20], 6) === 23, "one hour slack");
```

The template generalizes to: minimum ship capacity to ship packages in D days, smallest divisor under a threshold, "split array into k subarrays minimizing the largest sum," and allocation problems. **Recognition cue:** the problem asks for a *minimum/maximum value* subject to a constraint, and "does value x satisfy the constraint?" is checkable in a single pass and is monotonic.

Complexity: O(n · log(range)) — a `feasible` check is O(n), run O(log(hi−lo)) times.

**Interview trap:** Setting `lo`/`hi` bounds wrong. `lo` must be the smallest *conceivable* answer (here 1, because ceil(p/0) is undefined) and `hi` the largest that trivially works (the max pile). Off-by-one on the bounds, or starting `lo = 0`, produces a divide-by-zero or a wrong answer on the boundary case. Always sanity-check: "at `lo` is it infeasible? at `hi` is it feasible?" — if the predicate isn't false-then-true across `[lo, hi]`, your bounds or predicate is wrong.

---

## Two Pointers

### Q8. Two Sum on a *sorted* array — why is the two-pointer version better than the hash version here?

**Answer:**

```typescript
/** Indices (1-based, as classic problems phrase it) of two numbers summing to target. */
function twoSumSorted(arr: number[], target: number): [number, number] | null {
  let lo = 0, hi = arr.length - 1;
  while (lo < hi) {
    const sum = arr[lo] + arr[hi];
    if (sum === target) return [lo + 1, hi + 1];
    if (sum < target) lo++;  // need a bigger sum => move left pointer up
    else hi--;               // need a smaller sum => move right pointer down
  }
  return null;
}

console.assert(JSON.stringify(twoSumSorted([2, 7, 11, 15], 9)) === "[1,2]", "basic");
console.assert(JSON.stringify(twoSumSorted([1, 2, 3, 4, 6], 10)) === "[4,5]", "at ends");
console.assert(twoSumSorted([1, 2, 3], 100) === null, "no pair");
```

Both are O(n) time, but the two-pointer version is **O(1) space** versus the hash map's O(n). Since the array is already sorted, the pointers exploit that ordering: if the sum is too small, the only way to grow it is to advance the low pointer (the high is already the biggest remaining); symmetric for too-large. Each element is visited once.

**When to use which:**

| | Two pointers | Hash map |
|---|---|---|
| Array sorted? | Required | Not needed |
| Space | O(1) | O(n) |
| Returns original indices? | Only if sorted in place with index tracking | Yes, naturally |
| Finds *all* pairs / handles duplicates | Cleaner (skip-duplicate logic) | Needs care |

**Interview trap:** Being asked Two Sum on an *unsorted* array and reaching for two pointers — that requires an O(n log n) sort first, which is worse than the O(n) hash solution *and* destroys the original indices. The correct instinct: **sorted → two pointers; unsorted and asked for indices → hash map.** State the trade-off explicitly.

---

### Q9. Remove duplicates in place from a sorted array (the read/write two-pointer pattern).

**Answer:**

The "fast/slow" or "read/write" two-pointer variant: one pointer scans (read), a slower pointer marks where the next kept element goes (write). This is the in-place compaction pattern behind "remove element," "move zeroes," and "partition."

```typescript
/** Compacts a sorted array in place; returns new logical length k (arr[0..k) are unique). */
function dedupeSorted(arr: number[]): number {
  if (arr.length === 0) return 0;
  let write = 1; // arr[0] is always kept; next unique goes at index 1
  for (let read = 1; read < arr.length; read++) {
    if (arr[read] !== arr[write - 1]) {
      arr[write] = arr[read]; // keep it, advance write
      write++;
    }
    // else: duplicate, skip (advance read only)
  }
  return write;
}

const a = [1, 1, 2, 2, 2, 3];
console.assert(dedupeSorted(a) === 3, "3 unique");
console.assert(JSON.stringify(a.slice(0, 3)) === "[1,2,3]", "compacted prefix");
const empty: number[] = [];
console.assert(dedupeSorted(empty) === 0, "empty");
console.assert(dedupeSorted([5]) === 1, "single");
```

O(n) time, O(1) space. The invariant: everything in `arr[0..write)` is the deduplicated result so far, and `arr[write-1]` is the last distinct value written. Narrate that invariant — it's why the comparison is against `arr[write - 1]`, not `arr[read - 1]`.

**Interview trap:** Comparing `arr[read]` to `arr[read - 1]` instead of `arr[write - 1]`. For *this* problem they happen to coincide, but for "allow at most 2 duplicates" they diverge and the `write - 1` (actually `write - 2`) formulation is the one that generalizes. Interviewers extend to "keep at most K copies" precisely to see if you understood the invariant or memorized a special case.

---

## Sliding Window

### Q10. Longest substring without repeating characters — the canonical variable-size window.

**Answer:**

Sliding window maintains a contiguous range `[left, right]` and expands `right` while the window stays valid, contracting `left` when it becomes invalid. For "no repeating characters," validity = no duplicate in the window; track membership with a Set (or last-seen index map for the O(n) jump version).

```typescript
/** Length of the longest substring with all distinct characters. */
function longestUniqueSubstring(s: string): number {
  const lastSeen = new Map<string, number>(); // char -> last index it appeared
  let left = 0;
  let best = 0;
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    if (lastSeen.has(c) && lastSeen.get(c)! >= left) {
      left = lastSeen.get(c)! + 1; // jump left PAST the previous occurrence
    }
    lastSeen.set(c, right);
    best = Math.max(best, right - left + 1); // window length = right - left + 1
  }
  return best;
}

console.assert(longestUniqueSubstring("abcabcbb") === 3, "abc");
console.assert(longestUniqueSubstring("bbbbb") === 1, "all same");
console.assert(longestUniqueSubstring("pwwkew") === 3, "wke");
console.assert(longestUniqueSubstring("") === 0, "empty");
console.assert(longestUniqueSubstring("abba") === 2, "left must not go backward");
```

O(n) time — each character is added once and `left` only moves forward, so the total pointer movement is bounded by 2n. O(min(n, alphabet)) space.

**Interview trap:** The `lastSeen.get(c)! >= left` guard. On input `"abba"`: when the second `a` arrives at index 3, its last-seen index is 0, but `left` has already advanced to 2 (past the `b`s). Without the `>= left` check, you'd move `left` *backward* to 1, breaking the window and returning a wrong answer. **`left` must be monotonically non-decreasing.** This exact case (`"abba"`, `"tmmzuxt"`) is the interviewer's go-to for catching the bug — always include it in your own test trace.

---

### Q11. Fixed-size window: maximum sum of any subarray of size k. Contrast with variable-size.

**Answer:**

```typescript
/** Max sum among all contiguous subarrays of length exactly k. */
function maxSubarraySum(arr: number[], k: number): number | null {
  if (k <= 0 || k > arr.length) return null; // clarify this edge case aloud
  let windowSum = 0;
  for (let i = 0; i < k; i++) windowSum += arr[i]; // prime the first window
  let best = windowSum;
  for (let right = k; right < arr.length; right++) {
    windowSum += arr[right] - arr[right - k]; // slide: add new, drop oldest — O(1)
    best = Math.max(best, windowSum);
  }
  return best;
}

console.assert(maxSubarraySum([2, 1, 5, 1, 3, 2], 3) === 9, "5+1+3");
console.assert(maxSubarraySum([2, 3, 4, 1, 5], 2) === 7, "3+4");
console.assert(maxSubarraySum([1, 2], 3) === null, "k too big");
```

The trick that makes it O(n): don't recompute the sum each window (that's O(n·k)). Instead **add the entering element and subtract the leaving element** — the window "slides" in O(1). This add-one/drop-one incremental update is the heart of every fixed-window problem.

| | Fixed window | Variable window |
|---|---|---|
| Window size | Constant k | Grows/shrinks to stay valid |
| Loop shape | single pointer, slide by 1 | two pointers, inner while to contract |
| Trigger | "subarray of size k", "average of k" | "longest/shortest subarray such that…" |
| Update | add entering, drop leaving | expand right always; contract left conditionally |

**Interview trap:** For the *variable* window (e.g. "smallest subarray with sum ≥ target"), forgetting the inner `while` that contracts `left` as long as the window stays valid — using an `if` only shrinks once per step and misses the minimum. Fixed window uses a single slide; variable window needs the contraction loop.

---

## Hashing Patterns

### Q12. What are the three canonical hashing patterns, and when does each apply?

**Answer:**

Hashing trades O(n) space for O(1) average lookups, collapsing an O(n²) nested-loop into O(n). The three patterns:

1. **Seen-set (membership):** "Have I encountered x before?" — Two Sum (complement lookup), detecting duplicates, cycle membership.
2. **Frequency map (count):** "How many times does each value appear?" — anagrams, top-K frequent, majority element, group-by.
3. **Index / last-position map:** "Where did I last see x?" — longest-unique-substring, first non-repeating character, "subarray with a given property."

```typescript
// Pattern 1: complement lookup — Two Sum on UNSORTED array, preserving indices.
function twoSumHash(arr: number[], target: number): [number, number] | null {
  const seen = new Map<number, number>(); // value -> index
  for (let i = 0; i < arr.length; i++) {
    const need = target - arr[i];
    if (seen.has(need)) return [seen.get(need)!, i];
    seen.set(arr[i], i);
  }
  return null;
}
console.assert(JSON.stringify(twoSumHash([3, 2, 4], 6)) === "[1,2]", "unsorted two sum");

// Pattern 2: frequency map — are two strings anagrams?
function isAnagram(a: string, b: string): boolean {
  if (a.length !== b.length) return false; // early out — different length can't match
  const freq = new Map<string, number>();
  for (const ch of a) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  for (const ch of b) {
    const c = freq.get(ch);
    if (!c) return false;          // char absent or already exhausted
    freq.set(ch, c - 1);
  }
  return true; // lengths equal + every b char consumed => balanced
}
console.assert(isAnagram("listen", "silent") === true, "anagram");
console.assert(isAnagram("rat", "car") === false, "not anagram");

// Pattern 3: canonical-key grouping — group anagrams together.
function groupAnagrams(words: string[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const w of words) {
    const key = [...w].sort().join(""); // sorted letters = anagram fingerprint
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(w);
  }
  return [...groups.values()];
}
console.assert(groupAnagrams(["eat", "tea", "tan", "ate"]).length === 2, "2 groups");
```

**Interview trap:** "O(1) hash lookup" is *average* case. Worst case, with adversarial keys causing collisions, it degrades to O(n) per lookup. For interviews you can state O(n) average total, but acknowledge the worst case exists — and note that in adversarial contexts (untrusted input hashing to the same bucket = a real DoS vector) you'd reach for a randomized hash or a balanced tree with guaranteed O(log n).

---

### Q13. Prefix-sum + hashmap: count subarrays that sum to k. Why is this hard to see?

**Answer:**

The brute force checks every subarray, O(n²). The insight: a subarray `(i, j]` sums to `k` iff `prefix[j] - prefix[i] === k`, i.e. `prefix[i] === prefix[j] - k`. So as you sweep computing running prefix sums, **count how many earlier prefixes equal `currentPrefix - k`** using a frequency map. This is the same complement trick as Two Sum, applied to prefix sums.

```typescript
/** Number of contiguous subarrays whose elements sum to exactly k. Handles negatives. */
function subarraySumEqualsK(arr: number[], k: number): number {
  const prefixCounts = new Map<number, number>([[0, 1]]); // empty prefix has sum 0, once
  let running = 0;
  let count = 0;
  for (const x of arr) {
    running += x;
    count += prefixCounts.get(running - k) ?? 0; // how many earlier prefixes enable a k-sum
    prefixCounts.set(running, (prefixCounts.get(running) ?? 0) + 1);
  }
  return count;
}

console.assert(subarraySumEqualsK([1, 1, 1], 2) === 2, "[1,1] twice");
console.assert(subarraySumEqualsK([1, 2, 3], 3) === 2, "[3] and [1,2]");
console.assert(subarraySumEqualsK([1, -1, 1], 0) === 2, "negatives / zero");
```

O(n) time, O(n) space.

**Interview trap 1:** The seed `[[0, 1]]`. Without initializing "prefix sum 0 seen once," you miss subarrays that start at index 0 (where `running` itself equals `k`). This single line is the most-forgotten detail; the interviewer feeds `[3], k=3` to expose it.

**Interview trap 2:** Suggesting sliding window instead. Sliding window works only for **all-positive** arrays (where growing the window monotonically grows the sum). With **negatives**, the sum isn't monotonic, so window contraction logic breaks — you *must* use prefix-sum + hashmap. Recognizing "negatives present ⇒ no sliding window" is a senior-level distinction.

---

## Stack & Queue Patterns

### Q14. Valid parentheses and the "monotonic stack" family — when is a stack the answer?

**Answer:**

Reach for a **stack** when the problem has nested/matching structure or when "the most recent unresolved thing" must be resolved first (LIFO): bracket matching, expression evaluation, undo, and the *monotonic stack* used for "next greater/smaller element" problems.

```typescript
/** Are all brackets correctly matched and nested? */
function isValidParens(s: string): boolean {
  const close: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const stack: string[] = [];
  for (const ch of s) {
    if (ch === "(" || ch === "[" || ch === "{") {
      stack.push(ch);                        // opener: remember it
    } else if (ch in close) {
      if (stack.pop() !== close[ch]) return false; // closer must match most-recent opener
    }
  }
  return stack.length === 0; // leftover openers => unbalanced
}

console.assert(isValidParens("()[]{}") === true, "flat");
console.assert(isValidParens("([{}])") === true, "nested");
console.assert(isValidParens("(]") === false, "mismatch");
console.assert(isValidParens("(((") === false, "unclosed");
console.assert(isValidParens("())") === false, "extra close");
```

The **monotonic stack** solves "next greater element" in O(n): keep a stack of indices whose values are decreasing; when a larger value arrives, it's the "next greater" for everything popped.

```typescript
/** For each element, the next element to its right that is strictly greater, else -1. */
function nextGreater(arr: number[]): number[] {
  const res = new Array(arr.length).fill(-1);
  const stack: number[] = []; // holds indices with strictly decreasing values
  for (let i = 0; i < arr.length; i++) {
    while (stack.length && arr[stack[stack.length - 1]] < arr[i]) {
      res[stack.pop()!] = arr[i]; // arr[i] is the next-greater for the popped index
    }
    stack.push(i);
  }
  return res;
}
console.assert(JSON.stringify(nextGreater([2, 1, 2, 4, 3])) === "[4,2,4,-1,-1]", "monotonic");
```

**Interview trap:** For valid parentheses, forgetting the *final* `stack.length === 0` check. `"((("` never mismatches during the scan — the bug only shows at the end. And with mixed non-bracket characters (some variants include letters), the `else if (ch in close)` guard prevents treating them as closers. Trace `"((("` aloud to demonstrate the end-check matters.

---

### Q15. Implement a queue with two stacks — and why does anyone care?

**Answer:**

A queue is FIFO; a stack is LIFO. You can build one from two stacks by reversing twice. This tests whether you understand amortized analysis, which is a favorite senior probe.

```typescript
class QueueFromStacks<T> {
  private inbox: T[] = [];  // newest elements pushed here
  private outbox: T[] = []; // reversed order — front of queue is on top

  enqueue(x: T): void {
    this.inbox.push(x); // O(1)
  }

  dequeue(): T | undefined {
    if (this.outbox.length === 0) {
      // Transfer only when outbox is empty: reverses inbox into FIFO order.
      while (this.inbox.length) this.outbox.push(this.inbox.pop()!);
    }
    return this.outbox.pop();
  }

  peek(): T | undefined {
    if (this.outbox.length === 0) {
      while (this.inbox.length) this.outbox.push(this.inbox.pop()!);
    }
    return this.outbox[this.outbox.length - 1];
  }

  get size(): number {
    return this.inbox.length + this.outbox.length;
  }
}

const q = new QueueFromStacks<number>();
q.enqueue(1); q.enqueue(2); q.enqueue(3);
console.assert(q.dequeue() === 1, "FIFO 1");
q.enqueue(4);
console.assert(q.dequeue() === 2, "FIFO 2");
console.assert(q.dequeue() === 3, "FIFO 3");
console.assert(q.dequeue() === 4, "FIFO 4");
console.assert(q.dequeue() === undefined, "empty");
```

**Amortized analysis (say this aloud):** A single `dequeue` can be O(n) when it triggers a transfer, but each element is moved from inbox to outbox *at most once* over its lifetime. Across n operations the total transfer work is O(n), so the **amortized cost per operation is O(1).** The key is transferring *only when outbox is empty* — transferring every time would be genuinely O(n) per op.

**Interview trap:** Transferring on every `dequeue` (i.e. always moving inbox→outbox), which is correct but O(n) each — the whole point is the amortized O(1), which requires the "only refill when empty" guard. If asked "worst case single operation?" the honest answer is O(n); "amortized?" is O(1). Distinguishing the two is the signal they want.

---

### Q16. Implement an LRU cache. (The most common "real system" DSA question — ties to caching everywhere.)

**Answer:**

An LRU cache needs O(1) `get` and `put` with eviction of the least-recently-used key when full. The standard structure: a hash map for O(1) lookup plus a doubly linked list for O(1) recency reordering. In TypeScript/JS, `Map` preserves insertion order, which lets you fake the linked list cleanly — but know the underlying hashmap+DLL design because interviewers ask.

```typescript
class LRUCache<K, V> {
  private map = new Map<K, V>(); // JS Map keeps insertion order => iteration front = oldest
  constructor(private capacity: number) {}

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const val = this.map.get(key)!;
    this.map.delete(key); // remove and re-insert => moves key to "most recent" (end)
    this.map.set(key, val);
    return val;
  }

  put(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key); // will re-add as most-recent
    else if (this.map.size >= this.capacity) {
      const oldest = this.map.keys().next().value as K; // first key = least recent
      this.map.delete(oldest); // evict LRU
    }
    this.map.set(key, value);
  }
}

const cache = new LRUCache<string, number>(2);
cache.put("a", 1);
cache.put("b", 2);
console.assert(cache.get("a") === 1, "hit a (now a is most recent)");
cache.put("c", 3); // capacity 2 => evicts b (LRU), not a
console.assert(cache.get("b") === undefined, "b evicted");
console.assert(cache.get("a") === 1, "a survived");
console.assert(cache.get("c") === 3, "c present");
```

The DLL+hashmap version (what to describe if they ban `Map`'s ordering): the hash map maps key → node; the doubly linked list orders nodes by recency with the head as most-recent and tail as least-recent. `get` unlinks a node and re-inserts at head (O(1) with prev/next pointers); `put` on a full cache removes the tail node and deletes its key. Both O(1) because a DLL supports O(1) removal *given the node* — which the hash map hands you directly, avoiding any O(n) search.

**Interview trap:** Using a plain array for recency ("move to front"), which is O(n) per access because array shifts are linear. The whole reason for the doubly linked list is O(1) removal from the middle. If you propose an array and don't flag the O(n), it's a red flag; propose the hashmap+DLL and state why it's O(1).

**Production war story:** A team shipped an LRU built on an array `splice`-to-front. Fine in tests with 100 keys; under production load with a 50k-entry cache and thousands of gets/sec, the O(n) splices dominated CPU and the cache became slower than the database it was meant to protect. Rewriting to hashmap+DLL dropped p99 latency 40x. The interview question is a direct proxy for this real failure.

---

## Sorting & Selection

### Q17. What sorting facts must you state without hesitation?

**Answer:**

You won't usually *implement* a sort in an FDE round, but you must reason about them:

| Algorithm | Time (avg / worst) | Space | Stable? | Notes |
|---|---|---|---|---|
| Quicksort | O(n log n) / O(n²) | O(log n) | No | Fast in practice; worst case on bad pivots (sorted input + naive pivot) |
| Mergesort | O(n log n) / O(n log n) | O(n) | Yes | Guaranteed n log n; stable; used for linked lists & external sort |
| Heapsort | O(n log n) / O(n log n) | O(1) | No | In-place, guaranteed, but poor cache locality |
| Insertion | O(n²) / O(n²) | O(1) | Yes | O(n) on nearly-sorted; used as small-array base case |
| Counting/Radix | O(n + k) | O(n + k) | Yes | Non-comparison; only for bounded integer keys |

Facts to volunteer: comparison sorts have an **Ω(n log n) lower bound** (you can't beat it by comparisons alone — there are n! possible orderings and each comparison yields one bit). JS's `Array.prototype.sort` is stable (spec-guaranteed since ES2019) and sorts *lexicographically by default* — `[10, 2, 1].sort()` gives `[1, 10, 2]`, so **always pass a comparator for numbers**: `.sort((a, b) => a - b)`.

**Interview trap:** `[10, 2, 1].sort()` returning `[1, 10, 2]` because default sort coerces to strings. This bites people in real code constantly. Always `.sort((a, b) => a - b)` for numeric sorts and *say* why.

---

### Q18. Quickselect: find the K-th smallest in O(n) average. When over a heap?

**Answer:**

Quickselect is quicksort's one-sided cousin: partition around a pivot, but only recurse into the side containing the K-th position. Average O(n) (versus O(n log n) for a full sort or O(n log k) for a heap).

```typescript
/** K-th smallest element (1-based k). Mutates a copy; average O(n). */
function quickselect(nums: number[], k: number): number {
  const arr = [...nums];
  let lo = 0, hi = arr.length - 1;
  const target = k - 1; // 0-based index we want in sorted order
  while (lo <= hi) {
    const p = partition(arr, lo, hi);
    if (p === target) return arr[p];
    if (p < target) lo = p + 1; // K-th is to the right of pivot
    else hi = p - 1;            // K-th is to the left
  }
  return -1; // k out of range
}

function partition(arr: number[], lo: number, hi: number): number {
  const pivot = arr[hi]; // simple last-element pivot (see trap re: randomization)
  let i = lo;
  for (let j = lo; j < hi; j++) {
    if (arr[j] < pivot) { [arr[i], arr[j]] = [arr[j], arr[i]]; i++; }
  }
  [arr[i], arr[hi]] = [arr[hi], arr[i]];
  return i; // final resting index of the pivot
}

console.assert(quickselect([3, 2, 1, 5, 4], 2) === 2, "2nd smallest");
console.assert(quickselect([3, 2, 1, 5, 4], 5) === 5, "largest");
console.assert(quickselect([7], 1) === 7, "single");
```

**Quickselect vs heap for "K-th / top-K":**

| | Quickselect | Min-heap of size K |
|---|---|---|
| Time | O(n) average, O(n²) worst | O(n log k) guaranteed |
| Space | O(1) (in place) | O(k) |
| Streaming / can't hold all n? | No (needs full array) | **Yes** — process one at a time |
| Stable / preserves order | No | No |

**Interview trap:** The O(n²) worst case. A naive last-element pivot degrades to O(n²) on already-sorted input. Mitigate with a **random pivot** (`Math.floor(Math.random()*(hi-lo+1))+lo`, swapped to the end before partitioning) — this makes worst case astronomically unlikely. Mention this even if you code the simple version, and note that if you need a *guarantee* (adversarial input) you use the heap's O(n log k) or median-of-medians. For **streaming** data where you can't hold all n in memory, the min-heap wins outright — quickselect isn't even applicable.

---

## Recursion Fundamentals (bridge to file 02)

### Q19. Reverse a linked list — iteratively and recursively. State the space trade-off.

**Answer:**

```typescript
class ListNode {
  constructor(public val: number, public next: ListNode | null = null) {}
}

/** Iterative reversal: O(n) time, O(1) space. */
function reverseIterative(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null;
  let curr = head;
  while (curr) {
    const nextTemp = curr.next; // save before we overwrite
    curr.next = prev;           // reverse the pointer
    prev = curr;                // advance prev
    curr = nextTemp;            // advance curr
  }
  return prev; // new head is the old tail
}

/** Recursive reversal: O(n) time, O(n) space (call stack). */
function reverseRecursive(head: ListNode | null): ListNode | null {
  if (head === null || head.next === null) return head; // base: empty or single
  const newHead = reverseRecursive(head.next); // reverse the rest first
  head.next.next = head; // make the next node point back at me
  head.next = null;      // I become the new tail
  return newHead;
}

function toArray(h: ListNode | null): number[] {
  const out: number[] = [];
  while (h) { out.push(h.val); h = h.next; }
  return out;
}
const list = new ListNode(1, new ListNode(2, new ListNode(3)));
console.assert(JSON.stringify(toArray(reverseIterative(list))) === "[3,2,1]", "iter");
const list2 = new ListNode(1, new ListNode(2, new ListNode(3)));
console.assert(JSON.stringify(toArray(reverseRecursive(list2))) === "[3,2,1]", "rec");
```

Both O(n) time. The iterative version is **O(1) space**; the recursive is **O(n) space** because the call stack goes n deep. For a linked list of a million nodes the recursive version *stack-overflows* — a real reason to prefer iteration for deep/unbounded recursion. Always name the call-stack cost when giving a recursive solution.

**Interview trap:** In the recursive version, forgetting `head.next = null`. Without it the original head still points forward, creating a **cycle** (1↔2) — the reversed list has a loop and any traversal hangs forever. The `head.next.next = head; head.next = null` pair is "point back, then sever forward"; both lines are load-bearing.

---

### Q20. When is recursion the wrong tool, and how do you convert to iteration?

**Answer:**

Recursion is elegant for *tree-shaped* problems (each call branches) but risky for *deep linear* recursion because each frame consumes stack. JavaScript engines do **not** reliably perform tail-call optimization (the ES2015 spec mandated it, but V8/Node never shipped it), so deep recursion overflows regardless of how you write it. Guidelines:

- **Keep recursion** for: tree/graph traversal (depth ~ log n or bounded), backtracking, divide-and-conquer where depth is O(log n). Bounded depth = safe.
- **Convert to iteration** for: linked-list walks, deep DFS on large graphs, any recursion whose depth scales with n. Convert by maintaining an **explicit stack** (for DFS) or **queue** (for BFS), simulating the call stack yourself.

```typescript
/** DFS on a tree, converted from recursion to an explicit stack (no overflow risk). */
interface TreeNode { val: number; children: TreeNode[]; }
function dfsIterative(root: TreeNode | null): number[] {
  if (!root) return [];
  const out: number[] = [];
  const stack: TreeNode[] = [root];
  while (stack.length) {
    const node = stack.pop()!;      // pop = LIFO = depth-first
    out.push(node.val);
    // push children reversed so leftmost is processed first
    for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]);
  }
  return out;
}
const tree: TreeNode = { val: 1, children: [
  { val: 2, children: [] },
  { val: 3, children: [{ val: 4, children: [] }] },
]};
console.assert(JSON.stringify(dfsIterative(tree)) === "[1,2,3,4]", "iterative dfs");
```

Swap the `stack` (pop) for a `queue` (shift) and you get BFS — same skeleton, different container. That equivalence is worth stating: **DFS = stack, BFS = queue**, and both are just an explicit version of the call stack.

**Interview trap:** Claiming "TypeScript optimizes tail calls so my recursion is O(1) space." It doesn't — Node/V8 never implemented TCO. If asked "will this handle a 10-million-node list?", the honest answer for recursion is "no, it stack-overflows around ~10k frames; I'd convert to iteration with an explicit stack." Saying otherwise is a correctness failure.

---

### Q21. Compute the complexity of a recursive function you've never seen — how?

**Answer:**

Use the **recurrence + Master Theorem** shortcut, stated aloud:

- Write the recurrence: `T(n) = a·T(n/b) + O(n^d)` where `a` = number of recursive calls, `n/b` = subproblem size, `O(n^d)` = work done outside recursion (the "combine" step).
- Compare `d` to `log_b(a)`:
  - If `d > log_b(a)`: T(n) = O(n^d) — the top-level work dominates.
  - If `d = log_b(a)`: T(n) = O(n^d · log n) — every level costs the same.
  - If `d < log_b(a)`: T(n) = O(n^(log_b a)) — the leaves dominate.

Worked examples to have ready:

- **Mergesort:** `T(n) = 2T(n/2) + O(n)` → a=2, b=2, d=1, log₂2 = 1 = d → **O(n log n)**.
- **Binary search:** `T(n) = 1T(n/2) + O(1)` → a=1, b=2, d=0, log₂1 = 0 = d → **O(log n)**.
- **Naive Fibonacci:** `T(n) = T(n-1) + T(n-2) + O(1)` — not of Master form (subtractive, not divisive); it's **O(φⁿ)** exponential because the recursion tree branches without memoization. This is the classic motivation for DP (see file 02).

For non-divide-and-conquer recursion, count the **size of the recursion tree** (number of nodes = calls) times **work per node**. Backtracking that explores all subsets is O(2ⁿ) nodes; all permutations is O(n!). State the tree size, not a memorized formula.

**Interview trap:** Giving naive recursive Fibonacci as "O(n)" because "it recurses down to n." It's **O(2ⁿ)** — each call spawns two, and the same subproblems recompute exponentially. Drawing the first three levels of the tree (fib(5) → fib(4)+fib(3) → …) and pointing at the duplicated fib(3) sells both the complexity *and* the memoization fix. This is the single most common recursion-complexity gotcha.

---

### Q22. Give the complete edge-case checklist you run before declaring any solution "done."

**Answer:**

Before you say "I think that's correct," verbally walk this checklist — it catches the bugs interviewers plant:

1. **Empty input** — `[]`, `""`, `null`. Does it return sensibly (0, -1, empty) without throwing?
2. **Single element** — `[x]`. Off-by-one bugs surface here first.
3. **Two elements** — the smallest case where "left/right half" logic can go wrong (rotated search, partition).
4. **All-same / all-duplicate** — `[2,2,2,2]`. Breaks count-by-expansion, breaks rotated-search log-n guarantee.
5. **Target/answer at the boundaries** — first element, last element, just-outside the range.
6. **Not found / no solution** — does it return the sentinel, not crash or return a stale value?
7. **Negative numbers / zero** — breaks all-positive assumptions (sliding window on sums, absolute-value logic).
8. **Overflow** — the `lo + (hi-lo)/2` midpoint; large sums; multiplication.
9. **Already-sorted / reverse-sorted** — the quicksort/quickselect O(n²) trigger.

Run at least items 1, 2, and 5 out loud on *every* problem by tracing them through your code. Finding your own bug during this trace is the strongest positive signal an interviewer can record.

**Interview trap:** Declaring "done" and going silent. The senior move is to *proactively* say "let me trace the empty and single-element cases" and walk them. Interviewers frequently stay quiet to see if you self-verify; candidates who test their own code unprompted are rated a full level higher than those who wait to be told there's a bug.

---

## Rapid-Fire Reference

### Q23. Two-pointer vs sliding-window vs binary-search — how do you pick fast?

**Answer:**

Pattern-recognition cheat sheet for the first 30 seconds:

| You see… | Reach for… |
|---|---|
| "Sorted array" + "find/target" | Binary search |
| "Sorted array" + "pair/triplet summing to…" | Two pointers |
| "Minimum/maximum value such that <predicate is monotonic>" | Binary search on answer space |
| "Longest/shortest **contiguous** subarray/substring such that…" | Sliding window (variable) |
| "Subarray/average of **size k**" | Sliding window (fixed) |
| "Have I seen…", "count of…", "pair summing (unsorted)" | Hash map/set |
| "Matching/nested", "next greater/smaller", "most recent" | Stack (monotonic if greater/smaller) |
| "Level-by-level", "shortest unweighted path" | Queue / BFS |
| "K-th / top-K" | Heap (streaming) or quickselect (in-memory) |
| "All combinations/permutations/subsets" | Backtracking (file 02) |
| "Count ways / min cost / can we reach" over choices | DP (file 02) |

**Interview trap:** Forcing a pattern because you recognized a keyword. "Contiguous" strongly suggests sliding window, but if the array has negatives and you're summing, the window assumption (monotonic sum) breaks and you need prefix-sum + hashmap. Always sanity-check the pattern's *precondition* (sorted? all-positive? monotonic predicate?) before committing.

---

### Q24. What's your answer when the interviewer asks "can you do better?"

**Answer:**

This is almost always a prompt to trade one resource for another. The standard escalation ladder:

1. **O(n²) nested loop → O(n) with a hash map.** Trade O(n) space for time (Two Sum, subarray-sum, duplicate detection). Usually the intended answer.
2. **O(n²) → O(n log n) with sorting**, when the follow-up needs ordering (closest pair, merge intervals, "can't afford O(n) extra space").
3. **O(n log n) sort → O(n)** when a hash structure or counting sort applies (bounded integer keys).
4. **O(n) space → O(1) space** with two pointers/in-place, when the array is sorted or mutation is allowed.
5. **Recompute-everything → incremental** (prefix sums, sliding window's add-one/drop-one).
6. **Full sort → partial** (heap or quickselect) when you only need top-K, not the whole order.

Verbalize the trade: *"I can drop this from O(n²) to O(n) time by spending O(n) space on a hash set — is that trade acceptable here, or is memory the constraint?"* Asking about the constraint shows you understand there's no free lunch, which is exactly the judgment an FDE exercises when tuning a customer's system.

**Interview trap:** Optimizing time when the bottleneck is space (or vice versa) without asking. In a memory-constrained embedded/edge deployment, the O(n)-space hash solution might be *worse* than the O(n log n) in-place sort. "Better" is context-dependent — clarify the binding constraint before you optimize.

---

### Q25. How do you handle "I'm stuck" gracefully in a live round?

**Answer:**

Being stuck isn't disqualifying; *how* you handle it is graded. The recovery moves:

1. **Return to a concrete example.** Trace a small input by hand and watch what a correct algorithm *would* do — the pattern often reveals itself in the mechanics.
2. **State the brute force and optimize from there.** A working O(n²) beats a broken O(n). Interviewers routinely accept brute force then ask you to improve — starting there guarantees you have *something*.
3. **Think out loud about the structure.** "The array is sorted, so I should be exploiting that with binary search or two pointers rather than a linear scan" — narrating the property you're under-using often unsticks you, and lets the interviewer nudge.
4. **Ask a targeted question,** not "I'm stuck." Instead: "Would you expect a better-than-O(n log n) solution here?" — that tells you whether a clever trick exists without giving up.
5. **Don't freeze silently.** Silence reads as "can't collaborate." Even narrating a dead end ("I considered a heap but it doesn't help because…") is positive signal.

**Interview trap:** Erasing everything and starting over in a panic when a small fix would do. Interviewers *want* to see debugging, not a fresh start — keep your work visible, add a print/trace, and reason about *why* the current output is wrong. The FDE job is largely debugging unfamiliar systems in front of a customer; staying calm and methodical while stuck is a direct proxy.

---

### Q26. Summarize the "state it aloud" phrases that signal seniority.

**Answer:**

A compact list of sentences to actually say — each maps a decision to its justification, which is what interviewers score:

- "Let me clarify a few things before I code: input size, duplicates, sorted-ness, and what to return when there's no answer."
- "The brute force is O(n²); since it's sorted I can get O(log n) with binary search — let me confirm that's worth it."
- "I'll keep a half-open interval `[lo, hi)` and the invariant that the answer, if present, stays inside it."
- "This is O(n) time, O(1) space — I only use a constant number of index variables, no recursion stack."
- "The midpoint is `lo + (hi - lo) / 2` to stay overflow-safe."
- "`left` must be monotonically non-decreasing here, otherwise `abba` breaks the window."
- "Hash lookup is O(1) *average*; worst case is O(n) under adversarial collisions."
- "This recursion is O(n) stack depth — for very large inputs I'd convert to an explicit stack to avoid overflow."
- "Amortized O(1), though a single operation can be O(n) when the transfer triggers."
- "Let me trace the empty and single-element cases before I call this done."

**Interview trap:** Reciting these without meaning them. Each phrase must attach to a *real* decision in *your* code — an interviewer will ask "why?" to any of them, and a hollow recitation collapses immediately. The point isn't the phrase; it's that you actually made the decision and can defend it. Practice by solving problems *out loud* until the justification is reflexive.

---

## Summary

FDE live-coding rewards **correctness under communication**, not algorithmic exotica. Master binary search in all its variants (exact, lower/upper bound, rotated, answer-space) until the invariant-and-termination reasoning is reflexive — it is the single most-asked question. Layer on two pointers, sliding window (fixed and variable), the three hashing patterns, and stack/queue structures (valid-parens, monotonic stack, queue-from-stacks, LRU). For every solution, state time *and* space complexity with the *why*, run the empty/single/boundary edge-case checklist aloud, and narrate the clarify→examples→brute-force→optimize→test protocol. The next file (02) extends this to trees, graphs, recursion/backtracking, DP, heaps, and intervals — the structural patterns that round out the FDE coding round.
