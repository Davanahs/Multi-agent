**Palindrome Checker Implementation**
=====================================

**Introduction**
---------------

This implementation provides a Python class `PalindromeChecker` with a method `is_palindrome` to check whether a given string is a palindrome. The class uses dynamic programming to find the longest palindromic substring and then checks if the entire string is a palindrome.

**Technology Stack**
-------------------

* Python 3.9+
* Pytest 7.1.2+
* unittest 3.10+

**Implementation**
-----------------

```python
# palindrome_checker.py
class PalindromeChecker:
    def is_palindrome(self, s: str) -> bool:
        """
        Checks whether a given string is a palindrome.

        Args:
            s (str): The input string to check.

        Returns:
            bool: True if the string is a palindrome, False otherwise.
        """
        # Remove non-alphanumeric characters and convert to lowercase
        s = ''.join(e for e in s if e.isalnum()).lower()
        
        # Initialize a 2D table to store the longest palindromic substring lengths
        n = len(s)
        dp = [[False] * n for _ in range(n)]
        
        # All substrings of length 1 are palindromes
        for i in range(n):
            dp[i][i] = True
        
        # Check for substrings of length 2
        for i in range(n - 1):
            if s[i] == s[i + 1]:
                dp[i][i + 1] = True
        
        # Check for lengths greater than 2
        for length in range(3, n + 1):
            for i in range(n - length + 1):
                j = i + length - 1
                
                # If the first and last characters are the same, check the substring in between
                if s[i] == s[j] and dp[i + 1][j - 1]:
                    dp[i][j] = True
        
        # Check if the entire string is a palindrome
        return dp[0][n - 1]
```

**Unit Tests**
-------------

We will write unit tests for the `PalindromeChecker` class using Pytest.

```python
# test_palindrome_checker.py
import pytest
from palindrome_checker import PalindromeChecker

def test_palindrome_checker():
    checker = PalindromeChecker()
    
    # Test word palindromes
    assert checker.is_palindrome("madam")
    assert checker.is_palindrome("level")
    
    # Test phrase palindromes
    assert checker.is_palindrome("a man, a plan, a canal, Panama!")
    
    # Test number palindromes
    assert checker.is_palindrome("12321")
    
    # Test non-palindromes
    assert not checker.is_palindrome("hello")
    assert not checker.is_palindrome("world")
```

**Setup Instructions**
-----------------------

1. Install the required libraries by running `pip install pytest` in your terminal.
2. Create a new file called `palindrome_checker.py` and paste the implementation code into it.
3. Create a new file called `test_palindrome_checker.py` and paste the unit test code into it.
4. Run the unit tests by executing `pytest` in your terminal.
5. Verify that all tests pass and the implementation is correct.

**Commit Message**
-----------------

`Added palindrome checker implementation with unit tests`

**API Documentation**
---------------------

```markdown
# PalindromeChecker

## is_palindrome

Checks whether a given string is a palindrome.

### Args

* `s (str)`: The input string to check.

### Returns

* `bool`: True if the string is a palindrome, False otherwise.
```