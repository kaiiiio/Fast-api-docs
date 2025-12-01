# Tree Utilities: Traversal, Search, Construction

Tree data structure algorithms and utilities.

## 1. Binary Tree Node

### Question
Implement a binary tree node class.

### Solution

```javascript
class TreeNode {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

// Usage
const root = new TreeNode(1);
root.left = new TreeNode(2);
root.right = new TreeNode(3);
root.left.left = new TreeNode(4);
root.left.right = new TreeNode(5);
```

---

## 2. Tree Traversal

### Question
Implement in-order, pre-order, and post-order tree traversals.

### Solution

```javascript
// In-order: Left, Root, Right
function inOrderTraversal(root, result = []) {
    if (root) {
        inOrderTraversal(root.left, result);
        result.push(root.value);
        inOrderTraversal(root.right, result);
    }
    return result;
}

// Pre-order: Root, Left, Right
function preOrderTraversal(root, result = []) {
    if (root) {
        result.push(root.value);
        preOrderTraversal(root.left, result);
        preOrderTraversal(root.right, result);
    }
    return result;
}

// Post-order: Left, Right, Root
function postOrderTraversal(root, result = []) {
    if (root) {
        postOrderTraversal(root.left, result);
        postOrderTraversal(root.right, result);
        result.push(root.value);
    }
    return result;
}

// Level-order (BFS)
function levelOrderTraversal(root) {
    if (!root) return [];
    
    const result = [];
    const queue = [root];
    
    while (queue.length > 0) {
        const node = queue.shift();
        result.push(node.value);
        
        if (node.left) queue.push(node.left);
        if (node.right) queue.push(node.right);
    }
    
    return result;
}

// Usage
const tree = {
    value: 1,
    left: {
        value: 2,
        left: { value: 4, left: null, right: null },
        right: { value: 5, left: null, right: null }
    },
    right: {
        value: 3,
        left: null,
        right: null
    }
};

console.log(inOrderTraversal(tree)); // [4, 2, 5, 1, 3]
console.log(preOrderTraversal(tree)); // [1, 2, 4, 5, 3]
console.log(postOrderTraversal(tree)); // [4, 5, 2, 3, 1]
console.log(levelOrderTraversal(tree)); // [1, 2, 3, 4, 5]
```

---

## 3. Maximum Depth

### Question
Implement a function that finds the maximum depth of a binary tree.

### Solution

```javascript
function maxDepth(root) {
    if (!root) return 0;
    
    const leftDepth = maxDepth(root.left);
    const rightDepth = maxDepth(root.right);
    
    return Math.max(leftDepth, rightDepth) + 1;
}

// Iterative BFS
function maxDepthBFS(root) {
    if (!root) return 0;
    
    const queue = [{ node: root, depth: 1 }];
    let maxDepth = 0;
    
    while (queue.length > 0) {
        const { node, depth } = queue.shift();
        maxDepth = Math.max(maxDepth, depth);
        
        if (node.left) {
            queue.push({ node: node.left, depth: depth + 1 });
        }
        if (node.right) {
            queue.push({ node: node.right, depth: depth + 1 });
        }
    }
    
    return maxDepth;
}
```

---

## 4. Same Tree

### Question
Implement a function that determines if two binary trees are the same.

### Solution

```javascript
function isSameTree(p, q) {
    if (!p && !q) return true;
    if (!p || !q) return false;
    if (p.value !== q.value) return false;
    
    return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
}

// Iterative
function isSameTreeIterative(p, q) {
    const stack = [[p, q]];
    
    while (stack.length > 0) {
        const [node1, node2] = stack.pop();
        
        if (!node1 && !node2) continue;
        if (!node1 || !node2) return false;
        if (node1.value !== node2.value) return false;
        
        stack.push([node1.left, node2.left]);
        stack.push([node1.right, node2.right]);
    }
    
    return true;
}
```

---

## 5. Invert Binary Tree

### Question
Implement a function that inverts a binary tree.

### Solution

```javascript
function invertTree(root) {
    if (!root) return null;
    
    // Swap left and right
    [root.left, root.right] = [root.right, root.left];
    
    // Recursively invert subtrees
    invertTree(root.left);
    invertTree(root.right);
    
    return root;
}

// Iterative
function invertTreeIterative(root) {
    if (!root) return null;
    
    const queue = [root];
    
    while (queue.length > 0) {
        const node = queue.shift();
        
        // Swap children
        [node.left, node.right] = [node.right, node.left];
        
        if (node.left) queue.push(node.left);
        if (node.right) queue.push(node.right);
    }
    
    return root;
}
```

---

## 6. Binary Search Tree

