"""ffmpeg / ffprobe wrappers — async subprocess based.

Public functions:
    * probe(path) -> VideoMetadata
    * extract_thumbnail(path, out_path, at_seconds=None)
    * transcode_hls(src, out_dir, variants=("720p","1080p"))
    * trim_clip(src, start, end, out_path)
"""
from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from pathlib import Path

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)


class FFmpegError(RuntimeError):
    """Raised when an ffmpeg/ffprobe invocation exits non-zero."""


@dataclass(slots=True)
class VideoMetadata:
    duration: float
    width: int
    height: int
    codec: str
    bitrate: int | None

    @property
    def resolution(self) -> str:
        return f"{self.width}x{self.height}"


VARIANT_SPECS: dict[str, dict[str, str]] = {
    "720p": {"height": "720", "v_bitrate": "2800k", "a_bitrate": "128k"},
    "1080p": {"height": "1080", "v_bitrate": "5000k", "a_bitrate": "192k"},
    "2160p": {"height": "2160", "v_bitrate": "15000k", "a_bitrate": "192k"},
}


async def _run(*args: str, capture: bool = True) -> tuple[int, bytes, bytes]:
    log.debug("ffmpeg.invoke", args=args)
    proc = await asyncio.create_subprocess_exec(
        *args,
        stdout=asyncio.subprocess.PIPE if capture else asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    return proc.returncode or 0, stdout or b"", stderr or b""


async def probe(path: Path) -> VideoMetadata:
    code, stdout, stderr = await _run(
        settings.FFPROBE_BIN,
        "-v", "error",
        "-print_format", "json",
        "-show_streams",
        "-show_format",
        str(path),
    )
    if code != 0:
        raise FFmpegError(f"ffprobe failed: {stderr.decode(errors='ignore')}")
    data = json.loads(stdout.decode())
    video_streams = [s for s in data.get("streams", []) if s.get("codec_type") == "video"]
    if not video_streams:
        raise FFmpegError("no video stream found")
    vs = video_streams[0]
    fmt = data.get("format", {})
    duration = float(fmt.get("duration") or vs.get("duration") or 0.0)
    bitrate_raw = fmt.get("bit_rate")
    return VideoMetadata(
        duration=duration,
        width=int(vs.get("width") or 0),
        height=int(vs.get("height") or 0),
        codec=str(vs.get("codec_name") or "unknown"),
        bitrate=int(bitrate_raw) if bitrate_raw and str(bitrate_raw).isdigit() else None,
    )


async def extract_thumbnail(src: Path, out_path: Path, at_seconds: float | None = None) -> Path:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if at_seconds is None:
        try:
            meta = await probe(src)
            at_seconds = max(0.1, meta.duration * 0.1)
        except FFmpegError:
            at_seconds = 1.0

    code, _, stderr = await _run(
        settings.FFMPEG_BIN,
        "-y",
        "-ss", f"{at_seconds:.2f}",
        "-i", str(src),
        "-frames:v", "1",
        "-vf", "scale=640:-2",
        "-q:v", "3",
        str(out_path),
    )
    if code != 0:
        raise FFmpegError(f"thumbnail extraction failed: {stderr.decode(errors='ignore')}")
    return out_path


async def transcode_hls(
    src: Path,
    out_dir: Path,
    variants: tuple[str, ...] = settings.TRANSCODE_VARIANTS,
) -> Path:
    """Transcode ``src`` into one or more HLS renditions; return master.m3u8 path."""
    out_dir.mkdir(parents=True, exist_ok=True)
    try:
        meta = await probe(src)
    except FFmpegError:
        meta = None

    available_variants: list[str] = []
    for variant in variants:
        spec = VARIANT_SPECS.get(variant)
        if not spec:
            log.warning("ffmpeg.unknown_variant", variant=variant)
            continue
        if meta and meta.height and int(spec["height"]) > meta.height + 1:
            # Don't upscale.
            continue
        available_variants.append(variant)

    if not available_variants:
        available_variants = [variants[0]] if variants else ["720p"]

    for variant in available_variants:
        spec = VARIANT_SPECS[variant]
        variant_dir = out_dir / variant
        variant_dir.mkdir(parents=True, exist_ok=True)
        code, _, stderr = await _run(
            settings.FFMPEG_BIN,
            "-y",
            "-i", str(src),
            "-vf", f"scale=-2:{spec['height']}",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-b:v", spec["v_bitrate"],
            "-c:a", "aac",
            "-b:a", spec["a_bitrate"],
            "-hls_time", str(settings.HLS_SEGMENT_SECONDS),
            "-hls_playlist_type", "vod",
            "-hls_segment_filename", str(variant_dir / "segment_%03d.ts"),
            str(variant_dir / "playlist.m3u8"),
        )
        if code != 0:
            raise FFmpegError(
                f"transcode {variant} failed: {stderr.decode(errors='ignore')[:512]}"
            )

    # Build master playlist
    master_lines = ["#EXTM3U", "#EXT-X-VERSION:3"]
    for variant in available_variants:
        spec = VARIANT_SPECS[variant]
        v_bw = int(spec["v_bitrate"].rstrip("k")) * 1000
        height = spec["height"]
        # Estimate width preserving 16:9 if metadata unknown
        width = int(int(height) * 16 / 9)
        master_lines.append(
            f"#EXT-X-STREAM-INF:BANDWIDTH={v_bw},RESOLUTION={width}x{height}"
        )
        master_lines.append(f"{variant}/playlist.m3u8")
    master_path = out_dir / "master.m3u8"
    master_path.write_text("\n".join(master_lines) + "\n", encoding="utf-8")
    return master_path


async def trim_clip(src: Path, start: float, end: float, out_path: Path) -> Path:
    if end <= start:
        raise ValueError("end must be greater than start")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    duration = end - start
    code, _, stderr = await _run(
        settings.FFMPEG_BIN,
        "-y",
        "-ss", f"{start:.3f}",
        "-i", str(src),
        "-t", f"{duration:.3f}",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-c:a", "aac",
        "-movflags", "+faststart",
        str(out_path),
    )
    if code != 0:
        raise FFmpegError(f"clip trim failed: {stderr.decode(errors='ignore')[:512]}")
    return out_path
