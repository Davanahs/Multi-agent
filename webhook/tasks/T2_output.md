**Palindrome Checking Unit Tests**
=====================================

**Introduction**
---------------

This project contains unit tests for palindrome checking. The implementation is based on the properties of palindromes, including symmetry and reversibility.

**Technology Stack**
-------------------

* Python 3.9+
* Pytest 7.1.2+
* unittest 3.10+

**Implementation**
-----------------

We will implement a simple palindrome checker using a Python class. The class will have a method `is_palindrome` that checks whether a given string is a palindrome.

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
        
        # Compare the string with its reverse
        return s == s[::-1]
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
    
    # Test edge cases
    assert checker.is_palindrome("")
    assert checker.is_palindrome("a")

def test_palindrome_checker_empty_string():
    checker = PalindromeChecker()
    assert checker.is_palindrome("")

def test_palindrome_checker_single_character():
    checker = PalindromeChecker()
    assert checker.is_palindrome("a")

def test_palindrome_checker_non_alphanumeric_characters():
    checker = PalindromeChecker()
    assert checker.is_palindrome("A man, a plan, a canal, Panama!")
```

**Setup Instructions**
----------------------

1. Install the required packages by running `pip install pytest`
2. Create a new file `palindrome_checker.py` and add the `PalindromeChecker` class implementation
3. Create a new file `test_palindrome_checker.py` and add the unit tests
4. Run the tests using `pytest`

**Commit Message**
-----------------

`Added palindrome checker implementation and unit tests`

**API Documentation**
---------------------

### PalindromeChecker

#### is_palindrome

Checks whether a given string is a palindrome.

* **Arguments**: `s (str)`: The input string to check.
* **Returns**: `bool`: True if the string is a palindrome, False otherwise.

### Test Cases

* `test_palindrome_checker`: Tests the `is_palindrome` method with various inputs.
* `test_palindrome_checker_empty_string`: Tests the `is_palindrome` method with an empty string.
* `test_palindrome_checker_single_character`: Tests the `is_palindrome` method with a single character.
* `test_palindrome_checker_non_alphanumeric_characters`: Tests the `is_palindrome` method with non-alphanumeric characters.