"""O RONDIN em 3D, feito por script no Blender (a mesma esfera de pontos do app, em app/src/lib/orbe.ts).

Como rodar (gera tudo em brand/rondin-3d/saida/):
    blender -b -P brand/rondin-3d/rondin3d.py                 # cena, imagem e modelo
    blender -b -P brand/rondin-3d/rondin3d.py -- --video      # também o vídeo girando (demora mais)

Sai:
    rondin.blend      a cena, para abrir e mexer no Blender
    rondin.png        imagem 2048x2048 em fundo preto
    rondin-transparente.png   a mesma, sem fundo (para o site e as lojas)
    rondin.glb        o modelo 3D (para usar no app ou no site)
    rondin.mp4        uma volta completa, em loop (só com --video)

Mexa nos números do bloco "AJUSTES" para mudar o visual.
"""
import math
import os
import sys

import bmesh
import bpy

# ---------------- AJUSTES ----------------
PONTOS = 1100          # quantos pontos na esfera
RAIO = 1.0             # raio da esfera
TAMANHO_PONTO = 0.0072 # raio de um ponto apagado (os acesos crescem até ~3,3x)
INCLINACAO = 0.42      # quanto a esfera tomba para a frente (radianos), como no app
QUADROS = 360          # uma volta completa (a 30 quadros por segundo = 12 s)
BRILHO = 1.5           # força da luz dos pontos
FUNDO = (0.0, 0.0, 0.0)
# -----------------------------------------

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, "saida")
os.makedirs(SAIDA, exist_ok=True)
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def esfera(n):
    """pontos bem espalhados na esfera (espiral de Fibonacci), igual ao app"""
    ouro = math.pi * (3 - math.sqrt(5))
    for i in range(n):
        y = 1 - (2 * (i + 0.5)) / n
        r = math.sqrt(1 - y * y)
        f = i * ouro
        yield math.cos(f) * r, y, math.sin(f) * r


def cor_do_ponto(branco, luz):
    """lilás e roxo conforme o brilho, indo ao branco nos pontos mais fortes (a mesma conta do app)"""
    r = min(255, 138 + (196 - 138) * luz + (255 - 196) * branco)
    g = min(255, 61 + (168 - 61) * luz + (255 - 168) * branco)
    return r / 255, g / 255, 1.0


def srgb_para_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def limpar():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def criar_orbe():
    """uma malha só, com um pontinho (icosfera) por ponto; a cor e o brilho de cada um vão num atributo de cor"""
    malha = bpy.data.meshes.new("RONDIN")
    bm = bmesh.new()
    cores = []
    for x, y, z in esfera(PONTOS):
        faixa = 0.5 + 0.5 * math.sin(y * 8.5 + x * 2.2)    # as faixas de luz do app
        luz = faixa * faixa
        branco = min(1.0, (luz - 0.82) * 5.5) if luz > 0.82 else 0.0
        raio = TAMANHO_PONTO * (0.55 + 2.1 * luz) / 0.55 * 0.6 + TAMANHO_PONTO * 0.4
        forca = 0.18 + 0.82 * luz                            # os apagados quase somem, como no app
        r, g, b = cor_do_ponto(branco, luz)
        cor = (srgb_para_linear(r) * forca, srgb_para_linear(g) * forca, srgb_para_linear(b) * forca, 1.0)
        # no Blender o "para cima" é Z: o y do app vira z
        geo = bmesh.ops.create_icosphere(bm, subdivisions=3, radius=raio)
        for v in geo["verts"]:
            v.co.x += x * RAIO
            v.co.y += z * RAIO
            v.co.z += y * RAIO
            cores.append(cor)
    bm.to_mesh(malha)
    bm.free()
    atributo = malha.color_attributes.new("Cor", "FLOAT_COLOR", "POINT")
    for i, c in enumerate(cores):
        atributo.data[i].color = c
    for p in malha.polygons:
        p.use_smooth = True

    objeto = bpy.data.objects.new("RONDIN", malha)
    bpy.context.scene.collection.objects.link(objeto)
    objeto.data.materials.append(material())

    miolo = bpy.data.meshes.new("RONDIN_miolo")
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=32, radius=RAIO * 0.96)
    bm.to_mesh(miolo)
    bm.free()
    for p in miolo.polygons:
        p.use_smooth = True
    miolo_obj = bpy.data.objects.new("RONDIN_miolo", miolo)
    bpy.context.scene.collection.objects.link(miolo_obj)
    miolo_obj.data.materials.append(material_miolo())

    # o suporte tomba a esfera para a frente; a esfera gira em volta do próprio eixo
    suporte = bpy.data.objects.new("RONDIN_suporte", None)
    bpy.context.scene.collection.objects.link(suporte)
    suporte.rotation_euler = (-INCLINACAO, 0, 0)
    objeto.parent = suporte
    miolo_obj.parent = suporte
    return objeto


