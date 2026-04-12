// features/snippets/builtins.ts — Built-in competitive programming snippet library.
//
// Ships real, working templates for common CP data structures and algorithms.
// Every snippet here is tested and ready to use in competitions.

import type { Snippet } from "./types";

export const BUILTIN_SNIPPETS: Snippet[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // C++ SNIPPETS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "builtin-cpp-fast-io",
    title: "Fast I/O",
    description:
      "Disable sync between C and C++ I/O streams and untie cin/cout for maximum speed. Essential for competitive programming.",
    language: "cpp",
    tags: ["template"],
    code: `ios_base::sync_with_stdio(false);
cin.tie(NULL);
cout.tie(NULL);`,
    source: "builtin",
    author: "CP-IDE",
    insertMode: "cursor",
  },

  {
    id: "builtin-cpp-boilerplate",
    title: "CP Boilerplate Template",
    description:
      "Full competitive programming boilerplate with fast I/O, common macros, type aliases, and a clean solve() function structure.",
    language: "cpp",
    tags: ["template"],
    code: `#include <bits/stdc++.h>
using namespace std;

using ll = long long;
using pii = pair<int, int>;
using pll = pair<ll, ll>;
using vi = vector<int>;
using vll = vector<ll>;

#define all(x) (x).begin(), (x).end()
#define sz(x) (int)(x).size()
#define pb push_back
#define F first
#define S second

const int MOD = 1e9 + 7;
const int INF = 1e9;
const ll LLINF = 1e18;

void solve() {
    int n;
    cin >> n;
    
    // your code here
    
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    int t = 1;
    // cin >> t;
    while (t--) solve();
    
    return 0;
}`,
    source: "builtin",
    author: "CP-IDE",
    insertMode: "cursor",
  },

  {
    id: "builtin-cpp-dsu",
    title: "DSU (Disjoint Set Union)",
    description:
      "Union-Find with path compression and union by rank. O(α(n)) amortized per operation. Supports find, unite, and connected query.",
    language: "cpp",
    tags: ["data-structure", "graph"],
    code: `struct DSU {
    vector<int> parent, rank_;
    int components;

    DSU(int n) : parent(n), rank_(n, 0), components(n) {
        iota(parent.begin(), parent.end(), 0);
    }

    int find(int x) {
        if (parent[x] != x)
            parent[x] = find(parent[x]);
        return parent[x];
    }

    bool unite(int x, int y) {
        x = find(x); y = find(y);
        if (x == y) return false;
        if (rank_[x] < rank_[y]) swap(x, y);
        parent[y] = x;
        if (rank_[x] == rank_[y]) rank_[x]++;
        components--;
        return true;
    }

    bool connected(int x, int y) {
        return find(x) == find(y);
    }
};`,
    source: "builtin",
    author: "CP-IDE",
    insertMode: "cursor",
  },

  {
    id: "builtin-cpp-segtree",
    title: "Segment Tree (Point Update, Range Query)",
    description:
      "Bottom-up iterative segment tree for point updates and range queries. Default: range sum. Change merge logic for min/max/gcd.",
    language: "cpp",
    tags: ["data-structure"],
    code: `struct SegTree {
    int n;
    vector<long long> tree;

    SegTree(int n) : n(n), tree(2 * n, 0) {}

    SegTree(const vector<long long>& a) : n(a.size()), tree(2 * a.size(), 0) {
        for (int i = 0; i < n; i++) tree[n + i] = a[i];
        for (int i = n - 1; i > 0; i--) tree[i] = tree[2*i] + tree[2*i+1];
    }

    void update(int pos, long long val) {
        pos += n;
        tree[pos] = val;
        for (pos >>= 1; pos > 0; pos >>= 1)
            tree[pos] = tree[2*pos] + tree[2*pos+1];
    }

    // Query sum on [l, r)
    long long query(int l, int r) {
        long long res = 0;
        for (l += n, r += n; l < r; l >>= 1, r >>= 1) {
            if (l & 1) res += tree[l++];
            if (r & 1) res += tree[--r];
        }
        return res;
    }
};`,
    source: "builtin",
    author: "CP-IDE",
    insertMode: "cursor",
  },

  {
    id: "builtin-cpp-sparse-table",
    title: "Sparse Table (RMQ)",
    description:
      "O(n log n) build, O(1) range minimum query. Idempotent — works for min, max, gcd. Not suitable for range sum.",
    language: "cpp",
    tags: ["data-structure"],
    code: `struct SparseTable {
    vector<vector<int>> table;
    vector<int> log2_;

    SparseTable(const vector<int>& a) {
        int n = a.size();
        int K = __lg(n) + 1;
        table.assign(K, vector<int>(n));
        log2_.resize(n + 1);
        for (int i = 2; i <= n; i++) log2_[i] = log2_[i / 2] + 1;

        table[0] = a;
        for (int k = 1; k < K; k++)
            for (int i = 0; i + (1 << k) <= n; i++)
                table[k][i] = min(table[k-1][i], table[k-1][i + (1 << (k-1))]);
    }

    // Query min on [l, r] (inclusive)
    int query(int l, int r) {
        int k = log2_[r - l + 1];
        return min(table[k][l], table[k][r - (1 << k) + 1]);
    }
};`,
    source: "builtin",
    author: "CP-IDE",
    insertMode: "cursor",
  },

  {
    id: "builtin-cpp-fenwick",
    title: "Fenwick Tree (BIT)",
    description:
      "Binary Indexed Tree for prefix sums with point updates. O(log n) per update and query. 1-indexed internally.",
    language: "cpp",
    tags: ["data-structure"],
    code: `struct Fenwick {
    int n;
    vector<long long> tree;

    Fenwick(int n) : n(n), tree(n + 1, 0) {}

    void update(int i, long long delta) {
        for (i++; i <= n; i += i & (-i))
            tree[i] += delta;
    }

    // Prefix sum [0, i]
    long long query(int i) {
        long long sum = 0;
        for (i++; i > 0; i -= i & (-i))
            sum += tree[i];
        return sum;
    }

    // Range sum [l, r]
    long long query(int l, int r) {
        return query(r) - (l > 0 ? query(l - 1) : 0);
    }
};`,
    source: "builtin",
    author: "CP-IDE",
    insertMode: "cursor",
  },

  {
    id: "builtin-cpp-dijkstra",
    title: "Dijkstra's Algorithm",
    description:
      "Shortest path from a single source in a weighted graph using a min-heap priority queue. O((V + E) log V).",
    language: "cpp",
    tags: ["graph"],
    code: `vector<long long> dijkstra(int src, const vector<vector<pair<int, long long>>>& adj) {
    int n = adj.size();
    vector<long long> dist(n, LLONG_MAX);
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<>> pq;

    dist[src] = 0;
    pq.push({0, src});

    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;
        for (auto [v, w] : adj[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
        }
    }
    return dist;
}`,
    source: "builtin",
    author: "CP-IDE",
    insertMode: "cursor",
  },

  {
    id: "builtin-cpp-modular",
    title: "Modular Arithmetic (mod_pow, mod_inv)",
    description:
      "Fast modular exponentiation and modular inverse (using Fermat's little theorem, mod must be prime). O(log p) each.",
    language: "cpp",
    tags: ["math", "number-theory"],
    code: `const long long MOD = 1e9 + 7;

long long mod_pow(long long base, long long exp, long long mod = MOD) {
    long long result = 1;
    base %= mod;
    while (exp > 0) {
        if (exp & 1) result = result * base % mod;
        base = base * base % mod;
        exp >>= 1;
    }
    return result;
}

// Modular inverse using Fermat's little theorem (mod must be prime)
long long mod_inv(long long a, long long mod = MOD) {
    return mod_pow(a, mod - 2, mod);
}`,
    source: "builtin",
    author: "CP-IDE",
    insertMode: "cursor",
  },

  {
    id: "builtin-cpp-ncr",
    title: "Combinatorics (nCr Precomputed)",
    description:
      "Precompute factorials and inverse factorials for O(1) nCr queries modulo a prime. Build in O(n), query in O(1).",
    language: "cpp",
    tags: ["math", "number-theory"],
    code: `const int MAXN = 2e5 + 5;
const long long MOD = 1e9 + 7;

long long fact[MAXN], inv_fact[MAXN];

long long mod_pow(long long base, long long exp, long long mod) {
    long long result = 1;
    base %= mod;
    while (exp > 0) {
        if (exp & 1) result = result * base % mod;
        base = base * base % mod;
        exp >>= 1;
    }
    return result;
}

void precompute() {
    fact[0] = 1;
    for (int i = 1; i < MAXN; i++)
        fact[i] = fact[i-1] * i % MOD;
    inv_fact[MAXN - 1] = mod_pow(fact[MAXN - 1], MOD - 2, MOD);
    for (int i = MAXN - 2; i >= 0; i--)
        inv_fact[i] = inv_fact[i+1] * (i+1) % MOD;
}

long long nCr(int n, int r) {
    if (r < 0 || r > n) return 0;
    return fact[n] % MOD * inv_fact[r] % MOD * inv_fact[n-r] % MOD;
}`,
    source: "builtin",
    author: "CP-IDE",
    insertMode: "cursor",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PYTHON SNIPPETS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "builtin-py-fast-read",
    title: "Fast Input (sys.stdin)",
    description:
      "Replace built-in input() with sys.stdin.readline for 3-5x faster reading. Essential for large input in Python.",
    language: "python",
    tags: ["template"],
    code: `import sys
input = sys.stdin.readline

def read_int():
    return int(input())

def read_ints():
    return list(map(int, input().split()))

def read_str():
    return input().strip()`,
    source: "builtin",
    author: "CP-IDE",
    insertMode: "cursor",
  },

  {
    id: "builtin-py-dsu",
    title: "DSU (Disjoint Set Union)",
    description:
      "Union-Find with path compression and union by rank in Python. O(α(n)) amortized per operation.",
    language: "python",
    tags: ["data-structure", "graph"],
    code: `class DSU:
    def __init__(self, n: int):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.components = n

    def find(self, x: int) -> int:
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]  # path halving
            x = self.parent[x]
        return x

    def unite(self, x: int, y: int) -> bool:
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False
        if self.rank[rx] < self.rank[ry]:
            rx, ry = ry, rx
        self.parent[ry] = rx
        if self.rank[rx] == self.rank[ry]:
            self.rank[rx] += 1
        self.components -= 1
        return True

    def connected(self, x: int, y: int) -> bool:
        return self.find(x) == self.find(y)`,
    source: "builtin",
    author: "CP-IDE",
    insertMode: "cursor",
  },

  {
    id: "builtin-py-dijkstra",
    title: "Dijkstra with heapq",
    description:
      "Shortest path from a single source using Python's heapq. adj is a list of lists of (neighbor, weight) tuples.",
    language: "python",
    tags: ["graph"],
    code: `import heapq
from math import inf

def dijkstra(src: int, adj: list[list[tuple[int, int]]]) -> list[float]:
    n = len(adj)
    dist = [inf] * n
    dist[src] = 0
    pq = [(0, src)]  # (distance, node)

    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        for v, w in adj[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                heapq.heappush(pq, (dist[v], v))

    return dist`,
    source: "builtin",
    author: "CP-IDE",
    insertMode: "cursor",
  },

  {
    id: "builtin-py-bisect",
    title: "Bisect Wrappers",
    description:
      "Clear-named wrappers around Python's bisect module: lower_bound, upper_bound, count_in_range for sorted arrays.",
    language: "python",
    tags: ["search", "sorting"],
    code: `from bisect import bisect_left, bisect_right

def lower_bound(arr: list, target) -> int:
    """Index of first element >= target."""
    return bisect_left(arr, target)

def upper_bound(arr: list, target) -> int:
    """Index of first element > target."""
    return bisect_right(arr, target)

def count_in_range(arr: list, lo, hi) -> int:
    """Count elements in sorted arr where lo <= x <= hi."""
    return bisect_right(arr, hi) - bisect_left(arr, lo)

def find_exact(arr: list, target) -> int:
    """Index of target in sorted arr, or -1 if not found."""
    i = bisect_left(arr, target)
    if i < len(arr) and arr[i] == target:
        return i
    return -1`,
    source: "builtin",
    author: "CP-IDE",
    insertMode: "cursor",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // JAVA SNIPPETS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "builtin-java-fast-input",
    title: "BufferedReader Fast Input",
    description:
      "Fast input using BufferedReader + StreamTokenizer. Much faster than Scanner for large inputs in competitive programming.",
    language: "java",
    tags: ["template"],
    code: `import java.io.*;
import java.util.*;

public class Main {
    static BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    static StreamTokenizer in = new StreamTokenizer(br);
    static PrintWriter out = new PrintWriter(new BufferedOutputStream(System.out));

    static int nextInt() throws IOException { in.nextToken(); return (int) in.nval; }
    static long nextLong() throws IOException { in.nextToken(); return (long) in.nval; }
    static String nextLine() throws IOException { return br.readLine(); }

    public static void main(String[] args) throws IOException {
        int n = nextInt();
        
        // your code here
        
        out.flush();
        out.close();
    }
}`,
    source: "builtin",
    author: "CP-IDE",
    insertMode: "cursor",
  },

  {
    id: "builtin-java-dsu",
    title: "DSU (Disjoint Set Union)",
    description:
      "Union-Find with path compression and union by rank in Java. O(α(n)) amortized per operation.",
    language: "java",
    tags: ["data-structure", "graph"],
    code: `class DSU {
    int[] parent, rank;
    int components;

    DSU(int n) {
        parent = new int[n];
        rank = new int[n];
        components = n;
        for (int i = 0; i < n; i++) parent[i] = i;
    }

    int find(int x) {
        if (parent[x] != x)
            parent[x] = find(parent[x]);
        return parent[x];
    }

    boolean unite(int x, int y) {
        x = find(x); y = find(y);
        if (x == y) return false;
        if (rank[x] < rank[y]) { int tmp = x; x = y; y = tmp; }
        parent[y] = x;
        if (rank[x] == rank[y]) rank[x]++;
        components--;
        return true;
    }

    boolean connected(int x, int y) {
        return find(x) == find(y);
    }
}`,
    source: "builtin",
    author: "CP-IDE",
    insertMode: "cursor",
  },
];
