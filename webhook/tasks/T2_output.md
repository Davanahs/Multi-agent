**Solution Overview**

We provide a single, well‑documented Python function `is_palindrome` that determines whether a given string reads the same forward and backward **ignoring case** (and, as is customary for palindrome problems, ignoring any characters that are not letters or digits).  

The implementation uses the **two‑pointer technique**:

*   Normalise the input – lower‑case every character and keep only alphanumeric symbols.
*   Walk from both ends of the cleaned string toward the centre, comparing the characters.
*   As soon as a mismatch is found we can return `False`; otherwise we return `True` when the pointers cross.

This approach runs in **O(n)** time, uses **O(1)** extra space (apart from the temporary cleaned string) and stops early on a mismatch, which is often faster than the naïve `s == s[::-1]` reversal.

---

## Code

```python
#!/usr/bin/env python3
"""
palindrome.py

A tiny module that provides a single public function `is_palindrome`
to test whether a string is a palindrome while ignoring case and
non‑alphanumeric characters.

Typical usage
-------------
>>> from palindrome import is_palindrome
>>> is_palindrome("A man, a plan, a canal: Panama")
True
>>> is_palindrome("Hello, World!")
False
"""

from typing import Iterable


def _clean(s: str) -> str:
    """
    Return a lower‑cased version of *s* that contains only alphanumeric
    characters.

    The function is deliberately kept private – it is an implementation
    detail that the public `is_palindrome` function uses internally.
    """
    # Using a generator expression avoids creating an intermediate list.
    # str.isalnum() covers letters and digits; we lower‑case everything
    # because the palindrome test must be case‑insensitive.
    return "".join(ch.lower() for ch in s if ch.isalnum())


def is_palindrome(s: str) -> bool:
    """
    Determine whether *s* is a palindrome, ignoring case.

    The check is performed on the cleaned version of *s* – i.e. all
    characters that are not letters or digits are discarded before the
    comparison.

    Parameters
    ----------
    s: str
        The string to test.

    Returns
    -------
    bool
        ``True`` if the cleaned string reads the same forward and backward,
        ``False`` otherwise.

    Examples
    --------
    >>> is_palindrome("RaceCar")
    True
    >>> is_palindrome("A man, a plan, a canal: Panama")
    True
    >>> is_palindrome("No lemon, no melon")
    True
    >>> is_palindrome("Hello, World!")
    False
    """
    cleaned = _clean(s)

    # Two‑pointer walk: left starts at the beginning, right at the end.
    left, right = 0, len(cleaned) - 1
    while left < right:
        if cleaned[left] != cleaned[right]:
            # Mismatch → not a palindrome.
            return False
        left += 1
        right -= 1
    # All character pairs matched.
    return True


# --------------------------------------------------------------------------- #
# Simple self‑test when the module is executed directly.
# --------------------------------------------------------------------------- #
if __name__ == "__main__":
    test_cases: Iterable[tuple[str, bool]] = [
        ("RaceCar", True),
        ("A man, a plan, a canal: Panama", True),
        ("No lemon, no melon", True),
        ("Was it a car or a cat I saw?", True),
        ("Hello, World!", False),
        ("", True),                     # empty string is trivially a palindrome
        ("a", True),                    # single character
        ("ab", False),
        ("12321", True),
        ("12345", False),
    ]

    for text, expected in test_cases:
        result = is_palindrome(text)
        status = "PASS" if result == expected else "FAIL"
        print(f"{status}: {text!r:40} → {result} (expected {expected})")
```

---

## How to Use

1. **Copy the file** – Save the code above as `palindrome.py` (or any name you prefer).
2. **Run the module** to see a quick self‑test:

   ```bash
   python palindrome.py
   ```

   You should see a series of `PASS` lines confirming the implementation works for the built‑in test cases.

3. **Import in your own code**:

   ```python
   from palindrome import is_palindrome

   if is_palindrome("Never odd or even"):
       print("It's a palindrome!")
   else:
       print("Not a palindrome.")
   ```

---

## Design Decisions & Best Practices

| Decision | Reason |
|----------|--------|
| **Two‑pointer scan** | O(1) extra memory after cleaning, early exit on mismatch. |
| **Separate `_clean` helper** | Keeps the main algorithm clear and makes the cleaning logic reusable / testable. |
| **Type hints (`str`, `bool`)** | Improves readability and enables static analysis tools (e.g., `mypy`). |
| **Docstrings with Examples** | Provides immediate usage documentation and works with tools like `help()` and Sphinx. |
| **`if __name__ == "__main__"` block** | Allows the file to be both imported and executed as a script for quick verification. |
| **Alphanumeric filtering** | Most palindrome problems ignore punctuation and spaces; this matches the examples in the context (e.g., “A man, a plan, a canal: Panama”). |
| **Lower‑casing only** | Guarantees case‑insensitivity without altering the original string. |

Feel free to adapt the cleaning step if you need a stricter definition (e.g., keep spaces but ignore punctuation). The core palindrome logic remains unchanged.