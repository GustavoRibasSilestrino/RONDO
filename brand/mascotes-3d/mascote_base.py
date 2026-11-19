# O brownie base dos mascotes do RONDO, em 3D: corpo de cubo arredondado com orelhas de urso, olhos brilhantes, boquinha,
# bracinhos acenando e perninhas, com textura de bolo esfarelado, migalhas e uma camada de calda em cima.
# Roda dentro do Blender (pela ponte ou em segundo plano). Depois de exec, use:
#   limpar(); base = construir_base(); chapeu_chef(); lenco(); preparar_render(); renderizar(caminho)
import math
import random

import bpy
import bmesh
from mathutils import Vector

COL = "Mascote"


# ---------- utilidades ----------
def limpar():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for bloco in (bpy.data.meshes, bpy.data.materials, bpy.data.curves, bpy.data.metaballs, bpy.data.lights, bpy.data.cameras, bpy.data.node_groups):
        for x in list(bloco):
            if x.users == 0:
                bloco.remove(x)


def colecao():
    c = bpy.data.collections.get(COL)
    if not c:
        c = bpy.data.collections.new(COL)
        bpy.context.scene.collection.children.link(c)
    return c


def ligar(o):
    for c in o.users_collection:
        c.objects.unlink(o)
    colecao().objects.link(o)
    return o


def suave(o, auto=True):
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def mod_sub(o, n=2):
    m = o.modifiers.new("Subdiv", "SUBSURF")
    m.levels = n
    m.render_levels = n
    return m


def esfera(nome, loc, raio=1.0, escala=(1, 1, 1), seg=48, aneis=24, mat=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=aneis, radius=raio, location=loc)
    o = bpy.context.active_object
    o.name = nome
    o.scale = escala
    suave(o)
    if mat:
        o.data.materials.append(mat)
    return ligar(o)


def aplicar_escala(o):
    bpy.context.view_layer.objects.active = o
    for x in bpy.context.selected_objects:
        x.select_set(False)
    o.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)


# ---------- materiais ----------
def principled(nome, cor, rug=0.5, metal=0.0, sss=0.0, coat=0.0, emis=None, emis_forca=0.0):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*cor, 1)
    b.inputs["Roughness"].default_value = rug
    b.inputs["Metallic"].default_value = metal
    if sss:
        b.inputs["Subsurface Weight"].default_value = sss
        b.inputs["Subsurface Radius"].default_value = (0.4, 0.15, 0.08)
    if coat:
        b.inputs["Coat Weight"].default_value = coat
        b.inputs["Coat Roughness"].default_value = 0.15
    if emis:
        b.inputs["Emission Color"].default_value = (*emis, 1)
        b.inputs["Emission Strength"].default_value = emis_forca
    return m


