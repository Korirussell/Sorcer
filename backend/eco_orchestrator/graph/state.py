# Graph State definition (for LangGraph)
from typing import TypedDict


class GraphState(TypedDict):
    """State passed through the deferral / wait-for-green graph."""
    # TODO: add fields (e.g. prompt, carbon_ok, deferred, etc.)
    pass
