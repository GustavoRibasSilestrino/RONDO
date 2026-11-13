"""Junta os quadros de saida/quadros/ (feitos por `blender -b -P rondin3d.py -- --video`) no saida/rondin.mp4.
Usa o ffmpeg do pacote imageio-ffmpeg (pip install imageio-ffmpeg), para quem não tem o ffmpeg instalado."""
import os
import subprocess

import imageio_ffmpeg

AQUI = os.path.dirname(os.path.abspath(__file__))
QUADROS = os.path.join(AQUI, "saida", "quadros", "q_%04d.png")
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-framerate", "30", "-i", QUADROS, "-c:v", "libx264",
                "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", os.path.join(AQUI, "saida", "rondin.mp4")],
               check=True)
print("RONDIN: vídeo pronto em", os.path.join(AQUI, "saida", "rondin.mp4"))
