from fastapi import HTTPException, status


class NotFoundException(HTTPException):
    """Raised when a requested resource is not found (404)."""
    def __init__(self, detail: str = "Resource not found."):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ForbiddenException(HTTPException):
    """Raised when a user lacks permission to access a resource (403)."""
    def __init__(self, detail: str = "You do not have permission to perform this action."):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class UnauthorizedException(HTTPException):
    """Raised when authentication credentials are missing or invalid (401)."""
    def __init__(self, detail: str = "Could not validate credentials."):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class ConflictException(HTTPException):
    """Raised when a resource already exists or state conflict occurs (409)."""
    def __init__(self, detail: str = "Resource already exists."):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)


class BadRequestException(HTTPException):
    """Raised for invalid input or business rule violations (400)."""
    def __init__(self, detail: str = "Bad request."):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class UnprocessableException(HTTPException):
    """Raised when an action cannot be performed due to current state (422)."""
    def __init__(self, detail: str = "Cannot process request in current state."):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)
