"""Independent numerical checks used by EM_LITERATURE_AUDIT.md."""

from math import pi, sqrt

from decimal import Decimal, getcontext


MU0 = 4 * pi * 1e-7


def wheeler_henry(radius_m: float, length_m: float, turns: int) -> float:
    """Wheeler 1928 eq. (2), converted from inches/uH to SI input/output."""
    a_in = radius_m / 0.0254
    b_in = length_m / 0.0254
    return (a_in * a_in * turns * turns / (9 * a_in + 10 * b_in)) * 1e-6


def lundin_henry(radius_m: float, length_m: float, turns: int) -> float:
    """Lundin 1985 eqs. (9)-(12), cylindrical current sheet."""
    a, b, n = radius_m, length_m, turns

    def f1(x: float) -> float:
        return (1 + 0.383901 * x + 0.017108 * x * x) / (1 + 0.258952 * x)

    def f2(x: float) -> float:
        return 0.093842 * x + 0.002029 * x * x - 0.000801 * x**3

    if 2 * a <= b:
        x = 4 * a * a / (b * b)
        return MU0 * n * n * pi * a * a / b * (f1(x) - 4 / (3 * pi) * 2 * a / b)
    x = b * b / (4 * a * a)
    return MU0 * n * n * a * ((sp_log(8 * a / b) - 0.5) * f1(x) + f2(x))


def sp_log(x: float) -> float:
    import math

    return math.log(x)


def mutual_loop_henry(r1: float, r2: float, axial_separation: float) -> float:
    """Maxwell/Grover coaxial circular filaments, SI normalized."""
    k2 = 4 * r1 * r2 / ((r1 + r2) ** 2 + axial_separation**2)
    k = sqrt(k2)
    K, E = complete_elliptic_ke(k2)
    return MU0 * sqrt(r1 * r2) * (((2 / k) - k) * K - (2 / k) * E)


def complete_elliptic_ke(m: float) -> tuple[float, float]:
    """Complete K(m), E(m), using Carlson RF/RD duplication algorithms."""

    return carlson_rf(0.0, 1.0 - m, 1.0), carlson_rf(0.0, 1.0 - m, 1.0) - m * carlson_rd(0.0, 1.0 - m, 1.0) / 3


def carlson_rf(x: float, y: float, z: float) -> float:
    errtol = 0.0025
    while True:
        mu = (x + y + z) / 3
        X, Y, Z = 1 - x / mu, 1 - y / mu, 1 - z / mu
        if max(abs(X), abs(Y), abs(Z)) < errtol:
            e2 = X * Y - Z * Z
            e3 = X * Y * Z
            return (1 - e2 / 10 + e3 / 14 + e2 * e2 / 24 - 3 * e2 * e3 / 44) / sqrt(mu)
        sx, sy, sz = sqrt(x), sqrt(y), sqrt(z)
        lam = sx * sy + sx * sz + sy * sz
        x, y, z = (x + lam) / 4, (y + lam) / 4, (z + lam) / 4


def carlson_rd(x: float, y: float, z: float) -> float:
    errtol = 0.0015
    total = 0.0
    fac = 1.0
    while True:
        mu = (x + y + 3 * z) / 5
        X, Y, Z = (mu - x) / mu, (mu - y) / mu, (mu - z) / mu
        if max(abs(X), abs(Y), abs(Z)) < errtol:
            ea, eb, ec, ed, ee = X * Y, Z * Z, X * Y - Z * Z, X * Y - 6 * Z * Z, X * Y * Z
            correction = (
                1
                + ed * (-3 / 14 + 9 * ed / 88 - 9 * Z * ee / 52)
                + Z * (ee / 6 + Z * (-9 * ec / 22 + 3 * Z * ea / 26))
            )
            return 3 * total + fac * correction / (mu * sqrt(mu))
        sx, sy, sz = sqrt(x), sqrt(y), sqrt(z)
        lam = sx * sy + sx * sz + sy * sz
        total += fac / (sz * (z + lam))
        fac /= 4
        x, y, z = (x + lam) / 4, (y + lam) / 4, (z + lam) / 4


def loop_self_henry(radius: float, conductor_radius: float) -> float:
    """Thin circular loop with uniform-current round wire (Grover/Rayleigh-Niven limit)."""
    import math

    return MU0 * radius * (math.log(8 * radius / conductor_radius) - 1.75)


def discrete_loop_sum_henry(radius: float, length: float, turns: int, wire_radius: float) -> float:
    pitch = length / (turns - 1) if turns > 1 else 0
    value = turns * loop_self_henry(radius, wire_radius)
    for separation_index in range(1, turns):
        value += 2 * (turns - separation_index) * mutual_loop_henry(
            radius, radius, separation_index * pitch
        )
    return value


def skin_depth(rho: float, frequency: float, mu_r: float = 1.0) -> float:
    return sqrt(rho / (pi * frequency * MU0 * mu_r))


cases = [
    ("long", 0.05, 0.50, 20, 0.003),
    ("medium", 0.05, 0.10, 10, 0.003),
    ("short", 0.05, 0.025, 5, 0.003),
    ("few_turn", 0.05, 0.05, 3, 0.003),
]

for name, radius, length, turns, wire_radius in cases:
    w = wheeler_henry(radius, length, turns)
    l = lundin_henry(radius, length, turns)
    d = discrete_loop_sum_henry(radius, length, turns, wire_radius)
    print(
        name,
        f"Wheeler={w*1e6:.6f} uH",
        f"Lundin_sheet={l*1e6:.6f} uH",
        f"discrete_loops={d*1e6:.6f} uH",
        f"W-L={(w/l-1)*100:.3f}%",
        f"D-L={(d/l-1)*100:.3f}%",
    )

print("skin depth copper 20C, 10 kHz", skin_depth(1.724e-8, 10_000) * 1e3, "mm")
print("skin depth steel example rho=1e-6, mu_r=100, 10 kHz", skin_depth(1e-6, 10_000, 100) * 1e3, "mm")
print("skin depth same steel above Curie mu_r=1", skin_depth(1e-6, 10_000, 1) * 1e3, "mm")
