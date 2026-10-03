"""
Fetches the trained model artifacts from a private Hugging Face repo when
they aren't on disk.

The model weights (~2 GB) are far too large for git/GitHub, so they live
in a private Hugging Face model repo laid out exactly like
models_artifacts/:

    muril_ner/  sentiment/  intent/  lead_scoring/

On startup api/main.py calls download_models(); any model folder whose
key file is already present is left alone, so local development (where
models_artifacts/ is populated) never touches the network.

Environment:
    HF_REPO_ID  model repo to download from (default: EstateIQ/estateiq-models)
    HF_TOKEN    optional while the repo is public; required if it is made
                private again (read access is enough)

Can also be run on its own, e.g. as a build step so the first start is
fast:
    python -m api.download_models
"""

import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("estateiq.api.download_models")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = PROJECT_ROOT / "models_artifacts"

DEFAULT_REPO_ID = "EstateIQ/estateiq-models"

# folder -> the file whose presence means the folder is complete
REQUIRED_MODELS = {
    "muril_ner": "model.safetensors",
    "sentiment": "model.safetensors",
    "intent": "model.safetensors",
    "lead_scoring": "model.json",
}


def missing_models() -> list[str]:
    return [name for name, key_file in REQUIRED_MODELS.items() if not (MODELS_DIR / name / key_file).is_file()]


def download_models() -> None:
    """Downloads any missing model folder from Hugging Face. Returns
    immediately if everything is already on disk. Raises RuntimeError
    with an actionable message if models are missing and can't be fetched."""
    missing = missing_models()
    if not missing:
        logger.info("All model artifacts already present in %s.", MODELS_DIR)
        return

    token = os.environ.get("HF_TOKEN") or None  # a public repo needs no token
    repo_id = os.environ.get("HF_REPO_ID") or DEFAULT_REPO_ID

    # Imported here so a machine that already has the models never needs the package.
    from huggingface_hub import snapshot_download

    logger.info("Downloading %s from Hugging Face repo %s ...", ", ".join(missing), repo_id)
    try:
        snapshot_download(
            repo_id=repo_id,
            repo_type="model",
            token=token,
            local_dir=str(MODELS_DIR),
            allow_patterns=[f"{name}/*" for name in missing],
        )
    except Exception as exc:
        raise RuntimeError(f"Could not download models from Hugging Face repo {repo_id}: {exc}") from exc

    still_missing = missing_models()
    if still_missing:
        raise RuntimeError(f"Download finished but these model folders are still incomplete: {', '.join(still_missing)}")
    logger.info("Model download complete.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    try:
        download_models()
    except RuntimeError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
