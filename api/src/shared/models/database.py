from typing import Any, List, Optional, Dict, Union
from pydantic import Field

from src.shared.utils import current_timestamp
from .base import BaseSchema, BaseEntity, Quantity
from . import response


class Image(BaseEntity):
    """Database Image model for DynamoDB storage"""

    class Affine(BaseSchema):
        shape: Dict[str, float]  # { width: number; height: number }
        position: Dict[str, float]  # { x: number; y: number; z: number }
        rotation: Dict[str, float]  # { x: number; y: number; z: number; w: number }

    image: str
    mask: Optional[str] = None
    grid: Optional[Affine] = None
    product: str
    created_at: str = Field(default_factory=current_timestamp)
    updated_at: Optional[str] = None

    def to_api(self) -> str:
        return self.image


class Product(BaseEntity):
    """Database Product model for DynamoDB storage"""

    class Category(BaseSchema):
        type: Optional[str] = None
        material: Optional[str] = None
        look: Optional[str] = None
        texture: Optional[str] = None
        finish: Optional[str] = None
        edge: Optional[str] = None

        def to_api(self) -> response.Product.Category:
            return response.Product.Category(
                type=self.type,
                material=self.material,
                look=self.look,
                texture=self.texture,
                finish=self.finish,
                edge=self.edge,
            )

    class Format(BaseSchema):
        class Vendor(BaseSchema):
            sku: str
            store: str
            name: str
            price: Optional[Quantity] = None
            discontinued: Optional[bool] = None
            url: str

            def to_api(self) -> response.Product.Format.Vendor:
                return response.Product.Format.Vendor(
                    sku=self.sku,
                    store=self.store,
                    name=self.name,
                    price=self.price,
                    discontinued=self.discontinued,
                    url=self.url,
                )

        length: Optional[Quantity] = None
        width: Optional[Quantity] = None
        thickness: Optional[Quantity] = None
        vendors: Optional[List[Vendor]] = Field(default_factory=list, min_length=1)

        def to_api(self) -> response.Product.Format:
            return response.Product.Format(
                length=self.length,
                width=self.width,
                thickness=self.thickness,
                vendors=(
                    [vendor.to_api() for vendor in self.vendors]
                    if self.vendors is not None
                    else None
                ),
            )

    brand: Optional[str] = None
    series: Optional[str] = None
    model: str = Field(default_factory=str)
    images: Optional[List[str]] = Field(None, min_length=1)
    category: Optional[Category] = Field(default_factory=Category)
    formats: Optional[List[Format]] = Field(
        default_factory=lambda: [Product.Format()], min_length=1
    )
    created_at: str = Field(default_factory=current_timestamp)
    updated_at: Optional[str] = None

    def to_api(self, basic: bool = False) -> Union[response.Product, str]:
        """Format database.Product into REST API response"""
        from src.shared.database import repository

        images = [repository.Image.read(img, self.id) for img in self.images]
        if any(img is None for img in images):
            raise LookupError(f"Images for product {self.id} not found")
        images = [img.to_api() for img in images if img is not None]

        if basic:
            return images[0]
        return response.Product(
            id=self.id,
            brand=self.brand,
            series=self.series,
            model=self.model,
            images=images,
            category=self.category.to_api() if self.category is not None else None,
            formats=(
                [format.to_api() for format in self.formats]
                if self.formats is not None
                else None
            ),
        )


class Report(BaseEntity):
    """Database Report model for DynamoDB storage"""

    title: str = Field(default_factory=str)
    author: str
    reference: str = Field(default_factory=str)
    favorites: Optional[List[str]] = Field(None, min_length=1)
    created_at: str = Field(default_factory=current_timestamp)
    updated_at: Optional[str] = None

    def to_api(self, basic: bool = False) -> response.Report:
        """Format database.Report into REST API response"""
        from src.shared.database import repository

        reference = repository.Product.read(self.reference)
        if reference is None:
            raise LookupError(f"Reference {self.reference} not found")

        return response.Report(
            id=self.id,
            title=self.title,
            author=self.author,
            reference=reference.to_api(basic),
            favorites=self.favorites,
        )


class User(BaseEntity):
    """Database User model for DynamoDB storage"""

    name: str = Field(default_factory=str)
    email: Optional[str] = None
    avatar: Optional[str] = None
    preferences: Dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=current_timestamp)
    updated_at: Optional[str] = None

    def to_api(self) -> response.User:
        """Format database.User into REST API response"""
        return response.User(
            id=self.id,
            name=self.name,
            email=self.email,
            avatar=self.avatar,
            preferences=self.preferences,
        )
