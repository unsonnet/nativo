"""
Data models for K9 API

EXACTLY matching the React app types from:
- src/types/report.ts
- src/lib/auth/types.ts
- src/lib/api/reportsApi.ts
- src/lib/api/userApi.ts
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict


class BaseEntity(BaseModel):
    """Base class with common configuration"""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )


# Exact match for React types
class Embedding(BaseEntity):
    """Embedding type from src/types/report.ts"""

    vector: List[float]
    similarity: Optional[float] = None  # Percent similarity when used in search results


class MiniEmbedding(BaseEntity):
    """MiniEmbedding type from src/types/report.ts"""

    vector: List[float] = Field(..., min_length=2, max_length=2)  # [number, number]
    similarity: Optional[float] = None


class Dimensional(BaseEntity):
    """Dimensional<T> type from src/types/report.ts"""

    val: float
    unit: str


class ProductImageSelection(BaseEntity):
    """Product image selection from src/types/report.ts"""

    shape: Dict[str, float]  # { width: number; height: number }
    position: Dict[str, float]  # { x: number; y: number }
    scale: float
    rotation: Dict[str, float]  # { x: number; y: number; z: number; w: number }


class ProductImage(BaseEntity):
    """ProductImage type from src/types/report.ts"""

    id: str
    url: str
    mask: Optional[str] = None
    selection: Optional[ProductImageSelection] = None


class ProductCategory(BaseEntity):
    """Product category from src/types/report.ts"""

    type: Optional[str] = None
    material: Optional[str] = None
    look: Optional[str] = None
    texture: Optional[str] = None
    finish: Optional[str] = None
    edge: Optional[str] = None


class ProductVendor(BaseEntity):
    """Product vendor from src/types/report.ts"""

    sku: str
    store: str
    name: str
    price: Optional[Dimensional] = None
    discontinued: Optional[bool] = None
    url: str


class ProductFormat(BaseEntity):
    """Product format from src/types/report.ts"""

    length: Optional[Dimensional] = None
    width: Optional[Dimensional] = None
    thickness: Optional[Dimensional] = None
    vendors: List[ProductVendor]


class ProductAnalysis(BaseEntity):
    """Product analysis from src/types/report.ts"""

    color: Dict[str, Embedding]  # { primary: Embedding; secondary: Embedding }
    pattern: Dict[str, Embedding]  # { primary: Embedding; secondary: Embedding }
    similarity: float


class Product(BaseEntity):
    """EXACT Product type from src/types/report.ts"""

    id: str
    brand: str
    series: Optional[str] = None
    model: str
    images: List[ProductImage]
    category: ProductCategory
    formats: List[ProductFormat]
    analysis: Optional[ProductAnalysis] = None


class ProductIndexAnalysis(BaseEntity):
    """ProductIndex analysis from src/types/report.ts"""

    color: Dict[
        str, MiniEmbedding
    ]  # { primary: MiniEmbedding; secondary: MiniEmbedding }
    pattern: Dict[
        str, MiniEmbedding
    ]  # { primary: MiniEmbedding; secondary: MiniEmbedding }
    similarity: float


class ProductIndex(BaseEntity):
    """EXACT ProductIndex type from src/types/report.ts"""

    id: str
    brand: str
    series: Optional[str] = None
    model: str
    image: str
    analysis: Optional[ProductIndexAnalysis] = None


class Report(BaseEntity):
    """EXACT Report<T> type from src/types/report.ts"""

    id: str
    title: str
    author: str
    date: str  # ISO string
    reference: Union[Product, ProductIndex, ProductImage]  # Can be any of these
    favorites: Optional[List[str]] = None  # Array of favorited ProductIndex IDs


class ReportPreview(BaseEntity):
    """EXACT ReportPreview type from src/types/report.ts"""

    id: str
    title: str
    author: str
    date: str
    reference: ProductImage  # Dashboard-friendly report with ProductImage for previews
    favorites: Optional[List[str]] = None


# API Request/Response Models (from reportsApi.ts)


class CreateReportRequest(BaseEntity):
    """From src/lib/api/reportsApi.ts"""

    title: str
    reference: Product


class CreateReportResponse(BaseEntity):
    """From src/lib/api/reportsApi.ts"""

    id: str
    title: str
    author: str
    date: str


class ListReportsResponse(BaseEntity):
    """From src/lib/api/reportsApi.ts"""

    reports: List[Report]  # Report<ProductIndex>[]
    total: int
    page: int
    limit: int


class SearchFilters(BaseEntity):
    """EXACT SearchFilters from src/lib/api/reportsApi.ts"""

    category: Optional[ProductCategory] = None
    brand: Optional[str] = None
    priceRange: Optional[Dict[str, float]] = None  # { min?: number; max?: number }
    similarity: Optional[Dict[str, float]] = None  # { threshold?: number }


class SearchProductsRequest(BaseEntity):
    """From src/lib/api/reportsApi.ts"""

    filters: SearchFilters
    page: Optional[int] = None
    limit: Optional[int] = None


class SearchProductsResponse(BaseEntity):
    """From src/lib/api/reportsApi.ts"""

    products: List[ProductIndex]
    total: int
    page: int
    limit: int


# User Models (from auth/types.ts and userApi.ts)


class User(BaseEntity):
    """EXACT User type from src/lib/auth/types.ts"""

    id: str
    name: str
    email: Optional[str] = None
    avatarUrl: Optional[str] = None


class UserPreferences(BaseEntity):
    """From src/lib/api/userApi.ts"""

    defaultReportTitle: Optional[str] = None
    autoSaveFavorites: Optional[bool] = None
    exportFormat: Optional[str] = None  # 'zip' | 'pdf' | 'excel'


class UserProfile(User):
    """EXACT UserProfile from src/lib/api/userApi.ts"""

    createdAt: str
    updatedAt: str
    preferences: Optional[UserPreferences] = None


class UpdateProfileRequest(BaseEntity):
    """From src/lib/api/userApi.ts"""

    name: Optional[str] = None
    email: Optional[str] = None
    avatarUrl: Optional[str] = None
    preferences: Optional[UserPreferences] = None


# Standard API Response Wrapper


class K9Response(BaseEntity):
    """EXACT K9Response<T> type from src/lib/auth/types.ts"""

    status: int
    body: Any  # Generic T
    error: Optional[str] = None


# Database Models (for DuckDB storage)


class DBUser(BaseEntity):
    """User model for DuckDB storage"""

    user_id: str = Field(..., description="Cognito user ID")
    name: str
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DBReport(BaseEntity):
    """Report model for DuckDB storage"""

    id: str
    title: str
    author: str
    date: str
    user_id: str = Field(..., description="Owner user ID")
    reference: Dict[str, Any] = Field(
        ..., description="JSON serialized reference product"
    )
    favorites: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DBProductEmbedding(BaseEntity):
    """Product embedding storage for DuckDB"""

    product_id: str
    embedding_vector: List[float]
    model_version: str
    vector_dimension: int
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SimilarityMatrix(BaseEntity):
    """Similarity matrix metadata for S3 storage"""

    reference_product_id: str
    computed_at: datetime
    similarity_count: int
    model_version: str
    s3_key: str
