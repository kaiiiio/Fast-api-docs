# Core DSA Patterns - Senior Interview Deep Dive

> Module: CS & ML Foundations | Level: Senior/Staff | FDE Interview Prep

File 01 covered the linear-structure patterns (binary search, two pointers, sliding window, hashing, stack/queue). This file covers the **structural** patterns that make up the second half of FDE coding rounds: trees, graphs, recursion/backtracking, dynamic programming, heaps, and intervals. These are where the "medium" problems live — and where the recognize-and-formulate skill matters more than raw implementation speed. An FDE rarely writes a Dijkstra from scratch on the job, but being able to reason about "this is a shortest-path problem, here's the right traversal, here's the complexity" is exactly the systems-thinking the role demands (the intervals section even ties directly into the Calendly HLD elsewhere in this repo).

All code is TypeScript, runnable with `ts-node`, tests via `console.assert` (no dependencies).

---

## Trees

### Q1. Give the four tree traversals and when each is the right one.

**Answer:**

A binary tree node and the four canonical traversals:

```typescript
class TreeNode {
  constructor(
    public val: number,
    public left: TreeNode | null = null,
    public right: TreeNode | null = null,
  ) {}
}

/** Inorder (Left, Node, Right): yields BST values in SORTED order. */
function inorder(root: TreeNode | null, out: number[] = []): number[] {
  if (!root) return out;
  inorder(root.left, out);
  out.push(root.val);
  inorder(root.right, out);
  return out;
}

/** Preorder (Node, Left, Right): serialize/clone a tree; root seen first. */
function preorder(root: TreeNode | null, out: number[] = []): number[] {
  if (!root) return out;
  out.push(root.val);
  preorder(root.left, out);
  preorder(root.right, out);
  return out;
}

/** Postorder (Left, Right, Node): delete/free a tree; children before parent. */
function postorder(root: TreeNode | null, out: number[] = []): number[] {
  if (!root) return out;
  postorder(root.left, out);
  postorder(root.right, out);
  out.push(root.val);
  return out;
}

/** Level-order (BFS): process tree tier by tier, left to right. */
function levelOrder(root: TreeNode | null): number[][] {
  if (!root) return [];
  const levels: number[][] = [];
  let queue: TreeNode[] = [root];
  while (queue.length) {
    const level: number[] = [];
    const next: TreeNode[] = [];
    for (const node of queue) {
      level.push(node.val);
      if (node.left) next.push(node.left);
      if (node.right) next.push(node.right);
    }
    levels.push(level);
    queue = next;
  }
  return levels;
}

//        4
//      /   \
//     2     6
//    / \   / \
//   1   3 5   7
const bst = new TreeNode(4,
  new TreeNode(2, new TreeNode(1), new TreeNode(3)),
  new TreeNode(6, new TreeNode(5), new TreeNode(7)));
console.assert(JSON.stringify(inorder(bst)) === "[1,2,3,4,5,6,7]", "inorder = sorted");
console.assert(JSON.stringify(preorder(bst)) === "[4,2,1,3,6,5,7]", "preorder");
console.assert(JSON.stringify(postorder(bst)) === "[1,3,2,5,7,6,4]", "postorder");
console.assert(JSON.stringify(levelOrder(bst)) === "[[4],[2,6],[1,5,7]... " ? true : true);
console.assert(JSON.stringify(levelOrder(bst)) === "[[4],[2,6],[1,3,5,7]]", "level-order");
```

Which to pick:

| Traversal | Order | Use it for |
|---|---|---|
| **Inorder** | L, N, R | BST → sorted sequence; validate a BST; K-th smallest in a BST |
| **Preorder** | N, L, R | Serialize/clone (root first lets you rebuild top-down) |
| **Postorder** | L, R, N | Delete/free; any bottom-up aggregation (subtree sums, heights) |
| **Level-order** | tier by tier | "By level" problems, shortest path in unweighted tree, right-side view |

**Interview trap:** Being asked "which traversal gives sorted output for a BST?" and guessing. It's **inorder** — and the reason is the BST invariant (left subtree < node < right subtree) means visiting left-then-node-then-right walks values in ascending order. This unlocks "validate BST" (inorder must be strictly increasing) and "K-th smallest" (stop at the K-th inorder visit) — both common follow-ups.

---

### Q2. DFS vs BFS on a tree: what's the space cost, and when does it matter?

**Answer:**

Both visit every node once → **O(n) time**. The difference is *space*, which depends on tree shape:

- **DFS (recursive or explicit stack):** space = O(h) where h is the tree height. For a balanced tree h = O(log n); for a degenerate (linked-list-like) tree h = O(n).
- **BFS (queue):** space = O(w) where w is the maximum width. For a balanced tree the bottom level holds ~n/2 nodes, so BFS is **O(n)**; for a skewed tree the width is 1, so BFS is O(1).

The practical rule: **DFS is cheaper on wide/balanced trees; BFS is cheaper on deep/narrow trees.** They're mirror images in their worst case.

```typescript
/** Maximum depth via DFS — O(h) stack space. */
function maxDepth(root: TreeNode | null): number {
  if (!root) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}
console.assert(maxDepth(bst) === 3, "depth 3");

/** Minimum depth to a LEAF — BFS is better here: stops at the first leaf. */
function minDepth(root: TreeNode | null): number {
  if (!root) return 0;
  let queue: TreeNode[] = [root];
  let depth = 1;
  while (queue.length) {
    const next: TreeNode[] = [];
    for (const node of queue) {
      if (!node.left && !node.right) return depth; // first leaf reached => shallowest
      if (node.left) next.push(node.left);
      if (node.right) next.push(node.right);
    }
    queue = next;
    depth++;
  }
  return depth;
}
console.assert(minDepth(bst) === 3, "min depth");
```

**Interview trap:** Using DFS for "minimum depth to a leaf." DFS must explore the *entire* tree to be sure it found the shallowest leaf, whereas **BFS returns the instant it hits the first leaf** — it can't have found a shallower one. For a tree that's deep on the left but has a leaf just below the root on the right, DFS wastes the whole left descent. "Shortest/shallowest" ⇒ BFS; "deepest/all paths" ⇒ DFS.

---

### Q3. Insert, search, and delete in a BST. Walk through the delete cases — the part people fumble.

**Answer:**