def mat_brownie():
    """bolo de chocolate: marrom avermelhado, com miolo poroso (voronoi), granulado fino (ruído) e variação de cor"""
    m = principled("Brownie", (0.20, 0.055, 0.025), rug=0.72, sss=0.08)
    nt = m.node_tree
    n, l = nt.nodes, nt.links
    b = n.get("Principled BSDF")
    coord = n.new("ShaderNodeTexCoord")
    mapa = n.new("ShaderNodeMapping")
    mapa.inputs["Scale"].default_value = (1, 1, 1)
    l.new(coord.outputs["Object"], mapa.inputs["Vector"])
    # poros do bolo
    vor = n.new("ShaderNodeTexVoronoi")
    vor.feature = "SMOOTH_F1" if hasattr(vor, "feature") else vor.feature
    vor.inputs["Scale"].default_value = 26
    l.new(mapa.outputs["Vector"], vor.inputs["Vector"])
    # grão fino
    ruido = n.new("ShaderNodeTexNoise")
    ruido.inputs["Scale"].default_value = 60
    ruido.inputs["Detail"].default_value = 8
    l.new(mapa.outputs["Vector"], ruido.inputs["Vector"])
    # variação de cor grande (partes mais tostadas)
    manchas = n.new("ShaderNodeTexNoise")
    manchas.inputs["Scale"].default_value = 3.5
    manchas.inputs["Detail"].default_value = 4
    l.new(mapa.outputs["Vector"], manchas.inputs["Vector"])
    rampa = n.new("ShaderNodeValToRGB")
    rampa.color_ramp.elements[0].position = 0.35
    rampa.color_ramp.elements[0].color = (0.075, 0.016, 0.008, 1)
    rampa.color_ramp.elements[1].position = 0.75
    rampa.color_ramp.elements[1].color = (0.24, 0.055, 0.022, 1)
    l.new(manchas.outputs["Fac"], rampa.inputs["Fac"])
    # poros mais escuros
    mix = n.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    poros = n.new("ShaderNodeValToRGB")
    poros.color_ramp.elements[0].position = 0.0
    poros.color_ramp.elements[0].color = (0.45, 0.4, 0.4, 1)
    poros.color_ramp.elements[1].position = 0.25
    poros.color_ramp.elements[1].color = (1, 1, 1, 1)
    l.new(vor.outputs["Distance"], poros.inputs["Fac"])
    mix.inputs["Factor"].default_value = 1.0
    l.new(rampa.outputs["Color"], mix.inputs["A"])
    l.new(poros.outputs["Color"], mix.inputs["B"])
    l.new(mix.outputs["Result"], b.inputs["Base Color"])
    # relevo: poros + grão
    soma = n.new("ShaderNodeMath")
    soma.operation = "ADD"
    l.new(vor.outputs["Distance"], soma.inputs[0])
    mult = n.new("ShaderNodeMath")
    mult.operation = "MULTIPLY"
    mult.inputs[1].default_value = 0.35
    l.new(ruido.outputs["Fac"], mult.inputs[0])
    l.new(mult.outputs["Value"], soma.inputs[1])
    relevo = n.new("ShaderNodeBump")
    relevo.inputs["Strength"].default_value = 0.55
    relevo.inputs["Distance"].default_value = 0.02
    l.new(soma.outputs["Value"], relevo.inputs["Height"])
    l.new(relevo.outputs["Normal"], b.inputs["Normal"])
    return m


def mat_calda():
    """a calda de chocolate brilhante em cima da cabeça"""
    m = principled("Calda", (0.06, 0.018, 0.01), rug=0.12, coat=0.6)
    return m


# ---------- o corpo ----------
def corpo(mat):
    """o bloco do brownie: cabeça e corpo num cubo só, arredondado, levemente mais largo em cima"""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.15))
    o = bpy.context.active_object
    o.name = "Corpo"
    o.scale = (1.55, 1.25, 1.55)
    aplicar_escala(o)
    bm = bmesh.new()
    bm.from_mesh(o.data)
    for v in bm.verts:   # base um pouco mais estreita, como na arte
        if v.co.z < 0:
            v.co.x *= 0.9
            v.co.y *= 0.92
    bm.to_mesh(o.data)
    bm.free()
    bv = o.modifiers.new("Bevel", "BEVEL")
    bv.width = 0.32
    bv.segments = 6
    bv.limit_method = "NONE"
    mod_sub(o, 2)
    # superfície irregular de bolo (deslocamento leve)
    tex = bpy.data.textures.new("MigalhaRelevo", "CLOUDS")
    tex.noise_scale = 0.18
    tex.noise_depth = 3
    d = o.modifiers.new("Irregular", "DISPLACE")
    d.texture = tex
    d.strength = 0.035
    d.texture_coords = "OBJECT"
    suave(o)
    o.data.materials.append(mat)
    return ligar(o)


def calda(mat):
    """a camada de calda brilhante no topo, escorrendo um pouco pelas laterais"""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.15 + 0.72))
    o = bpy.context.active_object
    o.name = "Calda"
    o.scale = (1.6, 1.3, 0.14)
    aplicar_escala(o)
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=10, use_grid_fill=True)
    random.seed(7)
    for v in bm.verts:   # pingos escorrendo nas bordas
        if v.co.z < 0 and (abs(v.co.x) > 0.75 or abs(v.co.y) > 0.6):
            gota = max(0.0, math.sin(v.co.x * 9.0 + 1.3) * math.sin(v.co.y * 7.0 + 0.4))
            v.co.z -= 0.12 + gota * 0.22
    bm.to_mesh(o.data)
    bm.free()
    bv = o.modifiers.new("Bevel", "BEVEL")
    bv.width = 0.06
    bv.segments = 4
    mod_sub(o, 2)
    sw = o.modifiers.new("Encolher", "SHRINKWRAP")
    sw.target = bpy.data.objects["Corpo"]
    sw.wrap_mode = "OUTSIDE_SURFACE"
    sw.offset = 0.025
    o.modifiers.move(len(o.modifiers) - 1, 0) if False else None
    suave(o)
    o.data.materials.append(mat)
    return ligar(o)


