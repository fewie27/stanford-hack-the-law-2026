import secrets
import string

_ALPHANUM = string.ascii_letters + string.digits


def random_record_id(length: int = 4) -> str:
    return "".join(secrets.choice(_ALPHANUM) for _ in range(length))


def random_unlock_key(length: int = 8) -> str:
    return "".join(secrets.choice(_ALPHANUM) for _ in range(length))


def format_code(record_id: str, unlock_key: str) -> str:
    return f"{record_id}-{unlock_key}"


def parse_code(raw: str) -> tuple[str, str]:
    s = "".join(raw.split())
    if "-" in s:
        left, right = s.split("-", 1)
        if len(left) == 4 and len(right) == 8:
            return left, right
    if len(s) == 12:
        return s[:4], s[4:]
    raise ValueError("Code must be XXXX-YYYYYYYY (4 + 8 alphanumeric characters) or 12 characters without hyphen.")
