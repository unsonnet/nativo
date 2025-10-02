from pydantic import BaseModel, Field, ConfigDict
from ..utils import generate_id


class BaseSchema(BaseModel):
    """Base schema class with common configuration"""

    model_config = ConfigDict(
        str_strip_whitespace=True, validate_assignment=True, extra="forbid"
    )


class BaseEntity(BaseSchema):
    """Base entity class with id generator"""

    id: str = Field(default_factory=generate_id)


class Quantity(BaseSchema):
    """Quantity type"""

    val: float
    unit: str
