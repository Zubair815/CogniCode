"""
Module: backend.auth.security
Purpose: Password hashing and verification utilities using bcrypt.

         Design choices:
         - bcrypt with 12 rounds (SEC-04 in PDR). This is a deliberate
           tradeoff: ~250ms per hash on modern hardware, which is fast
           enough for login UX but slow enough to make brute-force
           attacks impractical.
         - passlib is used for the CryptContext abstraction, but we
           keep bcrypt-specific behavior explicit (72-byte limit).
         - All functions are pure and side-effect free, making them
           trivial to unit test.

Author: Abdullah (BSEF23M526)
Created: 10/10/2026
"""

from passlib.context import CryptContext


# --- Constants ---
# bcrypt silently truncates input beyond 72 bytes. We pre-check to
# surface a clear error rather than silently weakening the password.
BCRYPT_MAX_BYTES = 72
BCRYPT_ROUNDS = 12


# --- CryptContext ---
# `deprecated="auto"` ensures any future algorithm changes are handled
# transparently — old hashes still verify, new ones use the current scheme.
_pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=BCRYPT_ROUNDS,
)


def hash_password(plain_password: str) -> str:
    """
    Hash a plaintext password using bcrypt.

    Args:
        plain_password: The user's plaintext password.

    Returns:
        A bcrypt hash string (60 chars), safe to store in the DB.

    Raises:
        ValueError: If the password is empty or exceeds bcrypt's
                    72-byte limit after UTF-8 encoding.
    """
    if not plain_password:
        raise ValueError("Password cannot be empty.")

    # bcrypt works on bytes, not characters. Non-ASCII passwords can
    # exceed 72 bytes even if they have fewer than 72 characters.
    if len(plain_password.encode("utf-8")) > BCRYPT_MAX_BYTES:
        raise ValueError(
            f"Password exceeds bcrypt's {BCRYPT_MAX_BYTES}-byte limit."
        )

    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    """
    Verify a plaintext password against a stored bcrypt hash.

    This function is constant-time with respect to hash comparison
    (bcrypt's own property). It returns False on any error rather
    than raising, so it is safe to use in login flows without
    try/except at the call site.

    Args:
        plain_password: The password the user just typed.
        password_hash: The stored bcrypt hash.

    Returns:
        True if the password matches, False otherwise.
    """
    if not plain_password or not password_hash:
        return False

    try:
        return _pwd_context.verify(plain_password, password_hash)
    except (ValueError, TypeError):
        # Malformed hash, wrong type, etc. — treat as invalid credentials.
        return False


def needs_rehash(password_hash: str) -> bool:
    """
    Check whether a stored hash should be rehashed.

    Useful when BCRYPT_ROUNDS is increased in a future release: on
    successful login, callers can transparently upgrade the stored
    hash without forcing the user to change their password.
    """
    if not password_hash:
        return True
    return _pwd_context.needs_update(password_hash)