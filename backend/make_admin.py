import os
from sqlmodel import Session, select
from models import User
from database import engine


def main() -> int:
    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == "admin")).first()
        if not user:
            print("User 'admin' not found")
            return 1
        if not user.is_admin:
            user.is_admin = True
            session.add(user)
            session.commit()
            session.refresh(user)
            print("User 'admin' set to admin")
        else:
            print("User 'admin' already admin")
    return 0


if __name__ == "__main__":
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    os.chdir(backend_dir)
    raise SystemExit(main())

