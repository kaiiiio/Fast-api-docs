# 🧠 When to Use Adjacency List?

## The Two Contenders

### 1. Adjacency Matrix
A 2D Grid `matrix[i][j] = 1`.
*   **Pros**: O(1) to check "Is A connected to B?".
*   **Cons**: Uses O(V^2) space. Huge waste if graph is sparse.

### 2. Adjacency List
A Map `A -> [B, C]`.
*   **Pros**: Uses O(V + E) space. Efficient for sparse graphs (most real-world graphs).
*   **Cons**: O(Degree) to check connection.

## The Verdict
**Always use Adjacency List** unless:
1.  The graph is **Dense** (Every node connected to almost every other node).
2.  You strictly need O(1) edge checking.
