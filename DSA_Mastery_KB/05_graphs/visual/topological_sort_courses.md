# Topological Sort: The Course Schedule

**Problem**: You have courses with prerequisites.
`Math 101 -> Math 102 -> Calculus`
`CS 101 -> Algorithms`

You need a linear order to take them.

## The Algorithm (Kahn's Algorithm)
1.  Calculate **In-Degree** (number of prerequisites) for each node.
2.  Add nodes with `In-Degree == 0` to a Queue.
3.  Process Queue:
    *   Add node to result.
    *   Reduce In-Degree of neighbors.
    *   If neighbor's In-Degree becomes 0, add to Queue.

## Visual
```
[Math 101] --> [Math 102]
     |
     v
[CS 101] ----> [Algorithms]
```
Order: `Math 101, CS 101, Math 102, Algorithms`
