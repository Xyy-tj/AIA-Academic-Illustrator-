import os
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text, inspect

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
else:
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
        inspector = inspect(engine)
        with engine.connect() as conn:
            # Helper to check and add column
            def ensure_column(table_name, col_name, col_type_def):
                # Handle case sensitivity for table names if necessary, usually lowercase for these models
                # inspector.get_table_names() could verify table existence first
                if not inspector.has_table(table_name):
                    return
                    
                columns = [c["name"] for c in inspector.get_columns(table_name)]
                if col_name not in columns:
                    print(f"Migrating {table_name}: adding {col_name}")
                    conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type_def}"))

            # GenerationHistory
            ensure_column('generationhistory', 'session_id', 'VARCHAR(255)')
            ensure_column('generationhistory', 'updated_at', 'TIMESTAMP NULL')
            
            # User
            ensure_column('user', 'email', 'VARCHAR(255)')
            ensure_column('user', 'email_verified', 'BOOLEAN DEFAULT 0')
            
            # SystemSettings
            for col_def in [
                ("smtp_host", "VARCHAR(255)"),
                ("smtp_port", "INTEGER"),
                ("smtp_user", "VARCHAR(255)"),
                ("smtp_password", "VARCHAR(255)"),
                ("smtp_tls", "BOOLEAN"),
                ("smtp_from", "VARCHAR(255)"),
                ("epay_api_url", "VARCHAR(255)"),
                ("epay_pid", "VARCHAR(255)"),
                ("epay_key", "VARCHAR(255)"),
                ("epay_return_url", "VARCHAR(255)"),
                ("epay_notify_url", "VARCHAR(255)"),
                ("recharge_ratio", "INTEGER"),
                ("pay_provider", "VARCHAR(50)"),
                ("hupi_appid", "VARCHAR(255)"),
                ("hupi_appsecret", "VARCHAR(255)"),
                ("hupi_return_url", "VARCHAR(255)"),
                ("hupi_notify_url", "VARCHAR(255)"),
                ("hupi_callback_url", "VARCHAR(255)"),
                ("site_logo", "TEXT"),
                ("site_favicon", "TEXT"),
                ("footer_text", "TEXT"),
                ("announcement_enabled", "BOOLEAN DEFAULT 0"),
                ("announcement_title", "VARCHAR(255)"),
                ("announcement_body", "TEXT"),
                ("announcement_last_updated", "TIMESTAMP NULL"),
            ]:
                name, typ = col_def
                ensure_column('systemsettings', name, typ)
            
            # 3. Modify image_data column to LONGTEXT/TEXT if needed
            # For MySQL/MariaDB, we might need to explicitly alter the column to LONGTEXT
            try:
                # Check if it's MySQL/MariaDB
                if "mysql" in str(engine.url) or "mariadb" in str(engine.url):
                    conn.execute(text("ALTER TABLE referenceimage MODIFY COLUMN image_data LONGTEXT"))
                    print("Modified ReferenceImage.image_data to LONGTEXT")
                    # Ensure GenerationHistory columns can store long text
                    try:
                        conn.execute(text("ALTER TABLE generationhistory MODIFY COLUMN input_summary TEXT"))
                        print("Modified GenerationHistory.input_summary to TEXT")
                    except Exception as ex1:
                        print(f"Failed to modify GenerationHistory.input_summary: {ex1}")
                    try:
                        conn.execute(text("ALTER TABLE generationhistory MODIFY COLUMN schema_text LONGTEXT"))
                        print("Modified GenerationHistory.schema_text to LONGTEXT")
                    except Exception as ex2:
                        print(f"Failed to modify GenerationHistory.schema_text: {ex2}")
            except Exception as ex:
                print(f"Failed to modify image_data column: {ex}")

            conn.commit()
    except Exception as e:
        print(f"Schema migration warning: {e}")