```typescript
function bstSearch(root: TreeNode | null, target: number): TreeNode | null {
  while (root) {
    if (target === root.val) return root;
    root = target < root.val ? root.left : root.right; // BST invariant guides the branch
  }
  return null;
}

function bstInsert(root: TreeNode | null, val: number): TreeNode {
  if (!root) return new TreeNode(val);
  if (val < root.val) root.left = bstInsert(root.left, val);
  else if (val > root.val) root.right = bstInsert(root.right, val);
  // equal => ignore (or handle duplicates by policy)
  return root;
}

function bstDelete(root: TreeNode | null, val: number): TreeNode | null {
  if (!root) return null;
  if (val < root.val) { root.left = bstDelete(root.left, val); return root; }
  if (val > root.val) { root.right = bstDelete(root.right, val); return root; }

  // Found the node to delete. Three cases:
  if (!root.left) return root.right;   // Case 1a: no left child => splice in right
  if (!root.right) return root.left;   // Case 1b: no right child => splice in left

  // Case 2: two children. Replace value with inorder SUCCESSOR (smallest in right subtree),
  // then delete that successor from the right subtree.
  let succ = root.right;
  while (succ.left) succ = succ.left; // leftmost of right subtree
  root.val = succ.val;
  root.right = bstDelete(root.right, succ.val);
  return root;
}

let tree: TreeNode | null = null;
for (const v of [5, 3, 7, 2, 4, 6, 8]) tree = bstInsert(tree, v);
console.assert(bstSearch(tree, 6) !== null, "found 6");
console.assert(bstSearch(tree, 9) === null, "9 absent");
tree = bstDelete(tree, 3); // node with two children
console.assert(JSON.stringify(inorder(tree)) === "[2,4,5,6,7,8]", "3 removed, still sorted");
```

Search/insert are O(h): O(log n) balanced, O(n) degenerate. Delete has three cases and the third is where people fumble:

1. **Leaf or one child:** splice the node out by returning its (possibly null) single child.
2. **Two children:** you can't just remove it — instead **replace its value with its inorder successor** (the smallest value in the right subtree, found by going right once then left as far as possible), then recursively delete that successor (which is guaranteed to have at most one child, reducing to case 1). Symmetrically you could use the inorder *predecessor* (largest in left subtree).

**Interview trap:** In the two-children case, trying to "move subtrees around" instead of the value-swap trick. The clean answer is *always* successor-or-predecessor replacement, which preserves the BST invariant automatically. Fumbling here — or forgetting that the successor has at most one child so the recursive delete terminates — is the classic BST-delete stumble.

**Production war story:** A team rolled their own BST-backed index and got delete's two-children case subtly wrong, occasionally dropping a subtree on deletion. It passed unit tests (which mostly deleted leaves) and corrupted data only under a specific delete-order in production. Lesson for the interview *and* the job: use the library's balanced tree (or a Map) unless you have a hard reason not to, and if you must hand-roll, test delete on the two-children case explicitly.

---

### Q4. Lowest Common Ancestor (LCA) — in a BST and in a general binary tree.

**Answer:**

LCA of two nodes is the deepest node that has both as descendants. The BST version exploits ordering; the general version is a clean recursion.

```typescript
/** LCA in a BST — O(h). Walk down, choosing the side where both targets lie. */
function lcaBST(root: TreeNode | null, p: number, q: number): TreeNode | null {
  while (root) {
    if (p < root.val && q < root.val) root = root.left;       // both smaller => go left
    else if (p > root.val && q > root.val) root = root.right; // both larger => go right
    else return root; // split point (or one equals root) => this is the LCA
  }
  return null;
}
console.assert(lcaBST(tree, 2, 4)?.val === 5, "LCA(2,4) via split");
console.assert(lcaBST(tree, 6, 8)?.val === 7, "LCA(6,8)");

/** LCA in a GENERAL binary tree — O(n). Postorder: a node is the LCA if p and q
 *  are found in different subtrees (or it IS p or q). */
function lcaGeneral(root: TreeNode | null, p: number, q: number): TreeNode | null {
  if (!root || root.val === p || root.val === q) return root; // base: null or a target
  const left = lcaGeneral(root.left, p, q);
  const right = lcaGeneral(root.right, p, q);
  if (left && right) return root; // targets split across subtrees => root is LCA
  return left ?? right;           // both on one side => bubble up whichever is non-null
}
console.assert(lcaGeneral(bst, 1, 3)?.val === 2, "general LCA(1,3)");
console.assert(lcaGeneral(bst, 1, 5)?.val === 4, "general LCA(1,5) = root");
```

BST LCA is O(h) because ordering tells you which way to descend without exploring. General-tree LCA is O(n) because with no ordering you must search both subtrees; the elegant insight is "if p is found in the left subtree and q in the right (or vice versa), the current node is their meeting point."

**Interview trap:** Applying the BST O(h) trick to a general (unordered) binary tree. Without the BST invariant you *cannot* decide "go left or right" from values alone — you must recurse both sides, making it O(n). Conflating the two costs you correctness. Confirm "is this a BST?" during clarification.

---

## Graphs

### Q5. How do you represent a graph, and what's the trade-off?

**Answer:**

Two representations; pick by density and the operations you need:

```typescript
/** Adjacency list: Map from node -> its neighbors. The default for most problems. */
type Graph = Map<number, number[]>;
function buildGraph(edges: [number, number][], directed = false): Graph {
  const g: Graph = new Map();
  const add = (u: number, v: number) => {
    if (!g.has(u)) g.set(u, []);
    g.get(u)!.push(v);
  };
  for (const [u, v] of edges) {
    add(u, v);
    if (!directed) add(v, u); // undirected => edge both ways
  }
  return g;
}
```

| | Adjacency list | Adjacency matrix |
|---|---|---|
| Space | O(V + E) | O(V²) |
| "Are u,v adjacent?" | O(degree) | O(1) |
| Iterate neighbors of u | O(degree) — optimal | O(V) — wasteful |
| Best for | **Sparse** graphs (E ≪ V²) — most real graphs | **Dense** graphs, or when you need O(1) edge lookup |

**The default is the adjacency list** — real-world graphs (road networks, social graphs, dependency graphs) are sparse, so O(V+E) beats O(V²). Use a matrix only when the graph is dense or the algorithm needs constant-time edge existence checks (e.g. Floyd-Warshall).

**Interview trap:** Defaulting to an adjacency matrix out of textbook habit. For a graph with a million nodes and a few million edges, a matrix would need 10¹² cells — completely infeasible — while the list uses ~few million entries. State "adjacency list, O(V+E) space, because real graphs are sparse" unless told otherwise.

---

### Q6. BFS and DFS on a graph — what's different from trees, and why the visited set?

**Answer:**

The one change from tree traversal: graphs can have **cycles** and multiple paths to a node, so you *must* track a **visited set** or you'll loop forever / reprocess nodes.

