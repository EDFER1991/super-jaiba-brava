"""Convierte las imagenes fuente (assets/src) en sprites/fondos listos para el juego.
Uso: python tools/prepare_assets.py
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "src")
OUT = os.path.join(ROOT, "assets")


def remove_white(img, thresh=215):
    """Quita el fondo blanco conectado con los bordes de la imagen."""
    a = np.array(img.convert("RGBA"))
    rgb = a[:, :, :3].astype(int)
    white = (rgb.min(axis=2) > thresh)
    labels, _ = ndimage.label(white)
    border = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]])))
    border.discard(0)
    mask = np.isin(labels, list(border))
    a[mask, 3] = 0
    return Image.fromarray(a)


def sprite(name, out, height, thresh=215):
    img = remove_white(Image.open(os.path.join(SRC, name)), thresh)
    img = img.crop(img.getbbox())
    w = round(img.width * height / img.height)
    img = img.resize((w, height), Image.BOX)
    a = np.array(img)
    a[:, :, 3] = np.where(a[:, :, 3] > 140, 255, 0)
    Image.fromarray(a).save(os.path.join(OUT, out))
    print(out, w, height)


def sheet(name, prefix, height, cols=4, rows=2):
    """Recorta una hoja de vistas (4x2) en cuadros individuales con escala comun.
    Orden: 0 frente, 1 frente, 2 lateral derecha, 3 espalda, 4 espalda, 5 espalda, 6 lateral izquierda, 7 frente."""
    img = remove_white(Image.open(os.path.join(SRC, name)))
    cw, ch = img.width / cols, img.height / rows
    frames = []
    for r in range(rows):
        for c in range(cols):
            cell = img.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)))
            a = np.array(cell)
            solid = a[:, :, 3] > 0
            # conserva solo la figura principal (descarta pedazos de las vecinas)
            labels, n = ndimage.label(ndimage.binary_dilation(solid, iterations=6))
            if n > 1:
                sizes = ndimage.sum(solid, labels, range(1, n + 1))
                a[labels != (np.argmax(sizes) + 1), 3] = 0
            cell = Image.fromarray(a)
            frames.append(cell.crop(cell.getbbox()))
    scale = height / max(f.height for f in frames)
    for i, f in enumerate(frames):
        w, h = max(1, round(f.width * scale)), max(1, round(f.height * scale))
        f = f.resize((w, h), Image.BOX)
        a = np.array(f)
        a[:, :, 3] = np.where(a[:, :, 3] > 140, 255, 0)
        Image.fromarray(a).save(os.path.join(OUT, "%s_%d.png" % (prefix, i)))
        print("%s_%d" % (prefix, i), w, h)


def background(name, out, size=(768, 432), shift=0):
    """shift baja la imagen para que su suelo dibujado quede detras del suelo jugable."""
    img = Image.open(os.path.join(SRC, name)).convert("RGB").resize(size, Image.BOX)
    if shift:
        top = np.array(img)[:4].reshape(-1, 3).mean(axis=0).astype(int)
        canvas = Image.new("RGB", size, tuple(top))
        canvas.paste(img, (0, shift))
        img = canvas
    img.save(os.path.join(OUT, out))
    print(out, size)


if __name__ == "__main__":
    background("1.webp", "bg_playa.png", shift=50)
    background("2.webp", "bg_selva.png")
    background("4.webp", "bg_nacaome.png", shift=80)
    background("9.webp", "mapa.png")
    sheet("jaiba_chica.webp", "jc", 46)
    sheet("jaiba_grande.webp", "jg", 62)
    sprite("7.png", "coco.png", 44)
    sprite("3.webp", "pirata.png", 130)
    sprite("8.webp", "logo_victoria.png", 150, thresh=235)
    sprite("5.webp", "logo_pirata.png", 150, thresh=235)
