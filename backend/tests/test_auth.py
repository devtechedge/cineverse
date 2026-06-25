import pytest


@pytest.mark.asyncio
async def test_register_login_me_logout(client):
    payload = {"email": "alice@cineverse.example", "password": "supersecret1", "full_name": "Alice"}

    # register
    r = await client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 201
    body = r.json()
    assert body["success"] is True
    assert body["data"]["access_token"]
    assert body["data"]["refresh_token"]

    # duplicate register → 409
    r = await client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 409

    # login
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert r.status_code == 200
    tokens = r.json()["data"]
    access = tokens["access_token"]
    refresh = tokens["refresh_token"]

    # me
    r = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert r.status_code == 200
    assert r.json()["data"]["email"] == payload["email"]

    # refresh
    r = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert r.status_code == 200
    new_access = r.json()["data"]["access_token"]
    assert new_access

    # logout
    r = await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh},
        headers={"Authorization": f"Bearer {new_access}"},
    )
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "bob@cineverse.example", "password": "validpass1"},
    )
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "bob@cineverse.example", "password": "wrongpass!"},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_me_requires_token(client):
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_malformed_token(client):
    r = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert r.status_code == 401