def orelhas(mat, mat_dentro):
    """orelhas de urso nos cantos de cima, abertas para os lados (assim cabe um chapéu entre elas)"""
    for lado in (-1, 1):
        nome = "E" if lado < 0 else "D"
        o = esfera(f"Orelha.{nome}", (lado * 0.8, 0.0, 1.98), 0.27, (1, 0.6, 1), mat=mat)
        o.rotation_euler = (0, lado * -0.55, 0)
        d = esfera(f"OrelhaDentro.{nome}", (lado * 0.8, -0.15, 1.98), 0.15, (1, 0.3, 1), mat=mat_dentro)
        d.rotation_euler = (0, lado * -0.55, 0)


def rosto():
    preto = principled("OlhoPreto", (0.005, 0.004, 0.006), rug=0.05, coat=1.0)
    branco = principled("Brilho", (1, 1, 1), rug=0.2, emis=(1, 1, 1), emis_forca=4)
    boca_mat = principled("Boca", (0.04, 0.01, 0.01), rug=0.4)
    frente = -0.64   # a face da frente do corpo (y)
    # sem bochechas rosas e com um brilho só em cada olho, como na arte original
    for lado in (-1, 1):
        esfera(f"Olho.{lado}", (lado * 0.34, frente, 1.32), 0.15, (1, 0.55, 1.12), mat=preto)
        esfera(f"BrilhoGrande.{lado}", (lado * 0.34 - 0.045, frente - 0.065, 1.39), 0.045, mat=branco)
    # boquinha: um "u" feito com uma curva de espessura redonda
    cu = bpy.data.curves.new("Boca", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = 0.03
    cu.bevel_resolution = 6
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(2)
    pts = [(-0.11, frente - 0.035, 1.17), (0, frente - 0.06, 1.09), (0.11, frente - 0.035, 1.17)]
    for p, c in zip(sp.bezier_points, pts):
        p.co = c
        p.handle_left_type = p.handle_right_type = "AUTO"
    o = bpy.data.objects.new("Boca", cu)
    o.data.materials.append(boca_mat)
    colecao().objects.link(o)


def membro(nome, pontos, raios, mat, sub=2):
    """um braço ou uma perna numa peça só: uma corrente de pontos com o modificador Skin (cada ponto com a sua grossura),
    alisada pela subdivisão. A mão (ou o pé) é a ponta mais grossa e nasce do braço sem emenda."""
    me = bpy.data.meshes.new(nome)
    me.from_pydata(pontos, [(i, i + 1) for i in range(len(pontos) - 1)], [])
    o = bpy.data.objects.new(nome, me)
    colecao().objects.link(o)
    o.modifiers.new("Skin", "SKIN")
    for v, r in zip(o.data.skin_vertices[0].data, raios):
        v.radius = r
    o.data.skin_vertices[0].data[0].use_root = True
    mod_sub(o, sub)
    o.data.materials.append(mat)
    return o


def membros(mat):
    # braço direito acenando (a mão sobe), braço esquerdo dobrado para baixo; os ombros entram no corpo logo abaixo da
    # altura do lenço, para o pano deitar por cima deles
    membro("Braco.D", [(0.6, -0.05, 0.72), (0.86, -0.07, 0.75), (1.04, -0.1, 0.93), (1.1, -0.12, 1.13), (1.1, -0.13, 1.23)],
           [(0.21, 0.21), (0.19, 0.19), (0.17, 0.17), (0.22, 0.2), (0.17, 0.15)], mat)
    membro("Braco.E", [(-0.6, -0.05, 0.74), (-0.86, -0.08, 0.68), (-1.0, -0.12, 0.54), (-1.04, -0.15, 0.4), (-1.03, -0.16, 0.32)],
           [(0.21, 0.21), (0.19, 0.19), (0.17, 0.17), (0.22, 0.2), (0.17, 0.15)], mat)
    for lado in (-1, 1):
        n = "E" if lado < 0 else "D"
        membro(f"Perna.{n}", [(lado * 0.36, 0.0, 0.5), (lado * 0.37, -0.02, 0.26), (lado * 0.37, -0.1, 0.1), (lado * 0.37, -0.25, 0.08)],
               [(0.22, 0.22), (0.2, 0.2), (0.21, 0.17), (0.17, 0.12)], mat)


def migalhas(mat, n=90):
    """migalhas de bolo grudadas pela superfície (pedacinhos irregulares)"""
    alvo = bpy.data.objects["Corpo"]
    dg = bpy.context.evaluated_depsgraph_get()
    ev = alvo.evaluated_get(dg)
    random.seed(11)
    bm = bmesh.new()
    for i in range(n * 4):
        if len(bm.verts) > n * 12 * 6:
            break
        d = Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-1, 1))).normalized()
        if d.y < -0.55 and abs(d.z) < 0.5:   # nada no meio do rosto
            continue
        origem = Vector((0, 0, 0)) + d * 3   # o corpo tem a origem no próprio centro (local)
        ok, loc, nor, _ = ev.ray_cast(origem, -d)
        if not ok:
            continue
        r = random.uniform(0.018, 0.04)
        g = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r)
        for v in g["verts"]:
            v.co = v.co * random.uniform(0.7, 1.3) + alvo.matrix_world @ (loc + nor * r * 0.3)
    me = bpy.data.meshes.new("Migalhas")
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new("Migalhas", me)
    o.data.materials.append(mat)
    colecao().objects.link(o)
    return o