def material():
    m = bpy.data.materials.new("RONDIN_pontos")
    m.use_nodes = True
    nos = m.node_tree.nodes
    ligas = m.node_tree.links
    bsdf = nos.get("Principled BSDF")
    cor = nos.new("ShaderNodeVertexColor")
    cor.layer_name = "Cor"
    ligas.new(cor.outputs["Color"], bsdf.inputs["Base Color"])
    ligas.new(cor.outputs["Color"], bsdf.inputs["Emission Color"])
    bsdf.inputs["Emission Strength"].default_value = BRILHO
    bsdf.inputs["Roughness"].default_value = 0.4
    return m


def material_miolo():
    """uma película escura e translúcida dentro da esfera: os pontos de trás aparecem bem apagados"""
    m = bpy.data.materials.new("RONDIN_miolo")
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0, 0, 0, 1)
    bsdf.inputs["Roughness"].default_value = 1
    bsdf.inputs["Specular IOR Level"].default_value = 0
    bsdf.inputs["Alpha"].default_value = 0.9
    try:
        m.surface_render_method = "BLENDED"
    except AttributeError:
        m.blend_method = "BLEND"
    return m


def animar(objeto):
    cena = bpy.context.scene
    cena.frame_start, cena.frame_end = 1, QUADROS
    cena.render.fps = 30
    objeto.rotation_euler = (0, 0, 0)
    objeto.keyframe_insert("rotation_euler", index=2, frame=1)
    objeto.rotation_euler = (0, 0, -2 * math.pi)
    objeto.keyframe_insert("rotation_euler", index=2, frame=QUADROS + 1)   # +1: a volta fecha sem quadro repetido
    acao = objeto.animation_data.action
    curvas = []
    try:
        curvas = list(acao.fcurves)
    except AttributeError:   # Blender 5: as curvas ficam em camadas
        for camada in acao.layers:
            for faixa in camada.strips:
                for canal in faixa.channelbags:
                    curvas += list(canal.fcurves)
    for c in curvas:
        for k in c.keyframe_points:
            k.interpolation = "LINEAR"


def camera_e_mundo():
    cena = bpy.context.scene
    cam_dados = bpy.data.cameras.new("Camera")
    cam_dados.lens = 85
    cam = bpy.data.objects.new("Camera", cam_dados)
    cena.collection.objects.link(cam)
    cam.location = (0, -6.4, 0)
    cam.rotation_euler = (math.pi / 2, 0, 0)
    cena.camera = cam

    mundo = bpy.data.worlds.new("Fundo")
    mundo.use_nodes = True
    fundo = mundo.node_tree.nodes.get("Background")
    fundo.inputs["Color"].default_value = (*FUNDO, 1)
    fundo.inputs["Strength"].default_value = 1
    cena.world = mundo


def render():
    cena = bpy.context.scene
    for motor in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
        try:
            cena.render.engine = motor
            break
        except TypeError:
            continue
    cena.render.resolution_x = cena.render.resolution_y = 2048
    cena.render.film_transparent = False
    try:
        cena.view_settings.view_transform = "Standard"   # mantém o roxo do app (o AgX desbota para branco)
    except TypeError:
        pass
    cena.view_settings.look = "None"
    brilho_em_volta()


