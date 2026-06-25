import io
from unittest.mock import patch, AsyncMock
from pathlib import Path

import pytest


@pytest.mark.asyncio
async def test_full_upload_flow(auth_client, tmp_path, monkeypatch):
    # mock heavy ffmpeg work
    async def _fake_probe(path):
        from app.services.ffmpeg_service import VideoMetadata
        return VideoMetadata(duration=12.5, width=1920, height=1080, codec="h264", bitrate=4000000)

    async def _fake_thumb(src, out, at_seconds=None):
        Path(out).parent.mkdir(parents=True, exist_ok=True)
        Path(out).write_bytes(b"\xff\xd8\xff\xe0fake")
        return out

    async def _fake_transcode(src, out_dir, variants=("720p",)):
        out_dir.mkdir(parents=True, exist_ok=True)
        master = out_dir / "master.m3u8"
        master.write_text("#EXTM3U\n#EXT-X-VERSION:3\n720p/playlist.m3u8\n")
        (out_dir / "720p").mkdir(exist_ok=True)
        (out_dir / "720p" / "playlist.m3u8").write_text("#EXTM3U\n")
        return master

    monkeypatch.setattr("app.api.videos.probe", _fake_probe)
    monkeypatch.setattr("app.api.videos.extract_thumbnail", _fake_thumb)
    monkeypatch.setattr("app.api.videos.transcode_hls", _fake_transcode)

    # init
    init_payload = {"filename": "demo.mp4", "size_bytes": 16, "title": "Demo", "tags": ["test", "demo"]}
    r = await auth_client.post("/api/v1/videos/init", json=init_payload)
    assert r.status_code == 201, r.text
    upload_id = r.json()["data"]["upload_id"]

    # chunk
    files = {"chunk": ("c0", io.BytesIO(b"hello-world-chunk"), "application/octet-stream")}
    r = await auth_client.post(
        f"/api/v1/videos/chunk/{upload_id}",
        data={"chunk_index": 0},
        files=files,
    )
    assert r.status_code == 200

    # finalize (background task runs in-process via TestClient)
    r = await auth_client.post(f"/api/v1/videos/finalize/{upload_id}")
    assert r.status_code == 200
    video_id = r.json()["data"]["video_id"]
    assert video_id

    # list
    r = await auth_client.get("/api/v1/videos")
    assert r.status_code == 200
    listing = r.json()
    assert listing["meta"]["total"] >= 1

    # get detail
    r = await auth_client.get(f"/api/v1/videos/{video_id}")
    assert r.status_code == 200

    # delete
    r = await auth_client.delete(f"/api/v1/videos/{video_id}")
    assert r.status_code == 200
    assert r.json()["data"]["deleted"] is True


@pytest.mark.asyncio
async def test_init_rejects_bad_extension(auth_client):
    r = await auth_client.post(
        "/api/v1/videos/init",
        json={"filename": "danger.exe", "size_bytes": 100, "title": "x"},
    )
    assert r.status_code == 415


@pytest.mark.asyncio
async def test_list_requires_auth(client):
    r = await client.get("/api/v1/videos")
    assert r.status_code == 401