```typescript
/** BFS from a source — shortest path in terms of EDGE COUNT (unweighted). O(V+E). */
function bfs(g: Graph, start: number): { order: number[]; dist: Map<number, number> } {
  const order: number[] = [];
  const dist = new Map<number, number>([[start, 0]]);
  const visited = new Set<number>([start]); // mark on ENQUEUE, not dequeue (see trap)
  let queue: number[] = [start];
  while (queue.length) {
    const next: number[] = [];
    for (const node of queue) {
      order.push(node);
      for (const nbr of g.get(node) ?? []) {
        if (!visited.has(nbr)) {
          visited.add(nbr);
          dist.set(nbr, dist.get(node)! + 1);
          next.push(nbr);
        }
      }
    }
    queue = next;
  }
  return { order, dist };
}

/** DFS from a source — iterative with explicit stack (no recursion-depth risk). O(V+E). */
function dfs(g: Graph, start: number): number[] {
  const order: number[] = [];
  const visited = new Set<number>();
  const stack: number[] = [start];
  while (stack.length) {
    const node = stack.pop()!;
    if (visited.has(node)) continue; // may have been queued twice; skip if seen
    visited.add(node);
    order.push(node);
    for (const nbr of g.get(node) ?? []) if (!visited.has(nbr)) stack.push(nbr);
  }
  return order;
}

const g = buildGraph([[1, 2], [1, 3], [2, 4], [3, 4], [4, 5]]);
console.assert(bfs(g, 1).dist.get(5) === 3, "BFS dist 1->5 is 3");
console.assert(dfs(g, 1).length === 5, "DFS reaches all 5");
```

BFS explores in rings of increasing distance, so on an **unweighted** graph it finds the shortest path (fewest edges) — this is its killer application. DFS goes deep first and is the tool for connectivity, cycle detection, and topological sort.

**Interview trap:** Marking a node visited when you *dequeue* it (in BFS) instead of when you *enqueue* it. If you wait until dequeue, the same node can be enqueued many times before it's first processed, blowing up memory and potentially assigning it a wrong distance. **Mark visited at enqueue time.** For the iterative DFS the analogous safety is the `if (visited.has(node)) continue` guard after popping, since a node may sit on the stack more than once.

---

### Q7. Topological sort — what problem does it solve, and how do you detect a cycle?

**Answer:**

Topological sort linearizes a **DAG** (directed acyclic graph) so that every edge u→v has u before v. It answers "in what order can I do these tasks respecting dependencies?" — build systems, course prerequisites, task scheduling. Two implementations; **Kahn's (BFS with in-degrees)** also detects cycles for free.

```typescript
/** Kahn's algorithm: repeatedly emit nodes with in-degree 0. Detects cycles. O(V+E). */
function topoSort(g: Graph, nodes: number[]): number[] | null {
  const indegree = new Map<number, number>(nodes.map((n) => [n, 0]));
  for (const [, nbrs] of g) for (const v of nbrs) indegree.set(v, (indegree.get(v) ?? 0) + 1);

  const queue = nodes.filter((n) => indegree.get(n) === 0); // sources: nothing depends-before
  const order: number[] = [];
  while (queue.length) {
    const node = queue.shift()!;
    order.push(node);
    for (const nbr of g.get(node) ?? []) {
      indegree.set(nbr, indegree.get(nbr)! - 1); // "remove" the edge
      if (indegree.get(nbr) === 0) queue.push(nbr); // newly unblocked
    }
  }
  // If we couldn't emit every node, a cycle blocked the rest.
  return order.length === nodes.length ? order : null;
}

const dag = buildGraph([[1, 2], [1, 3], [3, 4], [2, 4]], true); // directed
const order = topoSort(dag, [1, 2, 3, 4])!;
console.assert(order[0] === 1 && order[order.length - 1] === 4, "1 first, 4 last");

const cyclic = buildGraph([[1, 2], [2, 3], [3, 1]], true);
console.assert(topoSort(cyclic, [1, 2, 3]) === null, "cycle => null");
```

Kahn's intuition: a node with in-degree 0 has no unmet dependencies, so emit it, then decrement its neighbors' in-degrees (as if removing its outgoing edges), which may free up new zero-in-degree nodes. **If any node never reaches in-degree 0, it sits in a cycle** — that's the cycle-detection payoff, and why `order.length !== nodes.length` signals a cycle.

**Interview trap:** Forgetting that topological order is **not unique** — any node ordering consistent with the dependencies is valid, so tests must check the *constraints* (every edge respected), not a single expected array. Also: topo sort only exists for a *DAG*; if the interviewer's graph might have cycles, detecting the cycle (returning null) is part of the correct answer, not an afterthought.

---

### Q8. Dijkstra's algorithm — when do you need it over BFS, and what's the gotcha?

**Answer:**

BFS finds shortest paths only when **all edges cost the same**. The moment edges have **different non-negative weights**, you need Dijkstra: a greedy BFS that always expands the currently-closest unfinalized node, using a **min-heap** (priority queue) keyed by tentative distance.

```typescript
/** Dijkstra shortest paths from src on a weighted graph with non-negative weights.
 *  O((V + E) log V) with a binary heap. */
type WGraph = Map<number, [number, number][]>; // node -> [neighbor, weight][]

function dijkstra(g: WGraph, src: number, n: number): number[] {
  const dist = new Array(n).fill(Infinity);
  dist[src] = 0;
  // Min-heap of [distance, node]. Using a sorted array here for clarity; a real
  // binary heap (see Q13) gives the log factor. Semantics are identical.
  const pq: [number, number][] = [[0, src]];
  const done = new Set<number>();

  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]);       // pop the min (a real heap does this in O(log V))
    const [d, u] = pq.shift()!;
    if (done.has(u)) continue;            // stale entry — already finalized; skip
    done.add(u);
    for (const [v, w] of g.get(u) ?? []) {
      if (d + w < dist[v]) {              // relaxation: found a shorter route to v
        dist[v] = d + w;
        pq.push([dist[v], v]);            // push updated distance (lazy deletion)
      }
    }
  }
  return dist;
}

const wg: WGraph = new Map([
  [0, [[1, 4], [2, 1]]],
  [1, [[3, 1]]],
  [2, [[1, 2], [3, 5]]],
  [3, []],
]);
console.assert(JSON.stringify(dijkstra(wg, 0, 4)) === "[0,3,1,4]", "0->1 via 2 costs 3");
```

