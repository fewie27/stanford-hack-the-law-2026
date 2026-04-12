from pathlib import Path

from app.config import settings


def vault_path(record_id: str) -> Path:
    # record_id is alphanumeric; safe as single path segment
    return settings.data_dir / f"{record_id}.vault"


def write_vault(record_id: str, blob: bytes) -> None:
    path = vault_path(record_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(blob)


def read_vault(record_id: str) -> bytes | None:
    path = vault_path(record_id)
    if not path.is_file():
        return None
    return path.read_bytes()


def vault_exists(record_id: str) -> bool:
    return vault_path(record_id).is_file()