### Question
Implement a binary search tree with insert, search, and delete operations.

### Solution

```javascript
class BST {
    constructor() {
        this.root = null;
    }
    
    insert(value) {
        this.root = this._insert(this.root, value);
    }
    
    _insert(node, value) {
        if (!node) {
            return new TreeNode(value);
        }
        
        if (value < node.value) {
            node.left = this._insert(node.left, value);
        } else if (value > node.value) {
            node.right = this._insert(node.right, value);
        }
        
        return node;
    }
    
    search(value) {
        return this._search(this.root, value);
    }
    
    _search(node, value) {
        if (!node || node.value === value) {
            return node;
        }
        
        if (value < node.value) {
            return this._search(node.left, value);
        } else {
            return this._search(node.right, value);
        }
    }
    
    delete(value) {
        this.root = this._delete(this.root, value);
    }
    
    _delete(node, value) {
        if (!node) return null;
        
        if (value < node.value) {
            node.left = this._delete(node.left, value);
        } else if (value > node.value) {
            node.right = this._delete(node.right, value);
        } else {
            // Node to delete found
            if (!node.left) return node.right;
            if (!node.right) return node.left;
            
            // Node has two children
            const minNode = this._findMin(node.right);
            node.value = minNode.value;
            node.right = this._delete(node.right, minNode.value);
        }
        
        return node;
    }
    
    _findMin(node) {
        while (node.left) {
            node = node.left;
        }
        return node;
    }
}
```

---

## 7. Validate BST

### Question
Implement a function that validates if a binary tree is a valid BST.

### Solution

```javascript
function isValidBST(root, min = -Infinity, max = Infinity) {
    if (!root) return true;
    
    if (root.value <= min || root.value >= max) {
        return false;
    }
    
    return isValidBST(root.left, min, root.value) &&
           isValidBST(root.right, root.value, max);
}

// In-order traversal approach
function isValidBSTInOrder(root) {
    let prev = null;
    
    function inOrder(node) {
        if (!node) return true;
        
        if (!inOrder(node.left)) return false;
        
        if (prev !== null && node.value <= prev) {
            return false;
        }
        prev = node.value;
        
        return inOrder(node.right);
    }
    
    return inOrder(root);
}
```

---

## 8. Lowest Common Ancestor

### Question
Implement a function that finds the lowest common ancestor of two nodes in a BST.

### Solution

```javascript
function lowestCommonAncestor(root, p, q) {
    if (!root) return null;
    
    if (p.value < root.value && q.value < root.value) {
        return lowestCommonAncestor(root.left, p, q);
    }
    
    if (p.value > root.value && q.value > root.value) {
        return lowestCommonAncestor(root.right, p, q);
    }
    
    return root;
}

// Iterative
function lowestCommonAncestorIterative(root, p, q) {
    while (root) {
        if (p.value < root.value && q.value < root.value) {
            root = root.left;
        } else if (p.value > root.value && q.value > root.value) {
            root = root.right;
        } else {
            return root;
        }
    }
    return null;
}
```

---

## 9. Serialize/Deserialize Tree

### Question
Implement functions to serialize and deserialize a binary tree.

### Solution

```javascript
function serialize(root) {
    const result = [];
    
    function preOrder(node) {
        if (!node) {
            result.push('null');
            return;
        }
        
        result.push(node.value.toString());
        preOrder(node.left);
        preOrder(node.right);
    }
    
    preOrder(root);
    return result.join(',');
}

function deserialize(data) {
    const values = data.split(',');
    let index = 0;
    
    function buildTree() {
        if (index >= values.length || values[index] === 'null') {
            index++;
            return null;
        }
        
        const node = new TreeNode(parseInt(values[index]));
        index++;
        
        node.left = buildTree();
        node.right = buildTree();
        
        return node;
    }
    
    return buildTree();
}

// Usage
const tree = {
    value: 1,
    left: { value: 2, left: null, right: null },
    right: { value: 3, left: null, right: null }
};

const serialized = serialize(tree);
const deserialized = deserialize(serialized);
```

---

## Key Patterns

1. **Recursion**: Most tree operations use recursion
2. **DFS**: Depth-first search (pre, in, post order)
3. **BFS**: Breadth-first search (level order)
4. **BST Properties**: Left < Root < Right
5. **Tree Construction**: Build from array/string
6. **Tree Validation**: Check BST properties

## Best Practices

- ✅ Handle null/empty trees
- ✅ Use recursion for simplicity
- ✅ Consider iterative for space optimization
- ✅ Validate BST properties
- ✅ Handle edge cases
- ✅ Optimize for large trees

