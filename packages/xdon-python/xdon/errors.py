from typing import Optional


class XDONParseError(Exception):
    """Error during XDON parsing."""

    def __init__(
        self,
        message: str,
        line: int,
        column: int,
        source: Optional[str] = None,
    ) -> None:
        self.message = message
        self.line = line
        self.column = column
        self.source = source
        super().__init__(f"[XDON ParseError at {line}:{column}] {message}")


class XDONStringifyError(Exception):
    """Error during XDON stringification."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(f"[XDON StringifyError] {message}")


class XDONMacroError(Exception):
    """Error during macro expansion."""

    def __init__(
        self,
        message: str,
        line: int,
        column: int,
        macro_name: Optional[str] = None,
    ) -> None:
        self.message = message
        self.line = line
        self.column = column
        self.macro_name = macro_name
        super().__init__(f"[XDON MacroError at {line}:{column}] {message}")
