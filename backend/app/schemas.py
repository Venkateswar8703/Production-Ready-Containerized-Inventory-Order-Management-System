from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import List, Optional
import datetime
import re

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, description="Product Name")
    sku: str = Field(..., min_length=1, description="Unique SKU code")
    price: float = Field(..., ge=0.0, description="Product Price")
    quantity: int = Field(..., ge=0, description="Quantity in stock")

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    sku: Optional[str] = Field(None, min_length=1)
    price: Optional[float] = Field(None, ge=0.0)
    quantity: Optional[int] = Field(None, ge=0)

class ProductResponse(ProductBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1, description="Full Name")
    email: str = Field(..., description="Email address")
    phone: str = Field(..., min_length=1, description="Phone number")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
        if not re.match(email_regex, v):
            raise ValueError("Invalid email format")
        return v

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0, description="Quantity ordered")

class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    price_at_order: float
    product: ProductResponse

    model_config = ConfigDict(from_attributes=True)

class OrderCreate(BaseModel):
    customer_id: int
    items: List[OrderItemCreate] = Field(..., min_length=1, description="List of ordered items")

class OrderResponse(BaseModel):
    id: int
    customer_id: int
    total_amount: float
    created_at: datetime.datetime
    customer: CustomerResponse
    items: List[OrderItemResponse]

    model_config = ConfigDict(from_attributes=True)
