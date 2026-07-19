"""API package.

Routes are imported explicitly by ``backend.main`` to avoid circular imports when
services import request/response schemas.
"""

__all__ = ['router']
