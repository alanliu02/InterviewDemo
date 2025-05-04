# app/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from typing import List
import tiffslide
from h5py import File
from io import BytesIO
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse

app = FastAPI()

# 跨域设置，允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SVS_DIR = Path("D:\InterviewTask\svs_files")

@app.get("/list_svs", response_model=List[str])
def list_svs_files():
    return [str(f.name) for f in SVS_DIR.glob("*.svs")]

@app.get("/list_svs_seg", response_model=List[str])
def list_svs_seg_files():
    return [str(f.name) for f in SVS_DIR.glob("*.svs.seg.h5")]

@app.get("/load_slide/{filename}")
def load_slide(filename: str):
    file_path = SVS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Item not found")
    global slide
    slide = tiffslide.TiffSlide(str(file_path))
    info = {
        "dimensions": slide.dimensions,
        "level_count": slide.level_count,
        "level_dimensions": [slide.level_dimensions[i] for i in range(slide.level_count)],
        "level_downsamples": [slide.level_downsamples[i] for i in range(slide.level_count)]
    }
    return info

# @app.get("/get_svs_seg_info/{filename}")
# def get_svs_seg_info(filename: str):
#     file_path = SVS_DIR / filename
#     if not file_path.exists():
#         return {"error": "File not found"}

@app.get("/get_h5_info/{filename}")
def get_h5_info(filename: str):
    file_path = SVS_DIR / filename
    if not file_path.exists():
        return {"error": "File not found"}

    try:
        with File(file_path, 'r') as h5_file:
            info = {
                "keys": list(h5_file.keys()),
                "attributes": {key: val for key, val in h5_file.attrs.items()}
            }
        return info
    except Exception as e:
        return {"error": str(e)}
    
@app.get('/slide/{level}/{col}_{row}.jpeg')
def get_tile(level: int, col: int, row: int):
    global slide
    if slide is None:
        raise HTTPException(status_code=404, detail="Slide not loaded. Please load a slide first.")

    try:
        size = 512
        max_svs_level = len(slide.level_dimensions)
        dzi_level = level
        svs_level = max_svs_level - dzi_level - 1

        if svs_level >= len(slide.level_dimensions):
            raise HTTPException(status_code=400, detail="Requested level exceeds available levels in the slide.")
        elif svs_level < 0:
            level_overflow = abs(svs_level)
            adjust_ratio = 2 ** (dzi_level - level_overflow * 2)
            svs_level = 0
        else:
            adjust_ratio = 2 ** dzi_level

        zoom_ratio = slide.level_dimensions[0][0] / slide.level_dimensions[svs_level][0]

        x = int(col * size * zoom_ratio * adjust_ratio)
        y = int(row * size * zoom_ratio * adjust_ratio)
        img = slide.read_region((x, y), svs_level, (size * adjust_ratio, size * adjust_ratio))
        img = img.resize((size, size))

        img_io = BytesIO()
        img.convert('RGB').save(img_io, 'JPEG', quality=70)
        img_io.seek(0)
        return StreamingResponse(img_io, media_type='image/jpeg')
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing tile: {str(e)}")
