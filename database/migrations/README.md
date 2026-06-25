# Database migrations

Alembic owns the schema. Versioned migration scripts live in
[`../backend/alembic/versions/`](../../backend/alembic/versions/).

```bash
# create a new migration from model changes
cd backend && alembic revision --autogenerate -m "add captions"
# apply
alembic upgrade head
```

This folder exists for SQL-only artefacts (seeds, ad-hoc DDL, dump rollback
scripts) when you don't want to round-trip through Alembic.
