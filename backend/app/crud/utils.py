def escape_like(value: str) -> str:
    """Escape special LIKE characters so they match literally."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
