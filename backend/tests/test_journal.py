import pytest
from sqlalchemy import select

from app.models.video import Video, VideoStatus


async def _seed_video(db, user_id):
    v = Video(user_id=user_id, title="Vid", status=VideoStatus.READY)
    db.add(v)
    await db.commit()
    await db.refresh(v)
    return v


@pytest.mark.asyncio
async def test_journal_crud(auth_client, db_session):
    # Get current user id
    me = (await auth_client.get("/api/v1/auth/me")).json()["data"]
    v = await _seed_video(db_session, me["id"])

    # create
    r = await auth_client.post(
        f"/api/v1/videos/{v.id}/journal",
        json={"timestamp_seconds": 10.5, "content_text": "Magic happens here"},
    )
    assert r.status_code == 201, r.text
    entry_id = r.json()["data"]["id"]

    # list
    r = await auth_client.get(f"/api/v1/videos/{v.id}/journal")
    assert r.status_code == 200
    assert len(r.json()["data"]) == 1

    # update
    r = await auth_client.put(
        f"/api/v1/journal/{entry_id}",
        json={"content_text": "Updated"},
    )
    assert r.status_code == 200
    assert r.json()["data"]["content_text"] == "Updated"

    # search (ILIKE branch under sqlite)
    r = await auth_client.get("/api/v1/journal/search?q=Updated")
    assert r.status_code == 200
    assert any(h["id"] == entry_id for h in r.json()["data"])

    # delete
    r = await auth_client.delete(f"/api/v1/journal/{entry_id}")
    assert r.status_code == 200