def construir_base():
    m = mat_brownie()
    escuro = principled("OrelhaDentro", (0.09, 0.02, 0.012), rug=0.6)
    corpo(m)
    calda(mat_calda())
    orelhas(m, escuro)
    rosto()
    membros(m)
    migalhas(m)


# ---------- acessórios ----------
def mat_tecido(nome, cor):
    m = principled(nome, cor, rug=0.85, sss=0.05)
    nt = m.node_tree
    n, l = nt.nodes, nt.links
    ond = n.new("ShaderNodeTexWave")
    ond.inputs["Scale"].default_value = 40
    rel = n.new("ShaderNodeBump")
    rel.inputs["Strength"].default_value = 0.12
    l.new(ond.outputs["Fac"], rel.inputs["Height"])
    l.new(rel.outputs["Normal"], n.get("Principled BSDF").inputs["Normal"])
    return m


def chapeu_chef():
    branco = mat_tecido("TecidoBranco", (0.92, 0.92, 0.9))
    # a faixa do chapéu
    # justa na cabeça e mais estreita, para ficar entre as orelhas sem tocar nelas
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=0.5, depth=0.34, location=(0, 0.02, 2.0))
    faixa = bpy.context.active_object
    faixa.name = "ChapeuFaixa"
    faixa.scale = (1, 0.92, 1)
    bv = faixa.modifiers.new("Bevel", "BEVEL")
    bv.width = 0.05
    bv.segments = 3
    mod_sub(faixa, 1)
    suave(faixa)
    faixa.data.materials.append(branco)
    ligar(faixa)
    # o topo fofo: metaballs que viram uma nuvem de pano
    mb = bpy.data.metaballs.new("ChapeuTopo")
    mb.resolution = 0.03
    mb.render_resolution = 0.02
    k = 0.78   # o topo acompanha a faixa mais estreita
    for x, y, z, r in [(0, 0, 2.5, 0.55), (-0.42, 0, 2.43, 0.45), (0.42, 0, 2.43, 0.45), (0, -0.33, 2.43, 0.42), (0, 0.33, 2.43, 0.42),
                       (-0.3, -0.28, 2.62, 0.38), (0.3, 0.28, 2.62, 0.38), (0.3, -0.28, 2.62, 0.38), (-0.3, 0.28, 2.62, 0.38), (0, 0, 2.8, 0.42),
                       (0, 0, 2.25, 0.5)]:
        e = mb.elements.new()
        e.co = (x * k, y * k, z)
        e.radius = r * k
        e.stiffness = 2.0
    o = bpy.data.objects.new("ChapeuTopo", mb)
    o.data.materials.append(branco)
    colecao().objects.link(o)
    return o


