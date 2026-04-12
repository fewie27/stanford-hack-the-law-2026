"""Convert uploaded image bytes to PNG for vault storage."""

from io import BytesIO

from PIL import Image, UnidentifiedImageError

MAX_UPLOAD_BYTES = 10 * 1024 * 1024


def image_bytes_to_png(data: bytes) -> bytes:
    """Open arbitrary raster image bytes and return PNG bytes."""
    if len(data) > MAX_UPLOAD_BYTES:
        msg = f"Image too large (max {MAX_UPLOAD_BYTES // (1024 * 1024)} MB)."
        raise ValueError(msg)
    try:
        im = Image.open(BytesIO(data))
        im.load()
    except UnidentifiedImageError as e:
        raise ValueError("Unrecognized image format.") from e
    except Exception as e:
        raise ValueError(f"Could not read image: {e}") from e

    if im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGBA")
    out = BytesIO()
    im.save(out, format="PNG", optimize=True)
    return out.getvalue()
