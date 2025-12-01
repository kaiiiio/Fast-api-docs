# Tree Traversals: The Path

Tree:
```
      1
     / \
    2   3
   / \
  4   5
```

## 1. Preorder (Root -> Left -> Right)
"Visit the node BEFORE you visit children."
**Path**: `1 -> 2 -> 4 -> 5 -> 3`
**Use Case**: Copying a tree.

## 2. Inorder (Left -> Root -> Right)
"Visit the node BETWEEN left and right children."
**Path**: `4 -> 2 -> 5 -> 1 -> 3`
**Use Case**: Getting sorted elements from a BST.

## 3. Postorder (Left -> Right -> Root)
"Visit the node AFTER you visit children."
**Path**: `4 -> 5 -> 2 -> 3 -> 1`
**Use Case**: Deleting a tree (delete children first).
