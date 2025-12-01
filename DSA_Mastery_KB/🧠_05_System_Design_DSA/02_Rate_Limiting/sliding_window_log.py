import time
from collections import deque

class RateLimiter:
    """
    Sliding Window Log Algorithm.
    Precision: High
    Space: O(K) where K is limit.
    """
    def __init__(self, limit, window_seconds):
        self.limit = limit
        self.window_seconds = window_seconds
        self.requests = deque()
        
    def allow_request(self):
        now = time.time()
        
        # 1. Remove outdated timestamps
        while self.requests and self.requests[0] < now - self.window_seconds:
            self.requests.popleft()
            
        # 2. Check count
        if len(self.requests) < self.limit:
            self.requests.append(now)
            return True
            
        return False

if __name__ == "__main__":
    limiter = RateLimiter(2, 1) # 2 requests per 1 second
    
    print(f"Req 1: {limiter.allow_request()}") # True
    print(f"Req 2: {limiter.allow_request()}") # True
    print(f"Req 3: {limiter.allow_request()}") # False
    
    time.sleep(1.1)
    print(f"Req 4: {limiter.allow_request()}") # True (Window slid)
