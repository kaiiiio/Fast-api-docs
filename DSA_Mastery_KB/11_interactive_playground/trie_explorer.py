class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()
        
    def insert(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        self.is_end = True
        
    def search_prefix(self, prefix):
        node = self.root
        path = []
        print(f"\n🔍 Searching for prefix '{prefix}':")
        
        for char in prefix:
            if char in node.children:
                print(f"  Found '{char}' -> Going deeper")
                path.append(char)
                node = node.children[char]
            else:
                print(f"  ❌ '{char}' not found. Stopping.")
                return None
        print(f"✅ Prefix found! Path: {' -> '.join(path)}")
        return node

if __name__ == "__main__":
    t = Trie()
    words = ["python", "pycharm", "pytest", "java"]
    print(f"📚 Dictionary: {words}")
    for w in words: t.insert(w)
    
    while True:
        query = input("\nType a prefix (or 'q' to quit): ")
        if query == 'q': break
        t.search_prefix(query)
