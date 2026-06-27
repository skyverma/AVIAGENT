import ast


class CodeValidationError(ValueError):
    pass


FORBIDDEN_NAMES = {"os", "sys", "subprocess", "shutil", "socket", "requests", "urllib"}


def validate_code(code: str) -> None:
    if not code or not code.strip():
        raise CodeValidationError("Code is empty")
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        raise CodeValidationError(f"Syntax error: {e}") from e
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                root = (alias.name or "").split(".")[0]
                if root in FORBIDDEN_NAMES:
                    raise CodeValidationError(f"Import not allowed: {root}")
        if isinstance(node, ast.ImportFrom):
            root = (node.module or "").split(".")[0]
            if root in FORBIDDEN_NAMES:
                raise CodeValidationError(f"Import not allowed: {root}")