Intuition: once you pop a node with the smallest tentative distance, that distance is *final* (no cheaper path can exist, since all remaining edges add non-negative weight). You then "relax" its neighbors — update their tentative distances if going through this node is cheaper.

**Interview trap — the big one:** Dijkstra **requires non-negative weights.** With a negative edge, the "once popped, it's final" invariant breaks — a later, longer path through a negative edge could be cheaper, and Dijkstra will return wrong answers. For negative weights you need **Bellman-Ford** (O(V·E), also detects negative cycles). Stating "Dijkstra assumes non-negative edges; negatives require Bellman-Ford" is the depth signal interviewers fish for. Second trap: use a min-heap, not a linear scan for the minimum — the linear scan makes it O(V²), fine for dense graphs but the heap version O((V+E) log V) is the expected answer for sparse graphs.

---

### Q9. Union-Find (Disjoint Set Union) — what's it for, and what makes it near-O(1)?

**Answer:**

Union-Find tracks a partition of elements into disjoint sets, supporting two near-constant operations: `find(x)` (which set is x in?) and `union(x, y)` (merge two sets). It's the tool for **connectivity** questions — "are these two nodes connected?", counting connected components, cycle detection in an undirected graph, and Kruskal's MST.

```typescript
class UnionFind {
  private parent: number[];
  private rank: number[]; // approximate tree height, for union-by-rank
  public count: number;    // number of disjoint sets

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i); // each element its own root
    this.rank = new Array(n).fill(0);
    this.count = n;
  }

  find(x: number): number {
    // Path compression: point every node on the path directly at the root.
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }

  union(x: number, y: number): boolean {
    const rx = this.find(x), ry = this.find(y);
    if (rx === ry) return false; // already together => this edge would form a cycle
    // Union by rank: attach the shorter tree under the taller to keep trees flat.
    if (this.rank[rx] < this.rank[ry]) this.parent[rx] = ry;
    else if (this.rank[rx] > this.rank[ry]) this.parent[ry] = rx;
    else { this.parent[ry] = rx; this.rank[rx]++; }
    this.count--;
    return true;
  }

  connected(x: number, y: number): boolean {
    return this.find(x) === this.find(y);
  }
}

const uf = new UnionFind(5); // elements 0..4
uf.union(0, 1);
uf.union(1, 2);
uf.union(3, 4);
console.assert(uf.connected(0, 2) === true, "0 and 2 linked");
console.assert(uf.connected(0, 3) === false, "0 and 3 separate");
console.assert(uf.count === 2, "two components");
console.assert(uf.union(0, 2) === false, "already connected => cycle edge");
```

With **both** optimizations — **path compression** (flatten the tree on every find) and **union by rank/size** (always attach smaller under larger) — the amortized cost per operation is O(α(n)), the inverse Ackermann function, which is ≤ 4 for any n in the physical universe. So we call it "effectively O(1)."

**Interview trap:** Implementing only one optimization, or neither. Without path compression and union-by-rank, find can degrade to O(n) (a linked-list-shaped tree), making the whole thing O(n) per op. Also: **Union-Find handles cycle detection in *undirected* graphs** (union returns false ⇒ the edge connects already-connected nodes ⇒ cycle), but **not directed graphs** — for directed cycle detection use DFS colors or Kahn's topo sort. Mixing these up is a common error.

---

## Recursion & Backtracking

### Q10. Backtracking template: generate all subsets. What's the general skeleton?

**Answer:**

Backtracking explores a decision tree: at each step make a choice, recurse, then **undo the choice** (backtrack) to try the next. The skeleton is "choose → explore → un-choose." Subsets, permutations, combinations, N-Queens, and Sudoku are all the same template with different constraints.

```typescript
/** All subsets (the power set) of nums. O(2^n) subsets, O(n) each => O(n·2^n). */
function subsets(nums: number[]): number[][] {
  const result: number[][] = [];
  const path: number[] = [];

  function backtrack(start: number): void {
    result.push([...path]); // every node in the decision tree is a valid subset — snapshot it
    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);      // CHOOSE nums[i]
      backtrack(i + 1);        // EXPLORE with it included (i+1 avoids reusing/duplicating)
      path.pop();              // UN-CHOOSE (backtrack) — restore state for the next choice
    }
  }
  backtrack(0);
  return result;
}
console.assert(subsets([1, 2, 3]).length === 8, "2^3 = 8 subsets");
console.assert(JSON.stringify(subsets([1, 2])) === "[[],[1],[1,2],[2]]", "power set of [1,2]");
```

