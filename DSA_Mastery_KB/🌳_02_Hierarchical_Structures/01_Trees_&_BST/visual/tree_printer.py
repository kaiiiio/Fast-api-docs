class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def print_tree(root, level=0, prefix="Root: "):
    """
    Recursively prints the tree in a horizontal structure.
    """
    if not root:
        return
        
    print(" " * (level * 4) + prefix + str(root.val))
    
    if root.left or root.right:
        if root.left:
            print_tree(root.left, level + 1, "L--- ")
        else:
            print(" " * ((level + 1) * 4) + "L--- None")
            
        if root.right:
            print_tree(root.right, level + 1, "R--- ")
        else:
            print(" " * ((level + 1) * 4) + "R--- None")

if __name__ == "__main__":
    #      10
    #     /  \
    #    5    15
    #   / \     \
    #  2   7     20
    
    root = TreeNode(10)
    root.left = TreeNode(5)
    root.right = TreeNode(15)
    root.left.left = TreeNode(2)
    root.left.right = TreeNode(7)
    root.right.right = TreeNode(20)
    
    print("🌳 TREE VISUALIZER 🌳")
    print_tree(root)
