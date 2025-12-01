class InvertedIndex:
    """
    The core of Search Engines (Elasticsearch, Google).
    Maps: Word -> List of Document IDs.
    """
    def __init__(self):
        self.index = {} # Map<Word, Set<DocID>>
        
    def add_document(self, doc_id, text):
        words = text.lower().split()
        for word in words:
            if word not in self.index:
                self.index[word] = set()
            self.index[word].add(doc_id)
            
    def search(self, query):
        words = query.lower().split()
        if not words: return set()
        
        # Start with docs containing the first word
        result = self.index.get(words[0], set())
        
        # Intersect with docs containing other words (AND query)
        for word in words[1:]:
            result = result.intersection(self.index.get(word, set()))
            
        return result

if __name__ == "__main__":
    idx = InvertedIndex()
    idx.add_document(1, "The quick brown fox")
    idx.add_document(2, "The lazy dog")
    idx.add_document(3, "The quick red fox")
    
    print(idx.search("quick fox")) # {1, 3}
    print(idx.search("lazy"))      # {2}
