"""As palavras que não podem ser publicadas no RONDO: xingamentos, palavrões fortes, termos sexuais explícitos e ofensas
de preconceito, em português, inglês e espanhol. Escritas como o filtro as compara: minúsculas e sem acento.

Para acrescentar ou tirar uma palavra, é só mexer nas listas abaixo (e rodar os testes). Palavras com outro sentido comum
(ex.: "pau", "pica", "rola", "foda" no sentido de "muito bom", "veado", "piranha", "macaco", "chupeta", "zorra") ficam de fora de propósito: bloqueá-las barraria frases inocentes.
"""

PORTUGUES = {
    # palavrões e xingamentos
    "puta", "puto", "putinha", "putaria", "caralho", "caralha", "porra", "buceta", "boceta", "xoxota", "xereca",
    "foder", "fodase", "fodasse", "fudido", "fodido", "fdp", "filhodaputa", "filhadaputa", "pqp", "vsf", "vtnc",
    "tnc", "arrombado", "arrombada", "cuzao", "cuzona", "cu", "merda", "bosta", "escroto", "escrota", "otario", "otaria",
    "babaca", "imbecil", "idiota", "vagabundo", "vagabunda", "vadia", "corno", "corna", "desgracado", "desgracada",
    "punheta", "punheteiro", "siririca", "boquete", "piroca", "xota",
    # preconceito (orientação, gênero, raça, deficiência)
    "viado", "viadinho", "bicha", "bichinha", "sapatao", "traveco", "crioulo", "crioula", "retardado", "retardada",
    "mongoloide", "aleijado", "aleijada",
}

INGLES = {
    "fuck", "fucking", "fucker", "fucked", "motherfucker", "shit", "bullshit", "bitch", "cunt", "dick", "pussy",
    "asshole", "bastard", "slut", "whore", "cock", "wanker",
    "nigger", "nigga", "faggot", "fag", "retard", "kike", "spic", "chink", "tranny",
}

ESPANHOL = {
    "mierda", "cabron", "cabrona", "pendejo", "pendeja", "cono", "chinga", "chingada", "chingar", "verga", "maricon",
    "gilipollas", "culero", "joder", "hijueputa", "malparido", "malparida",
}

# trechos que entregam a palavra mesmo grudada em outras ("vaitomarnocu", "filhodaputa123"): só os inequívocos
DENTRO_DE_PALAVRAS = {
    "filhodaputa", "filhadaputa", "vaitomarnocu", "tomarnocu", "vaisefoder", "motherfucker", "fuck", "caralho",
    "buceta", "nigger", "faggot", "hijueputa", "gilipollas",
}

TODAS = PORTUGUES | INGLES | ESPANHOL
