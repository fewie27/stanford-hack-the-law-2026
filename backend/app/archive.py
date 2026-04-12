import io
import json
import tarfile
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class EvidenceMetadata:
    source_url: str
    captured_at_iso: str
    client_ip: str
    user_agent: str | None

    def to_json_dict(self) -> dict[str, Any]:
        return {
            "source_url": self.source_url,
            "captured_at": self.captured_at_iso,
            "client_ip": self.client_ip,
            "user_agent": self.user_agent,
        }


def build_uncompressed_tar(metadata: EvidenceMetadata, png_bytes: bytes) -> bytes:
    buf = io.BytesIO()
    meta_bytes = json.dumps(metadata.to_json_dict(), ensure_ascii=False, indent=2).encode("utf-8")
    with tarfile.open(fileobj=buf, mode="w:", format=tarfile.GNU_FORMAT) as tar:
        meta_info = tarfile.TarInfo(name="metadata.json")
        meta_info.size = len(meta_bytes)
        tar.addfile(meta_info, io.BytesIO(meta_bytes))
        img_info = tarfile.TarInfo(name="screenshot.png")
        img_info.size = len(png_bytes)
        tar.addfile(img_info, io.BytesIO(png_bytes))
    return buf.getvalue()


def parse_uncompressed_tar(data: bytes) -> tuple[dict[str, Any], bytes]:
    buf = io.BytesIO(data)
    with tarfile.open(fileobj=buf, mode="r:") as tar:
        meta_member = tar.getmember("metadata.json")
        img_member = tar.getmember("screenshot.png")
        meta_f = tar.extractfile(meta_member)
        img_f = tar.extractfile(img_member)
        if meta_f is None or img_f is None:
            raise ValueError("Archive is missing expected entries")
        meta = json.loads(meta_f.read().decode("utf-8"))
        png = img_f.read()
    return meta, png
