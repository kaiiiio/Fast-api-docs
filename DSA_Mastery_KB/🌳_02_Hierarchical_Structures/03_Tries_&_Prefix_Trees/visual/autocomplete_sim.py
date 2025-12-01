import time
import os

class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_word = False

class TrieVisualizer:
    def __init__(self):
        self.root = TrieNode()
        
    def insert(self, word):
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_word = True
        
    def visualize_search(self, prefix):
        print(f"🔎 SEARCHING FOR PREFIX: '{prefix}'")
        print("-----------------------------------")
        
        node = self.root
        path = ""
        
        for char in prefix:
            if char in node.children:
                path += char
                print(f"✅ Found '{char}' -> Current Path: {path}")
                node = node.children[char]
                time.sleep(1)
            else:
                print(f"❌ '{char}' NOT FOUND. Path ends at {path}")
                return
                
        print("\n✨ Suggestions:")
        self._dfs_print(node, path)
        
    def _dfs_print(self, node, current_word):
        if node.is_word:
            print(f"  - {current_word}")
            
        for char, child in node.children.items():
            self._dfs_print(child, current_word + char)

if __name__ == "__main__":
    t = TrieVisualizer()
    words = ["cat", "car", "cart", "dog", "do"]
    print(f"📚 Dictionary: {words}\n")
    
    for w in words: t.insert(w)
    
    t.visualize_search("ca")
