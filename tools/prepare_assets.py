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


def presenter(name, height):
    """Separa al presentador en dos sprites: sin copa (presentador.png) y la copa sola (copa.png),
    con la misma escala para poder animar la entrega. Devuelve la posicion de la copa."""
    img = remove_white(Image.open(os.path.join(SRC, name)))
    img = img.crop(img.getbbox())
    a = np.array(img).astype(int)
    r, g, b, al = a[:, :, 0], a[:, :, 1], a[:, :, 2], a[:, :, 3]
    gold = (al > 0) & (r > 120) & (g > 80) & (b < 110) & (r >= g) & ((r - b) > 90)
    skin = (al > 0) & (r > 170) & (g > 110) & (g < 200) & (b > 70) & (b < 170) & ((r - g) > 25)
    gold &= ~skin
    lab, n = ndimage.label(gold)
    sizes = ndimage.sum(gold, lab, range(1, n + 1))
    cup = lab == (np.argmax(sizes) + 1)
    # se llenan los huecos internos y se incluye el contorno negro de la copa
    cup = ndimage.binary_fill_holes(ndimage.binary_closing(cup, iterations=8))
    cup = ndimage.binary_dilation(cup, iterations=9) & ~skin
    # copa sola
    c = a.copy(); c[~cup, 3] = 0
    cup_img = Image.fromarray(c.astype(np.uint8))
    box = cup_img.getbbox()
    # presentador sin copa: zona de la copa (con sombras y contorno) mas los restos dorados de la tapa,
    # rellenada hacia abajo con la camisa/chaqueta que hay justo encima para continuar sus rayas
    hole = ndimage.binary_fill_holes(ndimage.binary_closing(cup, iterations=14))
    hole = ndimage.binary_dilation(hole, iterations=10) & ~skin & (al > 0)
    goldish = (al > 0) & (r > 110) & (g > 70) & (b < 120) & ((r - b) > 70) & ~skin
    zone = np.zeros_like(cup)
    zone[max(0, box[1] - 60):box[3], box[0]:box[2]] = True
    hole |= ndimage.binary_dilation(goldish & zone, iterations=3) & (al > 0) & ~skin
    p = a.copy()
    H_, W_ = hole.shape
    for x in range(W_):
        ys = np.where(hole[:, x])[0]
        if not len(ys):
            continue
        for y in ys:
            # primer pixel de tela por encima (ni hueco ni piel): las rayas son verticales
            src = y - 1
            while src >= 0 and (hole[src, x] or skin[src, x]):
                src -= 1
            if src >= 0:
                p[y, x] = a[src, x]
    scale = height / img.height
    def save(arr, out, crop=None):
        im = Image.fromarray(arr.astype(np.uint8))
        if crop:
            im = im.crop(crop)
        w, h = max(1, round(im.width * scale)), max(1, round(im.height * scale))
        im = im.resize((w, h), Image.BOX)
        q = np.array(im); q[:, :, 3] = np.where(q[:, :, 3] > 140, 255, 0)
        Image.fromarray(q).save(os.path.join(OUT, out))
        print(out, w, h)
    save(p, "presentador.png")
    save(c, "copa.png", box)
    print("copa_offset", round(box[0] * scale), round(box[1] * scale))


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
    presenter("presentador.webp", 140)
    sheet("jaiba_grande.webp", "jg", 62)
    sprite("7.png", "coco.png", 44)
    sprite("3.webp", "pirata.png", 130)
    sprite("8.webp", "logo_victoria.png", 150, thresh=235)
    sprite("5.webp", "logo_pirata.png", 150, thresh=235)
