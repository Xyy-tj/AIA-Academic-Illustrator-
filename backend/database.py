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
            def ensure_column(table_name, col_name, col_type_def, existing_columns_cache=None):
                # Handle case sensitivity for table names if necessary
                actual_table_name = table_name
                existing_tables = inspector.get_table_names()
                
                # Case insensitive search
                found = False
                for t in existing_tables:
                    if t.lower() == table_name.lower():
                        actual_table_name = t
                        found = True
                        break
                
                if not found:
                    if not inspector.has_table(table_name):
                        return
                
                # Use cache if provided, otherwise fetch
                if existing_columns_cache is not None:
                    columns = existing_columns_cache
                else:
                    columns = [c["name"] for c in inspector.get_columns(actual_table_name)]
                
                if col_name not in columns:
                    print(f"Migrating {actual_table_name}: adding {col_name}")
                    conn.execute(text(f"ALTER TABLE {actual_table_name} ADD COLUMN {col_name} {col_type_def}"))

            # GenerationHistory
            gh_cols = [c["name"] for c in inspector.get_columns('generationhistory')] if inspector.has_table('generationhistory') else []
            ensure_column('generationhistory', 'session_id', 'VARCHAR(255)', gh_cols)
            ensure_column('generationhistory', 'updated_at', 'TIMESTAMP NULL', gh_cols)
            
            # User
            user_cols = [c["name"] for c in inspector.get_columns('user')] if inspector.has_table('user') else []
            ensure_column('user', 'email', 'VARCHAR(255)', user_cols)
            ensure_column('user', 'email_verified', 'BOOLEAN DEFAULT 0', user_cols)
            
            # SystemSettings
            ss_cols = [c["name"] for c in inspector.get_columns('systemsettings')] if inspector.has_table('systemsettings') else []
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
                ("site_name", "VARCHAR(255) DEFAULT 'Academic Illustrator'"),
                ("footer_text", "TEXT"),
                ("announcement_enabled", "BOOLEAN DEFAULT 0"),
                ("announcement_title", "VARCHAR(255)"),
                ("announcement_body", "TEXT"),
                ("announcement_image_url", "TEXT"),
                ("announcement_last_updated", "TIMESTAMP NULL"),
                ("aliyun_access_key_id", "VARCHAR(255)"),
                ("aliyun_access_key_secret", "VARCHAR(255)"),
                ("aliyun_endpoint", "VARCHAR(255) DEFAULT 'imageenhan.cn-shanghai.aliyuncs.com'"),
                ("storage_type", "VARCHAR(50) DEFAULT 'local'"),
                ("cos_secret_id", "VARCHAR(255)"),
                ("cos_secret_key", "VARCHAR(255)"),
                ("cos_region", "VARCHAR(100)"),
                ("cos_bucket", "VARCHAR(255)"),
                ("cos_path_prefix", "VARCHAR(255)"),
                ("cost_schema_generation", "INTEGER DEFAULT 1"),
                ("cost_image_rendering", "INTEGER DEFAULT 1"),
                ("cost_extraction", "INTEGER DEFAULT 1"),
                ("cost_translation", "INTEGER DEFAULT 1"),
                ("cost_super_resolution", "INTEGER DEFAULT 1"),
                ("cost_ppt_generation", "INTEGER DEFAULT 2"),
                ("initial_quota", "INTEGER DEFAULT 2"),
            ]:
                name, typ = col_def
                ensure_column('systemsettings', name, typ, ss_cols)
            
            # HelpGuide
            if not inspector.has_table('helpguide'):
                # SQLModel will create table if not exists usually via create_all
                # but if we are migrating...
                pass 
            
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
