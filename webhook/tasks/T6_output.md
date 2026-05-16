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

### PalindromeChecker Class

The `PalindromeChecker` class contains a single method `is_palindrome` that checks whether a given string is a palindrome.

```python
# palindrome_checker.py
class PalindromeChecker:
    """
    A class to check whether a given string is a palindrome.
    """

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
                if s[i] == s[j] and dp[i + 1][j - 1]:
                    dp[i][j] = True
        
        # Check if the entire string is a palindrome
        return dp[0][n - 1]
```

### Usage

To use the `PalindromeChecker` class, create an instance of the class and call the `is_palindrome` method with the input string.

```python
# Example usage
checker = PalindromeChecker()
print(checker.is_palindrome("madam"))  # Output: True
print(checker.is_palindrome("hello"))  # Output: False
```

### Testing

To test the `PalindromeChecker` class, use the `unittest` framework to write test cases.

```python
# test_palindrome_checker.py
import unittest
from palindrome_checker import PalindromeChecker

class TestPalindromeChecker(unittest.TestCase):
    def test_palindrome(self):
        checker = PalindromeChecker()
        self.assertTrue(checker.is_palindrome("madam"))
        self.assertTrue(checker.is_palindrome("A man, a plan, a canal: Panama"))
        self.assertTrue(checker.is_palindrome("Was it a car or a cat I saw?"))

    def test_not_palindrome(self):
        checker = PalindromeChecker()
        self.assertFalse(checker.is_palindrome("hello"))
        self.assertFalse(checker.is_palindrome("python"))
        self.assertFalse(checker.is_palindrome("java"))

if __name__ == "__main__":
    unittest.main()
```

### API Documentation

The `PalindromeChecker` class has a single method `is_palindrome` that takes a string `s` as input and returns a boolean indicating whether the string is a palindrome.

```python
class PalindromeChecker:
    def is_palindrome(self, s: str) -> bool:
        """
        Checks whether a given string is a palindrome.

        Args:
            s (str): The input string to check.

        Returns:
            bool: True if the string is a palindrome, False otherwise.
        """
```

### Commit Message

When committing changes to the code, use a clear and descriptive commit message that follows the standard guidelines.

```bash
git add .
git commit -m "Added PalindromeChecker class with is_palindrome method"
```