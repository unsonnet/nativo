from typing import Any, List, Optional, Dict, Union
from pydantic import Field

from .base import BaseSchema, BaseEntity, Quantity


class Product(BaseEntity):
    """Response Product model for REST API"""

    class Category(BaseSchema):
        type: Optional[str] = None
        material: Optional[str] = None
        look: Optional[str] = None
        texture: Optional[str] = None
        finish: Optional[str] = None
        edge: Optional[str] = None

    class Format(BaseSchema):
        class Vendor(BaseSchema):
            sku: str
            store: str
            name: str
            price: Optional[Quantity] = None
            discontinued: Optional[bool] = None
            url: str

        length: Optional[Quantity] = None
        width: Optional[Quantity] = None
        thickness: Optional[Quantity] = None
        vendors: Optional[List[Vendor]] = Field(None, min_length=1)

    class Analysis(BaseSchema):
        class Embedding(BaseSchema):
            vector: List[float] = Field(..., min_length=1)
            similarity: float

        color: Dict[str, Embedding] = Field(..., min_length=1)
        pattern: Dict[str, Embedding] = Field(..., min_length=1)
        similarity: float

    brand: Optional[str] = None
    series: Optional[str] = None
    model: str
    images: List[str] = Field(..., min_length=1)
    category: Optional[Category] = None
    formats: Optional[List[Format]] = Field(None, min_length=1)
    analysis: Optional[Analysis] = None


class Report(BaseEntity):
    """Response Report model for REST API"""

    title: str
    author: str
    reference: Union[Product, str]
    favorites: Optional[List[str]] = Field(None, min_length=1)


class User(BaseEntity):
    """Response User model for REST API"""

    name: str
    email: Optional[str] = None
    avatar: Optional[str] = None
    preferences: Dict[str, Any]


class ReportList(BaseSchema):
    """Response Report List model for REST API"""

    reports: List[Report]
    total: int
    limit: int
    next_cursor: Optional[str] = None
    has_more: bool


# TODO: Check if there are other response models that need to be implemented
