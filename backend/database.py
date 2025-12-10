from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text

sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    migrate_schema()


def get_session():
    with Session(engine) as session:
        yield session


def migrate_schema():
    try:
        with engine.connect() as conn:
            # Check GenerationHistory columns
            cols = conn.execute(text("PRAGMA table_info('generationhistory')")).mappings().all()
            col_names = {c["name"] for c in cols}
            if "session_id" not in col_names:
                conn.execute(text("ALTER TABLE generationhistory ADD COLUMN session_id TEXT"))
            if "updated_at" not in col_names:
                conn.execute(text("ALTER TABLE generationhistory ADD COLUMN updated_at TIMESTAMP"))
            conn.commit()
    except Exception as e:
        print(f"Schema migration warning: {e}")
