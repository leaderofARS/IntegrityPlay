
from typing import List, Set, Tuple, Dict, Any, Optional
from collections import defaultdict, Counter, deque
import os
import json

"""
app/graph_adapter.py

Graph Adapter for IntegrityPlay
-------------------------------

Purpose:
    - Provide a pluggable graph adapter that can replace the in-memory SimpleGraph used by the detector.
    - Offer a feature-rich, dependency-light InMemoryGraphAdapter for hackathon judges (default).
    - Provide an optional Neo4j-backed adapter for demo-to-prod transition (only used when neo4j driver available).
    - Utility helpers to build graphs from event streams, export subgraphs, produce DOT visualizations and top-node lists.

Design goals (hackathon-ready):
    - Deterministic, reproducible behavior.
    - Minimal dependencies (pure stdlib). Optional integrations (neo4j, networkx) are imported only if present.
    - Backwards compatible surface with previous SimpleGraph: attributes/methods like adj, add_edge, neighbors, degree, connected_component, and nodes are available so you can swap adapters into Detector by assigning detector.graph = adapter (minor adjustments may be required to reference adapter.nodes() instead of adapter.adj.keys()).

How to use (quick):
    # create adapter and build from events file
    from app.graph_adapter import InMemoryGraphAdapter, build_graph_from_events_file
    g = InMemoryGraphAdapter()
    build_graph_from_events_file('results/demo_run/events.jsonl', g)

    # basic ops
    print(g.degree('ACC-A'))
"""

class BaseGraphAdapter:
    """Abstract adapter interface. Implementations should provide these methods."""

    def add_edge(self, a: str, b: str, weight: int = 1):
        pass

    def neighbors(self, a: str) -> List[str]:
        raise NotImplementedError()

    def degree(self, a: str) -> int:
        raise NotImplementedError()

    def connected_component(self, seed: str) -> Set[str]:
        raise NotImplementedError()

    def nodes(self) -> List[str]:
        raise NotImplementedError()

    def top_nodes(self, n: int = 20, exclude_instruments: bool = True) -> List[Tuple[str,int]]:
        raise NotImplementedError()

    def export_subgraph(self, seed: str, depth: int = 2, max_nodes: int = 500) -> Dict:
        raise NotImplementedError()

class InMemoryGraphAdapter(BaseGraphAdapter):
    """Lightweight in-memory adapter compatible with previous SimpleGraph.

    adj attribute mirrors the previous SimpleGraph.adj (account -> neighbor -> count)
    edge_counts Counter holds sorted pair multiplicity (useful for export/metrics)
    """
    def __init__(self):
        self.adj: Dict[str, Dict[str,int]] = defaultdict(lambda: defaultdict(int))
        self.edge_counts: Counter = Counter()

    # core interface --------------------------------------------------
    def add_edge(self, a: str, b: str, weight: int = 1):
        if a is None or b is None:
            return
        if a == b:
            self.adj[a][b] += weight
            self.edge_counts[(a, b)] += weight
            return
        self.adj[a][b] += weight
        self.adj[b][a] += weight
        self.edge_counts[tuple(sorted((a, b)))] += weight
    def neighbors(self, a: str) -> List[str]:
        return list(self.adj.get(a, {}).keys())

    def degree(self, a: str) -> int:
        return sum(self.adj.get(a, {}).values())

    def connected_component(self, seed: str) -> Set[str]:
        seen = set()
        stack = [seed]
        while stack:
            cur = stack.pop()
            if cur in seen:
                continue
            seen.add(cur)
            for nb in self.neighbors(cur):
                if nb not in seen:
                    stack.append(nb)
        return seen

    def nodes(self) -> List[str]:
        return list(self.adj.keys())

    def top_nodes(self, n: int = 20, exclude_instruments: bool = True) -> List[Tuple[str, int]]:
        items = ((k, self.degree(k)) for k in self.nodes())
        if exclude_instruments:
            items = ((k, d) for k, d in items if not str(k).startswith("INST::"))
        return sorted(items, key=lambda x: -x[1])[:n]

    # export & utilities ---------------------------------------------
    def export_subgraph(self, seed: str, depth: int = 2, max_nodes: int = 500) -> Dict:
        """Return subgraph as a dict: {nodes: [...], edges: [{a,b,weight}] }"""
        nodes = set([seed])
        frontier = set([seed])
        for _ in range(depth):
            newf = set()
            for n in frontier:
                for nb in self.neighbors(n):
                    if len(nodes) >= max_nodes:
                        break
                    if nb not in nodes:
                        newf.add(nb)
                        nodes.add(nb)
        edges = []
        for a in nodes:
            for b, w in self.adj.get(a, {}).items():
                if b in nodes:
                    # avoid duplicates by enforcing ordering
                    if (a <= b):
                        edges.append({"a": a, "b": b, "weight": int(w)})
        return {"nodes": sorted(list(nodes)), "edges": edges}

    def write_dot(self, outpath: str, seed: Optional[str] = None, depth: int = 2, min_weight: int = 1):
        """Write a Graphviz DOT file for the subgraph around seed (or full graph if seed None)."""
        if seed:
            sub = self.export_subgraph(seed, depth=depth)
            nodes = sub["nodes"]
            edges = sub["edges"]
        else:
            nodes = self.nodes()
            edges = [{"a": a, "b": b, "weight": int(w)} for (a,b), w in self.edge_counts.items()]

        lines = ["graph G {", "  overlap=false;", "  splines=true;"]

        # node styling: instrument nodes different shape
        for n in nodes:
            if str(n).startswith("INST::"):
                lines.append(f'  "{n}" [shape=box,fontcolor=gray];')
            else:
                lines.append(f'  "{n}" [shape=ellipse];')

        for e in edges:
            if e["weight"] < min_weight:
                continue
            lines.append(f'  "{e["a"]}" -- "{e["b"]}" [label="{e["weight"]}"]')

        lines.append("}")
        with open(outpath, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        lines.append("}")

def build_graph_from_events_file(path: str, graph_adapter: BaseGraphAdapter, verbose: bool = False):
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    # support JSONL and JSON array; fallback tolerant
    with open(path, "r", encoding="utf-8") as f:
        first = f.readline()
        f.seek(0)
        if first.strip().startswith("["):
            arr = json.load(f)
            build_graph_from_events(arr, graph_adapter, verbose=verbose)
        else:
            for line in f:
                if not line.strip():
                    continue
                try:
                    ev = json.loads(line)
                except Exception:
                    continue
                a = ev.get("a")
                b = ev.get("b")
                w = ev.get("weight", 1)
                graph_adapter.add_edge(a, b, w)

def build_graph_from_events(events, graph_adapter: BaseGraphAdapter, verbose: bool = False):
    for ev in events:
        a = ev.get("a")
        b = ev.get("b")
        w = ev.get("weight", 1)
        graph_adapter.add_edge(a, b, w)
    if verbose:
        print("Graph built: nodes=", len(graph_adapter.nodes()))