The three load-bearing lines are the choose/explore/un-choose triple. The `start` index prevents generating the same subset in different orders (so `[1,2]` and `[2,1]` don't both appear). The `[...path]` **copy** is essential — pushing `path` itself stores a reference that later mutations corrupt.

**Interview trap:** Pushing `path` instead of `[...path]` into `result`. Since `path` is mutated in place throughout the recursion, storing the reference means every entry in `result` ends up pointing at the same (finally-empty) array. This produces `[[], [], ...]` and is the single most common backtracking bug — always snapshot with a spread/slice.

---

### Q11. Permutations and combinations — how does the template change?

**Answer:**

Same choose/explore/un-choose skeleton; the difference is how you constrain the choices.

```typescript
/** All permutations — order matters, use each element once. O(n · n!). */
function permutations(nums: number[]): number[][] {
  const result: number[][] = [];
  const path: number[] = [];
  const used = new Array(nums.length).fill(false); // permutations need a "used" marker

  function backtrack(): void {
    if (path.length === nums.length) { result.push([...path]); return; } // complete arrangement
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;   // skip already-placed elements
      used[i] = true; path.push(nums[i]);
      backtrack();
      path.pop(); used[i] = false; // undo BOTH pieces of state
    }
  }
  backtrack();
  return result;
}
console.assert(permutations([1, 2, 3]).length === 6, "3! = 6");

/** Combinations: choose k of n, order doesn't matter. O(k · C(n,k)). */
function combinations(n: number, k: number): number[][] {
  const result: number[][] = [];
  const path: number[] = [];
  function backtrack(start: number): void {
    if (path.length === k) { result.push([...path]); return; }
    for (let i = start; i <= n; i++) {
      path.push(i);
      backtrack(i + 1);        // i+1 => no reuse, and start avoids reorderings
      path.pop();
    }
  }
  backtrack(1);
  return result;
}
console.assert(combinations(4, 2).length === 6, "C(4,2) = 6");
```

The distinguishing state:

| | Constraint mechanism | Complexity |
|---|---|---|
| **Subsets** | `start` index; snapshot at every node | O(n · 2ⁿ) |
| **Combinations** | `start` index; snapshot when `path.length === k` | O(k · C(n,k)) |
| **Permutations** | `used[]` boolean array; snapshot when full length | O(n · n!) |

**Interview trap:** Using a `start` index for permutations (which would prevent revisiting earlier elements and wrongly generate only combinations), or using a `used[]` array for combinations (which would generate all orderings as duplicates). **Order matters ⇒ `used[]`; order doesn't ⇒ `start` index.** And for problems with duplicate input values, you additionally sort and skip `if (i > start && nums[i] === nums[i-1]) continue` to avoid duplicate results — a common "combination sum II" follow-up.

---

### Q12. Solve N-Queens as a backtracking pruning example. Why is pruning the whole point?

**Answer:**

Place N queens on an N×N board so none attack each other. Backtracking places one queen per row and **prunes** any column/diagonal already under attack — pruning early is what makes an exponential search space tractable.

```typescript
/** Count valid N-Queens placements. Prunes with three "occupied" sets. */
function nQueens(n: number): number {
  let solutions = 0;
  const cols = new Set<number>();
  const diag = new Set<number>();     // r - c is constant along a ↘ diagonal
  const antiDiag = new Set<number>(); // r + c is constant along a ↙ diagonal

  function placeRow(row: number): void {
    if (row === n) { solutions++; return; } // placed all N queens successfully
    for (let col = 0; col < n; col++) {
      if (cols.has(col) || diag.has(row - col) || antiDiag.has(row + col)) continue; // PRUNE
      cols.add(col); diag.add(row - col); antiDiag.add(row + col); // choose
      placeRow(row + 1);                                            // explore next row
      cols.delete(col); diag.delete(row - col); antiDiag.delete(row + col); // un-choose
    }
  }
  placeRow(0);
  return solutions;
}
console.assert(nQueens(4) === 2, "4-queens has 2 solutions");
console.assert(nQueens(8) === 92, "8-queens has 92 solutions");
console.assert(nQueens(1) === 1, "trivial");
```

The O(1) constraint checks are the trick: a queen at (row, col) attacks the same **column** (`col`), the same **↘ diagonal** (all cells share `row - col`), and the same **↗ anti-diagonal** (all cells share `row + col`). Three hash sets make "is this square safe?" O(1) instead of scanning the board.

**Why pruning is the point:** the naive "place N queens anywhere and check" is C(N², N) — astronomically large. By placing one per row and rejecting attacked squares *before* recursing, we prune entire branches early. The search is still exponential in the worst case, but pruning cuts it by orders of magnitude — for N=8, from ~4 billion placements to ~2000 explored nodes.

**Interview trap:** Forgetting to undo *all three* sets on backtrack, or using `row + col`/`row - col` incorrectly. If you delete from `cols` but forget `diag`, later rows see phantom attacks and you undercount. The choose and un-choose blocks must be exact mirrors — a good habit is to write them as a matched pair immediately.

---

## Dynamic Programming

### Q13. What's the framework for recognizing and formulating a DP problem?

**Answer:**

DP applies when a problem has **optimal substructure** (the optimal answer is built from optimal answers to subproblems) and **overlapping subproblems** (the same subproblems recur, so caching pays off). The recognize-and-formulate framework, in order:

1. **Recognize the signal.** Phrases: "count the number of ways," "minimum/maximum cost/length," "can you reach/partition," "longest/shortest subsequence." Choices compound and subproblems repeat.
2. **Define the state.** What parameters uniquely identify a subproblem? "dp[i] = the answer considering the first i items" or "dp[i][j] = answer for range [i, j)." Getting the state right is 80% of the work.
3. **Write the recurrence (transition).** How does dp[i] relate to smaller states? This is the recursion you'd write naively — express the answer at a state in terms of already-solved states.
4. **Identify base cases.** The smallest states with known answers (dp[0], empty string, etc.).
5. **Decide direction & order.** Top-down (memoized recursion) or bottom-up (fill a table). Ensure dependencies are computed before they're used.
6. **State complexity.** Usually O(number of states × work per transition).

The **top-down ↔ bottom-up equivalence:** memoization is "recursion + a cache"; tabulation is "fill the same cache iteratively in dependency order." Same states, same recurrence, same complexity — different control flow.

```typescript
/** Fibonacci three ways, illustrating the equivalence. */

// 1. Naive recursion: O(2^n) — exponential, recomputes subproblems. (Don't ship this.)
function fibNaive(n: number): number {
  if (n < 2) return n;
  return fibNaive(n - 1) + fibNaive(n - 2);
}

// 2. Top-down memoization: O(n) time, O(n) space. Recursion + cache.
function fibMemo(n: number, cache = new Map<number, number>()): number {
  if (n < 2) return n;
  if (cache.has(n)) return cache.get(n)!;
  const result = fibMemo(n - 1, cache) + fibMemo(n - 2, cache);
  cache.set(n, result);
  return result;
}

// 3. Bottom-up tabulation, space-optimized: O(n) time, O(1) space.
function fibTab(n: number): number {
  if (n < 2) return n;
  let prev = 0, curr = 1;
  for (let i = 2; i <= n; i++) { [prev, curr] = [curr, prev + curr]; }
  return curr;
}
console.assert(fibNaive(10) === 55 && fibMemo(10) === 55 && fibTab(10) === 55, "all agree");
```

**Interview trap:** Jumping to tabulation without first defining the state and recurrence. The reliable path is **memoize the naive recursion first** (mechanical: add a cache to the recursion you already wrote), confirm correctness, *then* optionally convert to bottom-up for the space win. Interviewers accept a memoized solution; they don't require you to hand-optimize to O(1) space unless they push.

---

### Q14. Solve the 0/1 knapsack — the canonical "choose a subset under a constraint" DP.

**Answer:**

Given items with weights and values and a capacity, maximize total value without exceeding capacity, each item used at most once. State: `dp[i][c]` = max value using the first i items with capacity c.

```typescript
/** 0/1 Knapsack. O(n · capacity) time and space (space-optimizable to O(capacity)). */
function knapsack(weights: number[], values: number[], capacity: number): number {
  const n = weights.length;
  // dp[c] = best value achievable with capacity c, considering items processed so far.
  const dp = new Array(capacity + 1).fill(0);

  for (let i = 0; i < n; i++) {
    // Iterate capacity DOWNWARD so each item is used at most once (see trap).
    for (let c = capacity; c >= weights[i]; c--) {
      // Either skip item i (dp[c]) or take it (values[i] + dp[c - weights[i]]).
      dp[c] = Math.max(dp[c], values[i] + dp[c - weights[i]]);
    }
  }
  return dp[capacity];
}
console.assert(knapsack([1, 3, 4, 5], [1, 4, 5, 7], 7) === 9, "items 3+4 weight => value 9");
console.assert(knapsack([2, 2, 2], [3, 3, 3], 5) === 6, "fits two items");
```

The recurrence for each item: `dp[c] = max(skip it, take it)`. "Take it" adds this item's value to the best solution for the *remaining* capacity `c - weight`. Complexity is O(n × capacity) — note this is **pseudo-polynomial** (polynomial in the numeric *value* of capacity, not its bit-length), which is why knapsack is NP-hard yet solvable by DP for modest capacities.

**Interview trap:** In the space-optimized 1D version, iterating capacity **upward** instead of downward. Going upward lets `dp[c - weight]` already include item i *within the same iteration*, effectively allowing the item to be picked multiple times — that's the **unbounded** knapsack, a different problem. For 0/1 (each item once), iterate `c` from high to low so `dp[c - weight]` still refers to the *previous* item's state. This upward/downward distinction is the exact thing interviewers probe to see if you understand the DP dimension you collapsed.

---

### Q15. Longest Common Subsequence and edit distance — the 2D string DP pattern.

**Answer:**

LCS and edit distance are the archetypal 2D DPs over two sequences; state = `dp[i][j]` = answer for the first i chars of A and first j chars of B.

```typescript
/** Longest Common Subsequence length. O(n·m). */
function lcs(a: string, b: string): number {
  const n = a.length, m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;      // chars match: extend
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);           // skip one char
    }
  }
  return dp[n][m];
}
console.assert(lcs("abcde", "ace") === 3, "ace");
console.assert(lcs("abc", "xyz") === 0, "no common");

/** Edit (Levenshtein) distance: min insert/delete/replace to turn a into b. O(n·m). */
function editDistance(a: string, b: string): number {
  const n = a.length, m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i; // delete all of a's first i chars
  for (let j = 0; j <= m; j++) dp[0][j] = j; // insert all of b's first j chars
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1]; // match: no cost
      else dp[i][j] = 1 + Math.min(
        dp[i - 1][j],     // delete a[i-1]
        dp[i][j - 1],     // insert b[j-1]
        dp[i - 1][j - 1], // replace a[i-1] with b[j-1]
      );
    }
  }
  return dp[n][m];
}
console.assert(editDistance("kitten", "sitting") === 3, "classic = 3");
console.assert(editDistance("", "abc") === 3, "insert 3");
```

Both fill an (n+1)×(m+1) grid where the +1 row/column represent an empty prefix (the base cases). The recurrence branches on "do the current characters match?" — if yes, inherit the diagonal; if no, take the best of the neighboring subproblems plus a cost.

**Why it matters for an FDE:** edit distance underlies fuzzy string matching, spell-check, and diff — and the *intuition* (align two sequences by matching, inserting, or deleting) is exactly what you reason about when comparing document versions or de-duplicating near-identical records in a customer's messy data. LCS underlies `git diff`.

**Interview trap:** Off-by-one in the index mapping. `dp[i][j]` uses characters `a[i-1]` and `b[j-1]` because row/column 0 represent the *empty* prefix. Forgetting the `-1` (indexing `a[i]`) reads past the string and corrupts the answer. State the convention explicitly: "row i means the first i characters, so the i-th character is `a[i-1]`."

---

### Q16. When should you NOT use DP, and how do you spot greedy instead?

**Answer:**

DP is overkill (or wrong) when a **greedy** choice provably leads to the global optimum — when you can make a locally optimal decision and never need to reconsider it. The test: does the problem have the **greedy-choice property** (a locally optimal choice is part of some globally optimal solution)? If yes, greedy is O(n log n) or O(n) instead of DP's polynomial table.

Examples where greedy beats DP:
- **Activity selection / interval scheduling** (max non-overlapping intervals): sort by end time, greedily take the earliest-ending compatible interval. Greedy is provably optimal; DP is unnecessary.
- **Huffman coding, Dijkstra, MST (Kruskal/Prim):** all greedy.
- **Coin change with canonical coin systems** (like US coins): greedy works. But with *arbitrary* denominations (e.g. coins [1, 3, 4], target 6), greedy fails (4+1+1=3 coins vs optimal 3+3=2 coins) — **that** needs DP.

```typescript
/** Coin change (min coins) — needs DP because greedy fails for arbitrary denominations. */
function coinChange(coins: number[], amount: number): number {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0; // zero coins make amount 0
  for (let a = 1; a <= amount; a++) {
    for (const coin of coins) {
      if (coin <= a && dp[a - coin] + 1 < dp[a]) dp[a] = dp[a - coin] + 1;
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}
console.assert(coinChange([1, 3, 4], 6) === 2, "3+3, where greedy would give 3 coins");
console.assert(coinChange([2], 3) === -1, "impossible");
```

**Interview trap:** Applying greedy to coin change with arbitrary denominations and confidently returning a wrong answer. The `[1,3,4]` target `6` case is the textbook counterexample — greedy grabs 4 then needs two 1s (3 coins), but 3+3 is optimal (2 coins). **Greedy needs a proof of the greedy-choice property; without one, use DP.** When unsure, code the DP (always correct) and *mention* "if the denominations are canonical, greedy would also work and be faster" — that shows you know both and when each applies.

---

## Heaps & Priority Queues

### Q17. Implement a min-heap and explain why it's the right structure for "top-K."

**Answer:**

A binary heap is a complete binary tree stored in an array where each parent is ≤ (min-heap) its children. It gives O(log n) insert and extract-min, and O(1) peek — perfect when you repeatedly need the smallest/largest element.

```typescript
class MinHeap {
  private heap: number[] = [];
  get size(): number { return this.heap.length; }
  peek(): number | undefined { return this.heap[0]; }

  push(val: number): void {
    this.heap.push(val);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): number | undefined {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length) { this.heap[0] = last; this.bubbleDown(0); }
    return min;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1; // parent index in array-backed heap
      if (this.heap[parent] <= this.heap[i]) break; // heap property satisfied
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  private bubbleDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2; // children indices
      if (l < n && this.heap[l] < this.heap[smallest]) smallest = l;
      if (r < n && this.heap[r] < this.heap[smallest]) smallest = r;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}

/** Top-K largest elements using a MIN-heap of size K. O(n log k) time, O(k) space. */
function topK(nums: number[], k: number): number[] {
  const heap = new MinHeap();
  for (const n of nums) {
    heap.push(n);
    if (heap.size > k) heap.pop(); // evict the smallest => heap keeps the K largest
  }
  const result: number[] = [];
  while (heap.size) result.push(heap.pop()!);
  return result.reverse(); // largest first
}
console.assert(JSON.stringify(topK([3, 1, 5, 12, 2, 11], 3)) === "[12,11,5]", "top 3");
```

The counter-intuitive trick: to find the K **largest**, use a **min**-heap of size K. The heap's root is the *smallest of the K largest so far*; when a new element exceeds it, evict the root. This keeps only the K biggest in O(log k) per element → **O(n log k)** total, versus O(n log n) to sort everything. When K ≪ n, that's a big win, and crucially it works on a **stream** (you never need all n in memory at once).

**Interview trap:** Using a max-heap for "K largest." A max-heap of all n elements then popping K times is O(n + k log n) and needs O(n) space — worse when K is small and impossible for streams. The size-K *min*-heap is the intended answer. Symmetric rule: **K largest ⇒ size-K min-heap; K smallest ⇒ size-K max-heap.**

---

### Q18. Merge K sorted lists — the heap application that shows up constantly.

**Answer:**

Merging K sorted lists (or streams) into one sorted output: a min-heap holding the current front of each list gives O(N log K) where N is the total element count.

```typescript
/** Merge k sorted arrays into one sorted array via a min-heap of (value, listIdx, pos). */
function mergeKSorted(lists: number[][]): number[] {
  // Min-heap keyed by value; each entry knows which list and position it came from.
  const heap: { val: number; list: number; pos: number }[] = [];
  const swap = (i: number, j: number) => { [heap[i], heap[j]] = [heap[j], heap[i]]; };
  const up = (i: number) => {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p].val <= heap[i].val) break;
      swap(p, i); i = p;
    }
  };
  const down = (i: number) => {
    const n = heap.length;
    while (true) {
      let s = i; const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && heap[l].val < heap[s].val) s = l;
      if (r < n && heap[r].val < heap[s].val) s = r;
      if (s === i) break; swap(s, i); i = s;
    }
  };

  // Seed with the head of each non-empty list.
  for (let i = 0; i < lists.length; i++) {
    if (lists[i].length) { heap.push({ val: lists[i][0], list: i, pos: 0 }); up(heap.length - 1); }
  }

  const result: number[] = [];
  while (heap.length) {
    const top = heap[0];
    result.push(top.val);
    // Advance that list; replace the root with its next element (or remove if exhausted).
    const nextPos = top.pos + 1;
    if (nextPos < lists[top.list].length) {
      heap[0] = { val: lists[top.list][nextPos], list: top.list, pos: nextPos };
    } else {
      const last = heap.pop()!;
      if (heap.length) heap[0] = last;
    }
    if (heap.length) down(0);
  }
  return result;
}
console.assert(
  JSON.stringify(mergeKSorted([[1, 4, 7], [2, 5, 8], [3, 6, 9]])) === "[1,2,3,4,5,6,7,8,9]",
  "3-way merge");
console.assert(JSON.stringify(mergeKSorted([[], [1], []])) === "[1]", "handles empties");
```

The heap always holds at most K elements (one per list), so each of the N total elements costs one O(log K) push/pop → **O(N log K)**. This is exactly how external merge-sort and log-aggregation pipelines combine sorted runs from many sources.

**Interview trap:** The naive "concatenate all and sort" is O(N log N) — worse than O(N log K) when K ≪ N, and it requires materializing everything (no streaming). The heap approach also generalizes to **infinite streams** (merging K sorted event streams by timestamp), which the concat-and-sort cannot. Mentioning the streaming angle shows systems maturity — this pattern is why a merge-K question is really a "do you understand external/streaming merge?" probe.

---

## Intervals

### Q19. Merge overlapping intervals — the pattern (and its tie to the Calendly HLD).

**Answer:**

Interval problems — merge, insert, "can attend all meetings," "minimum meeting rooms" — nearly all start with **sort by start time**, then sweep. This directly underpins the calendar/scheduling systems you'd design in an HLD round (the Calendly design elsewhere in this repo is exactly a booking-conflict problem).

```typescript
/** Merge all overlapping intervals. O(n log n) from the sort, then O(n) sweep. */
function mergeIntervals(intervals: [number, number][]): [number, number][] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]); // sort by start
  const merged: [number, number][] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const [start, end] = sorted[i];
    if (start <= last[1]) {
      last[1] = Math.max(last[1], end); // overlap => extend the current merged interval
    } else {
      merged.push([start, end]);        // gap => start a new interval
    }
  }
  return merged;
}
console.assert(
  JSON.stringify(mergeIntervals([[1, 3], [2, 6], [8, 10], [15, 18]])) === "[[1,6],[8,10],[15,18]]",
  "classic merge");
console.assert(JSON.stringify(mergeIntervals([[1, 4], [4, 5]])) === "[[1,5]]", "touching merges");
```

After sorting by start, two intervals overlap iff the next one's start is ≤ the current merged end. Because they're sorted, you only ever compare against the *last* merged interval — a single linear sweep suffices.

**Interview trap:** The touching-boundary case `[1,4]` and `[4,5]`. Whether these "overlap" depends on the problem's definition of the interval (closed vs half-open). Clarify: "are intervals like [1,4] and [4,5] considered overlapping — do they merge into [1,5], or are they adjacent-but-distinct?" Using `<` vs `<=` in the overlap test flips the answer. Asking this up front is the senior move; silently assuming is a coin flip.

---

### Q20. Minimum meeting rooms — two ways, and which generalizes.

**Answer:**

"Given meeting intervals, what's the minimum number of rooms needed?" is the peak-concurrency question. Two standard approaches:

```typescript
/** Approach A: min-heap of end times. Room count = heap size at the peak. O(n log n). */
function minMeetingRoomsHeap(intervals: [number, number][]): number {
  if (intervals.length === 0) return 0;
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]); // by start
  const endTimes: number[] = []; // acts as a min-heap of the end times of ongoing meetings
  let rooms = 0;
  for (const [start, end] of sorted) {
    endTimes.sort((x, y) => x - y);            // (real code: a heap; sort for clarity)
    if (endTimes.length && endTimes[0] <= start) endTimes.shift(); // a room freed up; reuse it
    endTimes.push(end);
    rooms = Math.max(rooms, endTimes.length);  // peak concurrency = rooms needed
  }
  return rooms;
}

/** Approach B: sweep line. Sort starts and ends separately; count concurrent. O(n log n). */
function minMeetingRoomsSweep(intervals: [number, number][]): number {
  const starts = intervals.map((i) => i[0]).sort((a, b) => a - b);
  const ends = intervals.map((i) => i[1]).sort((a, b) => a - b);
  let rooms = 0, maxRooms = 0, s = 0, e = 0;
  while (s < starts.length) {
    if (starts[s] < ends[e]) { rooms++; s++; maxRooms = Math.max(maxRooms, rooms); } // meeting begins
    else { rooms--; e++; }                                                            // meeting ends
  }
  return maxRooms;
}
const meetings: [number, number][] = [[0, 30], [5, 10], [15, 20]];
console.assert(minMeetingRoomsHeap(meetings) === 2, "heap: 2 rooms");
console.assert(minMeetingRoomsSweep(meetings) === 2, "sweep: 2 rooms");
console.assert(minMeetingRoomsHeap([[7, 10], [2, 4]]) === 1, "non-overlapping: 1 room");
```

Both are O(n log n). The **heap** approach models rooms directly — each heap entry is a busy room's end time; you reuse the earliest-freeing room when possible, and the peak heap size is the answer. The **sweep line** approach counts +1 at every start and −1 at every end in time order; the running maximum is peak concurrency.

**Which generalizes:** the sweep line is the more powerful pattern — it extends to "maximum number of overlapping intervals at any point," "total covered length," and weighted variants, and it's the exact technique behind **rate limiting**, **resource capacity planning**, and the availability-conflict checks in a Calendly-style booking system. The heap approach maps more literally to "assign a resource," which is handy when you also need to *know which* room.

**Interview trap:** In the sweep, the tie-breaking rule when a meeting ends exactly as another begins (`starts[s] === ends[e]`). If a room frees at time 10 and a meeting starts at 10, can they share the room? Using `<` (as above) says yes (end frees before we count the new start), needing fewer rooms; `<=` says no. This is the same closed-vs-half-open ambiguity as Q19 — clarify the boundary semantics, because the "correct" answer depends entirely on it. This tie-break is the single most common bug in interval sweeps.

---

### Q21. Given all these patterns, how do you decide which structure to reach for?

**Answer:**

The structural-pattern selection map for the first minute of a problem:

| Signal in the problem | Reach for |
|---|---|
| Hierarchical / parent-child / "sorted-if-BST" | Tree traversal (inorder for BST-sorted) |
| "Shortest path, all edges equal" | BFS |
| "Reachability, connectivity, cycle (directed)" | DFS |
| "Shortest path, weighted non-negative edges" | Dijkstra (min-heap) |
| "Shortest path with negative edges" | Bellman-Ford |
| "Are these connected? / count components / undirected cycle" | Union-Find |
| "Order respecting dependencies" | Topological sort (Kahn's) |
| "All combinations / permutations / subsets / valid configs" | Backtracking |
| "Count ways / min-max cost / can-we, with overlapping subproblems" | DP |
| "Provable locally-optimal choice" (scheduling, MST) | Greedy |
| "Top-K / K-th / merge-K / streaming smallest" | Heap |
| "Overlapping ranges / peak concurrency / scheduling" | Interval sort + sweep line |

**Interview trap:** Reaching for DP when greedy suffices (slower, more error-prone) or greedy when DP is required (wrong answer — see Q16). And reaching for Dijkstra when BFS suffices (unweighted graph) over-complicates and risks bugs. The discipline is: **identify the problem's structure first, match it to the *simplest* pattern that fits, and only escalate when the simple pattern's precondition fails.** Naming the pattern *and its precondition* aloud ("this is BFS because the graph is unweighted") is the seniority signal — it shows you chose deliberately rather than pattern-matched blindly.

---

### Q22. What complexity should you be ready to state for each structure?

**Answer:**

The table you should be able to recite, because interviewers ask "and the complexity?" after every solution:

| Operation / Algorithm | Time | Space | Note |
|---|---|---|---|
| Tree traversal (any) | O(n) | O(h) DFS / O(w) BFS | h = height, w = max width |
| BST search/insert/delete | O(h) | O(h) | O(log n) balanced, O(n) degenerate |
| Balanced BST (Red-Black/AVL) | O(log n) guaranteed | O(n) | what a library `TreeMap` gives you |
| Graph BFS/DFS | O(V + E) | O(V) | list representation |
| Topological sort | O(V + E) | O(V) | Kahn's or DFS |
| Dijkstra (binary heap) | O((V + E) log V) | O(V) | non-negative weights |
| Union-Find (both optimizations) | O(α(n)) ≈ O(1) amortized | O(n) | inverse Ackermann |
| Backtracking (subsets) | O(n · 2ⁿ) | O(n) recursion depth | exponential is expected |
| Backtracking (permutations) | O(n · n!) | O(n) | |
| DP (2D table) | O(states × transition) | O(states), often reducible | e.g. O(n·m) for LCS |
| Heap push/pop | O(log n) | O(n) | peek O(1) |
| Top-K via heap | O(n log k) | O(k) | streaming-friendly |
| Merge K sorted | O(N log K) | O(K) | N total elements |
| Interval merge / sweep | O(n log n) | O(n) | dominated by the sort |

**Interview trap:** Quoting BST operations as "O(log n)" unconditionally. A *plain* BST is O(h), which is O(n) in the degenerate (sorted-insertion) case; only a **self-balancing** BST guarantees O(log n). If asked "worst case for your BST?" the honest answer is O(n) unless it's balanced. This distinction — average vs guaranteed, and what buys the guarantee (balancing, randomization) — is exactly the depth that separates a senior answer from a memorized one, and it closes the loop with file 01's theme: state complexity precisely, with the conditions that make it true.

---

## Summary

The structural patterns divide cleanly by problem shape. **Trees**: know the four traversals and that inorder sorts a BST; know DFS (O(h) space) vs BFS (O(w) space, wins for shallowest-leaf); nail the BST-delete two-children case and both LCA variants. **Graphs**: adjacency list by default (sparse), visited-set to handle cycles, BFS for unweighted shortest path, Dijkstra (non-negative only) for weighted, topo sort for dependencies, Union-Find for connectivity. **Backtracking**: choose→explore→un-choose, `start` index vs `used[]`, prune early (N-Queens). **DP**: recognize (count/min-max/can-we + overlapping subproblems), define state, write recurrence, memoize then optionally tabulate; know when greedy beats it. **Heaps**: size-K min-heap for K-largest, merge-K for streaming. **Intervals**: sort by start, sweep line for peak concurrency (the Calendly connection), and always clarify closed-vs-half-open boundaries. Across all of them, the meta-skill from file 01 holds: name the pattern *and its precondition*, then state time and space with the *why*.
