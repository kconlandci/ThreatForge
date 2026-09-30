"""Shrinks .build/raw.pdf and writes the final file the game site serves."""
import pathlib, pymupdf

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent.parent / "public" / "demo-kit" / "Human-Loop-demo-kit.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)
doc = pymupdf.open(HERE / ".build" / "raw.pdf")
doc.subset_fonts()
doc.set_metadata({"title": "Human Loop demo kit", "author": "DCI Resources LLC", "subject": "Handout, 5-minute demo script and answers to common questions"})
doc.save(OUT, garbage=4, deflate=True, deflate_fonts=True, deflate_images=True, clean=True)
print("wrote", OUT, OUT.stat().st_size, "bytes,", len(doc), "pages")
