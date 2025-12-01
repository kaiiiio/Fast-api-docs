class StringBuilder:
    """
    Why use StringBuilder?
    String concatenation in loops is O(N^2) because strings are immutable.
    StringBuilder uses a dynamic array to achieve O(N).
    """
    def __init__(self):
        self.buffer = []
        
    def append(self, s):
        # O(1) amortized
        self.buffer.append(s)
        
    def to_string(self):
        # O(N) - Join all parts at once
        return "".join(self.buffer)

if __name__ == "__main__":
    sb = StringBuilder()
    
    # Bad Way (O(N^2)):
    # s = ""
    # for i in range(1000): s += str(i)
    
    # Good Way (O(N)):
    for i in range(1000):
        sb.append(str(i))
        
    print(len(sb.to_string()))
