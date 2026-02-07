# Wait-for-green & Resume logic (LangGraph nodes)
# TODO: implement nodes that check grid and resume work

from .state import GraphState


def wait_for_green(state: GraphState) -> GraphState:
    """Node: wait until grid is green or timeout. Placeholder."""
    return state


def resume(state: GraphState) -> GraphState:
    """Node: resume deferred work. Placeholder."""
    return state
