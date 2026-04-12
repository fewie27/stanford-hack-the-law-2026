import os
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings

_FILE_MAGIC = b"EVL1"
_SALT_LEN = 16
_NONCE_LEN = 12
_KEY_LEN = 32
_PBKDF2_ITERATIONS = 390_000


def _derive_key(password: str, salt: bytes) -> bytes:
    pepper = settings.app_pepper.encode("utf-8")
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=_KEY_LEN,
        salt=salt + pepper,
        iterations=_PBKDF2_ITERATIONS,
    )
    return kdf.derive(password.encode("utf-8"))


def encrypt_blob(password: str, plaintext: bytes) -> bytes:
    salt = os.urandom(_SALT_LEN)
    key = _derive_key(password, salt)
    nonce = os.urandom(_NONCE_LEN)
    aes = AESGCM(key)
    ciphertext = aes.encrypt(nonce, plaintext, None)
    return _FILE_MAGIC + salt + nonce + ciphertext


def decrypt_blob(password: str, blob: bytes) -> bytes:
    if len(blob) < len(_FILE_MAGIC) + _SALT_LEN + _NONCE_LEN + 16:
        raise ValueError("Truncated or invalid vault blob")
    if blob[: len(_FILE_MAGIC)] != _FILE_MAGIC:
        raise ValueError("Unknown vault format")
    off = len(_FILE_MAGIC)
    salt = blob[off : off + _SALT_LEN]
    off += _SALT_LEN
    nonce = blob[off : off + _NONCE_LEN]
    off += _NONCE_LEN
    ciphertext = blob[off:]
    key = _derive_key(password, salt)
    aes = AESGCM(key)
    return aes.decrypt(nonce, ciphertext, None)
