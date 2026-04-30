"""Round-trip integration tests."""

from xdon.parser import parse
from xdon.stringifier import stringify
from tests.conftest import FIXTURES


def test_roundtrip_parse() -> None:
    """Test that all fixtures parse to expected JSON."""
    for fixture_name, fixture_data in FIXTURES.items():
        xdon = fixture_data['xdon']
        expected_json = fixture_data['json']

        parsed = parse(xdon)
        assert parsed == expected_json, f"Fixture {fixture_name} parse failed"


def test_roundtrip_stringify() -> None:
    """Test that stringify and re-parse produces same result."""
    for fixture_name, fixture_data in FIXTURES.items():
        xdon = fixture_data['xdon']

        parsed = parse(xdon)
        stringified = stringify(parsed)
        reparsed = parse(stringified)

        assert reparsed == parsed, f"Fixture {fixture_name} stringify roundtrip failed"
