def epley(carga: float, repeticoes: int) -> float:
    """Força estimada (1RM) pela fórmula de Epley: carga x (1 + reps / 30)."""
    return carga * (1 + repeticoes / 30)


def volume(series: list[tuple[float, int]]) -> float:
    """Volume total: soma de carga x repetições de todas as séries."""
    return sum(carga * reps for carga, reps in series)