def brilho_em_volta():
    """o halo de luz em volta dos pontos acesos (o "bloom"), feito no compositor"""
    cena = bpy.context.scene
    try:
        if hasattr(cena, "compositing_node_group"):          # Blender 5
            arvore = bpy.data.node_groups.new("Brilho", "CompositorNodeTree")
            cena.compositing_node_group = arvore
            entrada = arvore.nodes.new("CompositorNodeRLayers")
            saida = arvore.nodes.new("NodeGroupOutput")
            arvore.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
        else:
            cena.use_nodes = True
            arvore = cena.node_tree
            arvore.nodes.clear()
            entrada = arvore.nodes.new("CompositorNodeRLayers")
            saida = arvore.nodes.new("CompositorNodeComposite")
        brilho = arvore.nodes.new("CompositorNodeGlare")
        ajustes = {"Type": "Bloom", "Quality": "High", "Threshold": 0.8, "Size": 0.35, "Strength": 0.55}
        for nome, valor in ajustes.items():
            if nome in brilho.inputs:
                brilho.inputs[nome].default_value = valor
            elif nome == "Type":
                brilho.glare_type = "BLOOM"
            elif nome == "Quality":
                brilho.quality = "HIGH"
            elif nome == "Threshold":
                brilho.threshold = valor
        arvore.links.new(entrada.outputs["Image"], brilho.inputs["Image"])
        arvore.links.new(brilho.outputs["Image"], saida.inputs[0])
    except Exception as e:   # sem o halo a imagem sai igual, só mais seca
        print("RONDIN: sem o brilho em volta:", e)


def salvar_imagens():
    cena = bpy.context.scene
    cena.frame_set(40)
    cena.render.image_settings.file_format = "PNG"
    cena.render.image_settings.color_mode = "RGBA"
    cena.render.filepath = os.path.join(SAIDA, "rondin.png")
    bpy.ops.render.render(write_still=True)
    cena.render.film_transparent = True
    cena.render.filepath = os.path.join(SAIDA, "rondin-transparente.png")
    bpy.ops.render.render(write_still=True)
    cena.render.film_transparent = False


def salvar_video():
    """renderiza a volta quadro a quadro em saida/quadros/ (se parar no meio, rodar de novo continua de onde parou)
    e junta tudo no rondin.mp4 com o ffmpeg, se ele estiver instalado (senão, ver montar_video.py)"""
    cena = bpy.context.scene
    cena.render.resolution_x = cena.render.resolution_y = 1080
    cena.render.image_settings.file_format = "PNG"
    cena.render.image_settings.color_mode = "RGB"
    cena.render.use_overwrite = False                    # quadros já prontos não são feitos de novo
    cena.render.use_placeholder = True
    pasta = os.path.join(SAIDA, "quadros")
    os.makedirs(pasta, exist_ok=True)
    cena.render.filepath = os.path.join(pasta, "q_")
    bpy.ops.render.render(animation=True)
    cena.render.resolution_x = cena.render.resolution_y = 2048
    import shutil
    import subprocess
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg:
        subprocess.run([ffmpeg, "-y", "-framerate", "30", "-i", os.path.join(pasta, "q_%04d.png"), "-c:v", "libx264",
                        "-pix_fmt", "yuv420p", "-crf", "18", os.path.join(SAIDA, "rondin.mp4")], check=True)
    else:
        print("RONDIN: quadros prontos em", pasta, "- para juntar no vídeo: python brand/rondin-3d/montar_video.py")


def salvar_modelo():
    bpy.ops.export_scene.gltf(filepath=os.path.join(SAIDA, "rondin.glb"), export_format="GLB",
                              export_animations=True, export_cameras=False, export_lights=False)


limpar()
orbe = criar_orbe()
animar(orbe)
camera_e_mundo()
render()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SAIDA, "rondin.blend"))
salvar_imagens()
salvar_modelo()
if "--video" in ARGS:
    salvar_video()
print("RONDIN: pronto em", SAIDA)
