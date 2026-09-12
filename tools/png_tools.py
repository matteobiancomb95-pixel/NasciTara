#!/usr/bin/env python3
"""
Utilita' PNG in Python puro: decodifica, ritaglio ai margini utili, ricodifica.

Serve perche' su questa macchina non c'e' Pillow. sips sa ridimensionare ma non
sa ritagliare sul contenuto, e i file del brand kit hanno margini generosi che
in un header stretto diventano spazio morto.

    python3 tools/png_tools.py trim ingresso.png uscita.png [--pad 8]
"""
import struct
import sys
import zlib


def read_png(path):
    data = open(path, "rb").read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", f"{path}: non e' un PNG"
    pos, idat, meta = 8, b"", None
    while pos < len(data):
        (length,) = struct.unpack(">I", data[pos : pos + 4])
        ctype = data[pos + 4 : pos + 8]
        body = data[pos + 8 : pos + 8 + length]
        if ctype == b"IHDR":
            w, h, depth, color, comp, filt, inter = struct.unpack(">IIBBBBB", body)
            assert depth == 8, f"{path}: supportati solo 8 bit per canale, trovato {depth}"
            assert inter == 0, f"{path}: PNG interlacciato non supportato"
            assert color in (2, 6), f"{path}: color type {color} non supportato (servono RGB o RGBA)"
            meta = {"w": w, "h": h, "color": color, "channels": 3 if color == 2 else 4}
        elif ctype == b"IDAT":
            idat += body
        elif ctype == b"IEND":
            break
        pos += 12 + length

    raw = zlib.decompress(idat)
    ch, w, h = meta["channels"], meta["w"], meta["h"]
    stride = w * ch
    out = bytearray(stride * h)
    prev = bytearray(stride)
    p = 0
    for y in range(h):
        f = raw[p]
        p += 1
        line = bytearray(raw[p : p + stride])
        p += stride
        if f == 1:
            for i in range(ch, stride):
                line[i] = (line[i] + line[i - ch]) & 0xFF
        elif f == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 0xFF
        elif f == 3:
            for i in range(stride):
                a = line[i - ch] if i >= ch else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 0xFF
        elif f == 4:
            for i in range(stride):
                a = line[i - ch] if i >= ch else 0
                b = prev[i]
                c = prev[i - ch] if i >= ch else 0
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 0xFF
        out[y * stride : (y + 1) * stride] = line
        prev = line
    return meta, bytes(out)


def write_png(path, w, h, channels, pixels):
    color = 2 if channels == 3 else 6
    stride = w * channels
    raw = bytearray()
    for y in range(h):
        raw.append(0)  # filtro None: i file sono piccoli, non vale la pena ottimizzare
        raw += pixels[y * stride : (y + 1) * stride]

    def chunk(tag, body):
        return (
            struct.pack(">I", len(body))
            + tag
            + body
            + struct.pack(">I", zlib.crc32(tag + body) & 0xFFFFFFFF)
        )

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, color, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    open(path, "wb").write(png)


def content_bbox(meta, px, alpha_threshold=8, white_tolerance=6):
    """
    Riquadro del contenuto reale. Su RGBA guarda l'alpha, su RGB cerca cio' che
    non e' bianco: i due file del brand kit usano l'una o l'altra convenzione.
    """
    w, h, ch = meta["w"], meta["h"], meta["channels"]
    stride = w * ch
    x0, y0, x1, y1 = w, h, -1, -1
    for y in range(h):
        row = y * stride
        for x in range(w):
            i = row + x * ch
            if ch == 4:
                solid = px[i + 3] > alpha_threshold
            else:
                solid = not (
                    px[i] >= 255 - white_tolerance
                    and px[i + 1] >= 255 - white_tolerance
                    and px[i + 2] >= 255 - white_tolerance
                )
            if solid:
                if x < x0: x0 = x
                if x > x1: x1 = x
                if y < y0: y0 = y
                if y > y1: y1 = y
    if x1 < 0:
        return None
    return x0, y0, x1, y1


def trim(src, dst, pad=0):
    meta, px = read_png(src)
    box = content_bbox(meta, px)
    if box is None:
        raise SystemExit(f"{src}: immagine vuota")
    w, h, ch = meta["w"], meta["h"], meta["channels"]
    x0, y0, x1, y1 = box
    x0 = max(0, x0 - pad); y0 = max(0, y0 - pad)
    x1 = min(w - 1, x1 + pad); y1 = min(h - 1, y1 + pad)
    nw, nh = x1 - x0 + 1, y1 - y0 + 1
    stride = w * ch
    out = bytearray()
    for y in range(y0, y1 + 1):
        out += px[y * stride + x0 * ch : y * stride + (x1 + 1) * ch]
    write_png(dst, nw, nh, ch, bytes(out))
    print(f"{src.split('/')[-1]}: {w}x{h} -> {nw}x{nh}  (canali {ch})")


if __name__ == "__main__":
    if len(sys.argv) < 4 or sys.argv[1] != "trim":
        print(__doc__)
        raise SystemExit(1)
    pad = 0
    if "--pad" in sys.argv:
        pad = int(sys.argv[sys.argv.index("--pad") + 1])
    trim(sys.argv[2], sys.argv[3], pad)
