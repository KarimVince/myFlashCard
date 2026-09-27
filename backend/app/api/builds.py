from fastapi import APIRouter

from app.storage import list_builds

router = APIRouter(prefix="/builds", tags=["builds"])


@router.get("")
def get_builds():
    """Public list of available app builds in R2 downloads/."""
    return list_builds()
