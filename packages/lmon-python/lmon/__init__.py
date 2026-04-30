"""LMON - Language Model Object Notation parser and stringifier."""

from .parser import parse, parse_to_ast
from .stringifier import stringify
from .json_bridge import to_json, from_json
from .macro import expand, MacroContext, MacroDefinition, ExpandOptions
from .errors import LMONParseError, LMONStringifyError, LMONMacroError
from .ast_nodes import (
    LMONDocument,
    HeaderNode,
    LabelNode,
    BodyNode,
    RowNode,
    DocumentNode,
    ArrayNode,
    ValueNode,
)

__all__ = [
    'parse',
    'parse_to_ast',
    'stringify',
    'to_json',
    'from_json',
    'expand',
    'MacroContext',
    'MacroDefinition',
    'ExpandOptions',
    'LMONParseError',
    'LMONStringifyError',
    'LMONMacroError',
    'LMONDocument',
    'HeaderNode',
    'LabelNode',
    'BodyNode',
    'RowNode',
    'DocumentNode',
    'ArrayNode',
    'ValueNode',
]

__version__ = '0.1.0'