def _na_pele(pontos, alvo, folga):
    """leva cada ponto (com um afastamento extra) para a superfície do corpo, afastado pela normal"""
    dg = bpy.context.evaluated_depsgraph_get()
    ev = alvo.evaluated_get(dg)
    inv = alvo.matrix_world.inverted()
    saida = []
    for p, extra in pontos:
        ok, loc, nor, _ = ev.closest_point_on_mesh(inv @ Vector(p))
        saida.append(alvo.matrix_world @ (loc + nor * (folga + extra)))
    return saida


def _tecido(nome, verts, faces, mat, espessura=0.03):
    me = bpy.data.meshes.new(nome)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    for p in me.polygons:
        p.use_smooth = True
    o = bpy.data.objects.new(nome, me)
    colecao().objects.link(o)
    s = o.modifiers.new("Espessura", "SOLIDIFY")
    s.thickness = espessura
    s.offset = 0
    mod_sub(o, 2)
    o.data.materials.append(mat)
    return o


def _sobre_bracos(verts, folga=0.04):
    """tira de dentro dos braços os pontos do pano, deitando-o por cima do ombro"""
    dg = bpy.context.evaluated_depsgraph_get()
    for nome in ("Braco.D", "Braco.E"):
        b = bpy.data.objects.get(nome)
        if b is None:
            continue
        b = b.evaluated_get(dg)
        inv, m3 = b.matrix_world.inverted(), b.matrix_world.to_3x3()
        for k, v in enumerate(verts):
            ok, loc, nor, _ = b.closest_point_on_mesh(inv @ v)
            if not ok:
                continue
            p, nw = b.matrix_world @ loc, (m3 @ nor).normalized()
            if (v - p).dot(nw) < folga:
                verts[k] = p + nw * folga


def lenco():
    """o lenço vermelho de chef: a gola dá a volta colada no corpo, com franzidos de tecido, e desce mais na frente; o nó
    fica no peito e a ponta cai em V com pregas que abrem a partir do nó."""
    vermelho = mat_tecido("TecidoVermelho", (0.62, 0.025, 0.02))
    corpo_o = bpy.data.objects["Corpo"]
    # gola: uma faixa de 128 x 9 pontos em volta do corpo, passando por cima dos dois braços
    N, H = 128, 9
    pts = []
    for i in range(N):
        a = 2 * math.pi * i / N
        frente = max(0.0, -math.sin(a))          # 1 na frente, 0 atrás
        for j in range(H):
            t = j / (H - 1)
            z = 0.95 - 0.08 * frente ** 2 + (t - 0.5) * 0.24
            franzido = 0.016 * math.sin(a * 18 + j * 0.7) * (0.5 + 0.5 * math.sin(t * math.pi))
            estufado = 0.03 * math.sin(t * math.pi)   # a faixa é cheia no meio, como pano dobrado
            pts.append(((1.2 * math.cos(a), 1.2 * math.sin(a), z), franzido + estufado))
    verts = _na_pele(pts, corpo_o, 0.03)
    # deita o pano sobre os ombros e alisa ao longo do anel para não quebrar
    for _ in range(4):
        _sobre_bracos(verts)
        verts = [verts[i * H + j] * 0.5 + (verts[((i - 1) % N) * H + j] + verts[((i + 1) % N) * H + j]) * 0.25
                 for i in range(N) for j in range(H)]
    _sobre_bracos(verts)
    faces = [(i * H + j, ((i + 1) % N) * H + j, ((i + 1) % N) * H + j + 1, i * H + j + 1) for i in range(N) for j in range(H - 1)]
    _tecido("LencoGola", verts, faces, vermelho, 0.03)
    # ponta em V: grade que afina até a ponta, com pregas e a ponta descolando um pouco do corpo
    L, C = 16, 13
    pts = []
    for i in range(L):
        v = i / (L - 1)
        larg = 0.4 * (1 - v) ** 1.1 + 0.02
        for j in range(C):
            u = j / (C - 1) * 2 - 1
            prega = 0.016 * math.cos(u * math.pi * 2) * (0.3 + v) + 0.06 * v * v
            pts.append(((u * larg, -1.5, 0.86 - v * 0.55), prega))
    verts = _na_pele(pts, corpo_o, 0.075)
    faces = [(i * C + j, i * C + j + 1, (i + 1) * C + j + 1, (i + 1) * C + j) for i in range(L - 1) for j in range(C - 1)]
    _tecido("LencoPonta", verts, faces, vermelho, 0.028)
    # o nó: três pedaços de pano amassados, fundidos (metaballs)
    no = _na_pele([((0, -1.5, 0.86), 0.0)], corpo_o, 0.14)[0]
    mb = bpy.data.metaballs.new("LencoNo")
    mb.resolution = 0.015
    mb.render_resolution = 0.01
    for dx, dz, r in ((0, 0, 0.11), (-0.08, 0.02, 0.08), (0.08, 0.02, 0.08)):
        e = mb.elements.new()
        e.type = "ELLIPSOID"
        e.co = (no.x + dx, no.y, no.z + dz)
        e.radius = r
        e.size_x, e.size_y, e.size_z = 1.2, 0.7, 0.85
    o = bpy.data.objects.new("LencoNo", mb)
    o.data.materials.append(vermelho)
    colecao().objects.link(o)


