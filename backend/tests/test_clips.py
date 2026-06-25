import pytest

from app.models.video import Video, VideoStatus


async def _seed_video(db, user_id):
    v = Video(user_id=user_id, title="Vid", duration=60, status=VideoStatus.READY, original_path="/tmp/none.mp4")
    db.add(v)
    await db.commit()
    await db.refresh(v)
    return v


@pytest.mark.asyncio
async def test_clip_create_and_share(auth_client, db_session, monkeypatch):
    me = (await auth_client.get("/api/v1/auth/me")).json()["data"]
    v = await _seed_video(db_session, me["id"])

    # Mock trim_clip to no-op
    async def _fake_trim(src, start, end, out):
        from pathlib import Path
        Path(out).parent.mkdir(parents=True, exist_ok=True)
        Path(out).write_bytes(b"\x00" * 100)
        return out

    monkeypatch.setattr("app.api.clips.trim_clip", _fake_trim)

    r = await auth_client.post(
        f"/api/v1/videos/{v.id}/clips",
        json={"title": "Best part", "start_time": 5, "end_time": 12},
    )
    assert r.status_code == 201, r.text
    clip_id = r.json()["data"]["id"]

    # invalid range
    r = await auth_client.post(
        f"/api/v1/videos/{v.id}/clips",
        json={"title": "bad", "start_time": 5, "end_time": 5},
    )
    assert r.status_code == 422

    # share
    r = await auth_client.post(f"/api/v1/clips/{clip_id}/share")
    assert r.status_code == 200
    token = r.json()["data"]["token"]
    assert len(token) > 20

    # public access
    r = await auth_client.get(f"/api/v1/share/{token}")
    assert r.status_code == 200
    assert r.json()["data"]["kind"] == "clip"
