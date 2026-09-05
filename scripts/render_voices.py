"""Rebuild bundled quips with CMU Flite 2.2 (kal voice).

Requires the optional authoring tool `flite` on PATH. The web game needs no
TTS installation. Original lines live in src/banter.ts. Upstream Flite is
unmodified; voice pitch, duration and output gain are adjusted here.
"""
from pathlib import Path
import array
import hashlib
import json
import re
import subprocess
import tempfile
import wave

root = Path(__file__).resolve().parents[1]
source = (root / "src/banter.ts").read_text()
output = root / "public/audio/voices"
output.mkdir(parents=True, exist_ok=True)
manifest = []
for category, block in re.findall(r"  (\w+): \[(.*?)\],", source, re.S):
    lines = json.loads("[" + re.sub(r",\s*$", "", block.strip()) + "]")
    for index, text in enumerate(lines):
        name = f"{category}-{index}.wav"
        with tempfile.TemporaryDirectory(prefix="burrow-voice-") as tmp:
            raw = Path(tmp) / "raw.wav"
            subprocess.run([
                "flite", "-voice", "kal",
                "--setf", "int_f0_target_mean=205",
                "--setf", "int_f0_target_stddev=30",
                "--setf", "duration_stretch=0.86",
                "-t", text, "-o", str(raw),
            ], check=True, capture_output=True)
            with wave.open(str(raw), "rb") as wav:
                channels, width, rate, frames, *_ = wav.getparams()
                assert channels == 1 and width == 2
                samples = array.array("h", wav.readframes(frames))
            peak = max(abs(x) for x in samples) or 1
            gain = min(2.5, 27000 / peak)
            normalized = array.array("h", (round(x * gain) for x in samples))
            # A fresh PCM-only header excludes authoring-machine metadata.
            with wave.open(str(output / name), "wb") as wav:
                wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(rate)
                wav.writeframes(normalized.tobytes())
        manifest.append({"file": name, "text": text, "seconds": round(frames / rate, 3), "sha256": hashlib.sha256((output / name).read_bytes()).hexdigest()})
(output / "manifest.json").write_text(json.dumps({"generator": "CMU Flite 2.2", "voice": "kal", "processing": "F0 mean205, deviation30, duration0.86; peak-normalized PCM", "clips": manifest}, indent=2) + "\n")
print(f"Rendered {len(manifest)} original quips; {sum((output / m['file']).stat().st_size for m in manifest):,} bytes")