# ---------- câmera, luz e render ----------
def preparar_render(res=1024):
    cena = bpy.context.scene
    for motor in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            cena.render.engine = motor
            break
        except TypeError:
            continue
    cena.render.resolution_x = res
    cena.render.resolution_y = res
    cena.render.film_transparent = True
    cena.view_settings.view_transform = "AgX" if "AgX" in [i.identifier for i in cena.view_settings.bl_rna.properties["view_transform"].enum_items] else "Filmic"
    try:
        cena.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    ee = cena.eevee
    for attr, val in (("taa_render_samples", 128), ("use_shadows", True), ("use_raytracing", True), ("use_gtao", True)):
        if hasattr(ee, attr):
            setattr(ee, attr, val)
    # mundo: luz ambiente suave
    w = cena.world or bpy.data.worlds.new("Mundo")
    cena.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.32, 0.28, 0.4, 1)
    bg.inputs["Strength"].default_value = 0.6
    # câmera em três quartos, levemente de cima
    cam = bpy.data.objects.get("Camera")
    if not cam:
        cam = bpy.data.objects.new("Camera", bpy.data.cameras.new("Camera"))
        cena.collection.objects.link(cam)
    cam.data.lens = 85
    cam.location = (3.1, -8.6, 3.0)
    alvo = Vector((0, 0, 1.45))
    cam.rotation_euler = (alvo - cam.location).to_track_quat("-Z", "Y").to_euler()
    cena.camera = cam

    def luz(nome, tipo, loc, energia, cor=(1, 1, 1), tam=3.0):
        l = bpy.data.objects.get(nome)
        if not l:
            l = bpy.data.objects.new(nome, bpy.data.lights.new(nome, tipo))
            cena.collection.objects.link(l)
        l.location = loc
        l.data.energy = energia
        l.data.color = cor
        if tipo == "AREA":
            l.data.size = tam
        l.rotation_euler = (alvo - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        return l
    luz("LuzChave", "AREA", (-4.0, -5.0, 6.0), 900, (1.0, 0.93, 0.85), 4)
    luz("LuzPreenche", "AREA", (5.0, -4.0, 2.5), 300, (0.85, 0.85, 1.0), 5)
    luz("LuzRecorte", "AREA", (1.0, 5.0, 5.0), 900, (0.75, 0.6, 1.0), 3)


def enquadrar(margem=1.12):
    """ajusta a câmera para o mascote inteiro caber, com folga"""
    cena = bpy.context.scene
    cam = cena.camera
    pts = []
    dg = bpy.context.evaluated_depsgraph_get()
    for o in colecao().objects:
        if o.type in {"MESH", "CURVE", "META"}:
            pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
    if not pts:
        return
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    centro = (lo + hi) / 2
    raio = (hi - lo).length / 2
    direcao = Vector((3.1, -8.6, 2.2)).normalized()
    dist = raio * margem / math.tan(cam.data.angle / 2)
    cam.location = centro + direcao * dist
    cam.rotation_euler = (centro - cam.location).to_track_quat("-Z", "Y").to_euler()


def renderizar(caminho):
    enquadrar()
    bpy.context.scene.render.filepath = caminho
    bpy.ops.render.render(write_still=True)
