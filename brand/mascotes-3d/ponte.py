"""Cliente da ponte: python ponte.py arquivo.py  (manda o código para o Blender aberto e mostra a saída)"""
import json, os, socket, struct, sys
tok = open(os.path.join(os.environ["APPDATA"], "Blender Foundation", "Blender", "5.3", "rondo_ponte_token.txt"), encoding="utf-8").read().strip()
codigo = open(sys.argv[1], encoding="utf-8").read() if len(sys.argv) > 1 else sys.stdin.read()
d = json.dumps({"token": tok, "codigo": codigo}).encode("utf-8")
s = socket.create_connection(("127.0.0.1", 9877), timeout=3600)
s.sendall(struct.pack(">I", len(d)) + d)
def ler(n):
    b = b""
    while len(b) < n:
        p = s.recv(n - len(b))
        if not p: raise SystemExit("conexão caiu")
        b += p
    return b
r = json.loads(ler(struct.unpack(">I", ler(4))[0]))
print(r["saida"], end="")
sys.exit(0 if r["ok"] else 1)
