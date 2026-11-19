"""Browraiz (comum, linha 0, coluna 0): o browniezinho raiz, a base pura, sem acessório nenhum.  python browraiz.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as b  # noqa: E402

if __name__ == "__main__":
    b.desenhar()
    b.conferencia("browraiz")
