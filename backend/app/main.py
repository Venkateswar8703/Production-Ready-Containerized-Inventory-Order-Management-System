import time
import logging
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from .database import engine, Base, get_db
from . import crud, schemas, models
from .config import settings

# Configure human-developer logging style
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("stockflow")

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Full-stack containerized Inventory & Order Management System API",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom request latency logging middleware
@app.middleware("http")
async def log_telemetry_and_time(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = (time.time() - start_time) * 1000  # in milliseconds
    
    # Format log message
    client_host = request.client.host if request.client else "unknown"
    log_msg = (
        f"[SYS-MONITOR] {request.method} {request.url.path} "
        f"| Client: {client_host} | Status: {response.status_code} "
        f"| Latency: {duration:.2f}ms"
    )
    logger.info(log_msg)
    
    response.headers["X-Process-Time"] = f"{duration:.2f}ms"
    return response


# Root Endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to the Inventory & Order Management API", "docs_url": "/docs"}


# --- PRODUCTS ENDPOINTS ---

@app.post("/products", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    try:
        logger.info(f"[DB-EVENT] Attempting to insert product SKU: {product.sku}")
        res = crud.create_product(db=db, product=product)
        logger.info(f"[DB-EVENT] Successfully created product '{res.name}' (ID: {res.id})")
        return res
    except ValueError as e:
        logger.warning(f"[VAL-ERROR] Product creation failed: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/products", response_model=List[schemas.ProductResponse])
def read_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_products(db, skip=skip, limit=limit)

@app.get("/products/{product_id}", response_model=schemas.ProductResponse)
def read_product(product_id: int, db: Session = Depends(get_db)):
    db_product = crud.get_product(db, product_id=product_id)
    if db_product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return db_product

@app.put("/products/{product_id}", response_model=schemas.ProductResponse)
def update_product(product_id: int, product_update: schemas.ProductUpdate, db: Session = Depends(get_db)):
    try:
        logger.info(f"[DB-EVENT] Attempting update on product ID: {product_id}")
        updated_product = crud.update_product(db=db, product_id=product_id, product_update=product_update)
        if updated_product is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        logger.info(f"[DB-EVENT] Product ID {product_id} updated successfully")
        return updated_product
    except ValueError as e:
        logger.warning(f"[VAL-ERROR] Product update failed: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.delete("/products/{product_id}", response_model=schemas.ProductResponse)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    try:
        logger.info(f"[DB-EVENT] Attempting deletion of product ID: {product_id}")
        deleted_product = crud.delete_product(db=db, product_id=product_id)
        if deleted_product is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        logger.info(f"[DB-EVENT] Product ID {product_id} deleted successfully")
        return deleted_product
    except ValueError as e:
        logger.warning(f"[VAL-ERROR] Product deletion failed: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# --- CUSTOMERS ENDPOINTS ---

@app.post("/customers", response_model=schemas.CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(get_db)):
    try:
        logger.info(f"[DB-EVENT] Registering customer email: {customer.email}")
        res = crud.create_customer(db=db, customer=customer)
        logger.info(f"[DB-EVENT] Registered customer '{res.name}' (ID: {res.id})")
        return res
    except ValueError as e:
        logger.warning(f"[VAL-ERROR] Customer registration failed: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/customers", response_model=List[schemas.CustomerResponse])
def read_customers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_customers(db, skip=skip, limit=limit)

@app.get("/customers/{customer_id}", response_model=schemas.CustomerResponse)
def read_customer(customer_id: int, db: Session = Depends(get_db)):
    db_customer = crud.get_customer(db, customer_id=customer_id)
    if db_customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return db_customer

@app.delete("/customers/{customer_id}", response_model=schemas.CustomerResponse)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    try:
        logger.info(f"[DB-EVENT] Attempting deletion of customer ID: {customer_id}")
        deleted_customer = crud.delete_customer(db=db, customer_id=customer_id)
        if deleted_customer is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
        logger.info(f"[DB-EVENT] Customer ID {customer_id} deleted successfully")
        return deleted_customer
    except ValueError as e:
        logger.warning(f"[VAL-ERROR] Customer deletion failed: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# --- ORDERS ENDPOINTS ---

@app.post("/orders", response_model=schemas.OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    try:
        logger.info(f"[DB-EVENT] Beginning order checkout transaction for Customer ID: {order.customer_id}")
        res = crud.create_order(db=db, order_create=order)
        logger.info(f"[DB-EVENT] Order transaction committed successfully (Order ID: {res.id}, Total: ${res.total_amount})")
        return res
    except ValueError as e:
        logger.warning(f"[VAL-ERROR] Order checkout aborted: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/orders", response_model=List[schemas.OrderResponse])
def read_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_orders(db, skip=skip, limit=limit)

@app.get("/orders/{order_id}", response_model=schemas.OrderResponse)
def read_order(order_id: int, db: Session = Depends(get_db)):
    db_order = crud.get_order(db, order_id=order_id)
    if db_order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return db_order

@app.delete("/orders/{order_id}", response_model=schemas.OrderResponse)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    try:
        logger.info(f"[DB-EVENT] Deleting order ID: {order_id}. Restoring items to inventory.")
        deleted_order = crud.delete_order(db=db, order_id=order_id)
        if deleted_order is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        logger.info(f"[DB-EVENT] Order ID {order_id} deleted and stock levels restored successfully")
        return deleted_order
    except Exception as e:
        logger.error(f"[DB-ERROR] Failed to delete order: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# --- DASHBOARD ENDPOINTS ---

@app.get("/dashboard/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    total_products = db.query(models.Product).count()
    total_customers = db.query(models.Customer).count()
    total_orders = db.query(models.Order).count()
    
    # Let's define low stock threshold as less than 10 units
    low_stock_threshold = 10
    low_stock_products = db.query(models.Product).filter(models.Product.quantity < low_stock_threshold).all()
    
    low_stock_list = [
        {
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "price": float(p.price),
            "quantity": p.quantity
        } for p in low_stock_products
    ]
    
    return {
        "total_products": total_products,
        "total_customers": total_customers,
        "total_orders": total_orders,
        "low_stock_products": len(low_stock_list),
        "low_stock_details": low_stock_list
    }
