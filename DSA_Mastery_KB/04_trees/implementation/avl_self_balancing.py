class AVLNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None
        self.height = 1

class AVLTree:
    """
    Self-Balancing BST.
    Ensures height difference (Balance Factor) is never > 1.
    """
    def get_height(self, node):
        if not node: return 0
        return node.height
        
    def get_balance(self, node):
        if not node: return 0
        return self.get_height(node.left) - self.get_height(node.right)
        
    def right_rotate(self, y):
        x = y.left
        T2 = x.right
        
        # Rotate
        x.right = y
        y.left = T2
        
        # Update heights
        y.height = 1 + max(self.get_height(y.left), self.get_height(y.right))
        x.height = 1 + max(self.get_height(x.left), self.get_height(x.right))
        
        return x
        
    def left_rotate(self, x):
        y = x.right
        T2 = y.left
        
        # Rotate
        y.left = x
        x.right = T2
        
        # Update heights
        x.height = 1 + max(self.get_height(x.left), self.get_height(x.right))
        y.height = 1 + max(self.get_height(y.left), self.get_height(y.right))
        
        return y
        
    def insert(self, root, val):
        if not root:
            return AVLNode(val)
            
        if val < root.val:
            root.left = self.insert(root.left, val)
        else:
            root.right = self.insert(root.right, val)
            
        root.height = 1 + max(self.get_height(root.left), self.get_height(root.right))
        
        balance = self.get_balance(root)
        
        # Left Left Case
        if balance > 1 and val < root.left.val:
            return self.right_rotate(root)
            
        # Right Right Case
        if balance < -1 and val > root.right.val:
            return self.left_rotate(root)
            
        # Left Right Case
        if balance > 1 and val > root.left.val:
            root.left = self.left_rotate(root.left)
            return self.right_rotate(root)
            
        # Right Left Case
        if balance < -1 and val < root.right.val:
            root.right = self.right_rotate(root.right)
            return self.left_rotate(root)
            
        return root
