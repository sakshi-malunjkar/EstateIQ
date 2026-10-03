"""
Publishes the API to a Hugging Face Space (Docker SDK).

Why not just `git push` the repo to the Space: Hugging Face rejects pushes
that contain non-LFS binary files (this repo has website/src/assets/hero.png),
and the Space only needs ~550 KB of it anyway. So this copies just what the
Docker build needs into a staging folder and uploads that through the Hub API
(a normal commit on the Space).

Uploaded:  Dockerfile, README.md (carries the Space config), .dockerignore,
           requirements_api.txt, api/, app/
Never:     .env, client/, website/, dashboard/, data/, models_artifacts/
           (model weights are downloaded by the Space on first start)

Usage (token needs write access to the Space; see the deployment steps):
    python scripts/deploy_space.py --dry-run          # show what would be uploaded
    python scripts/deploy_space.py                    # upload to EstateIQ/estateiq-api
    python scripts/deploy_space.py --set-secrets      # also copy DATABASE_URL,
                                                      # SUPABASE_URL, SUPABASE_ANON_KEY,
                                                      # HF_REPO_ID from .env to the Space
Reads HF_TOKEN from the environment or .env.
"""

import argparse
import os
import shutil
import sys
import tempfile
from pathlib import Path

from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SPACE = "EstateIQ/estateiq-api"

FILES = ["Dockerfile", "README.md", ".dockerignore", "requirements_api.txt"]
DIRS = ["api", "app"]
SECRET_KEYS = ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY"]  # stored as private Space secrets
VARIABLE_KEYS = ["HF_REPO_ID"]  # not sensitive -> plain Space variable


def stage(dest: Path) -> list[str]:
    ignore = shutil.ignore_patterns("__pycache__", "*.pyc", "*.pyo", "*.db", ".env", ".env.*")
    for name in FILES:
        shutil.copy2(ROOT / name, dest / name)
    for name in DIRS:
        shutil.copytree(ROOT / name, dest / name, ignore=ignore)
    return sorted(str(p.relative_to(dest)).replace("\\", "/") for p in dest.rglob("*") if p.is_file())


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--space", default=DEFAULT_SPACE, help="owner/name of the Space")
    ap.add_argument("--dry-run", action="store_true", help="stage and list files, upload nothing")
    ap.add_argument("--set-secrets", action="store_true", help="copy settings from .env into Space secrets/variables")
    args = ap.parse_args()

    env = dotenv_values(ROOT / ".env")
    token = os.environ.get("HF_TOKEN") or env.get("HF_TOKEN")

    with tempfile.TemporaryDirectory() as tmp:
        staging = Path(tmp)
        files = stage(staging)
        total = sum((staging / f).stat().st_size for f in files)
        leaked = [f for f in files if f == ".env" or f.endswith(".env")]
        if leaked:
            print("Refusing to continue, secret-looking files staged:", leaked)
            return 1
        print(f"{len(files)} files, {total / 1024:.0f} KB staged for Space {args.space}")
        for f in files:
            print("  ", f)
        if args.dry_run:
            print("(dry run - nothing uploaded)")
            return 0

        if not token:
            print("No HF_TOKEN in the environment or .env")
            return 1

        from huggingface_hub import HfApi

        api = HfApi(token=token)
        # The Space is normally created in the web UI first; this only fills
        # in anything missing and is a no-op when it already exists.
        api.create_repo(args.space, repo_type="space", space_sdk="docker", exist_ok=True)

        if args.set_secrets:
            for key in SECRET_KEYS:
                value = env.get(key)
                if value:
                    api.add_space_secret(args.space, key, value)
                    print(f"secret set: {key}")
                else:
                    print(f"skipped (not in .env): {key}")
            for key in VARIABLE_KEYS:
                value = env.get(key)
                if value:
                    api.add_space_variable(args.space, key, value)
                    print(f"variable set: {key}")

        info = api.upload_folder(
            folder_path=str(staging),
            repo_id=args.space,
            repo_type="space",
            commit_message="Deploy EstateIQ API",
        )
        print("uploaded:", info)
        sub = args.space.replace("/", "-").replace("_", "-").lower()
        print(f"Space page: https://huggingface.co/spaces/{args.space}")
        print(f"API URL:    https://{sub}.hf.space   (health: /health)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
