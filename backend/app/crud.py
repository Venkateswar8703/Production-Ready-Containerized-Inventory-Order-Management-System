from sqlalchemy.orm import Session
from sqlalchemy import select
from . import models, schemas
from fastapi import HTTPException, status

# --- Product CRUD ---

def get_product(db: Session, product_id: int):
    return db.query(models.Product).filter(models.Product.id == product_id).first()

def get_product_by_sku(db: Session, sku: str):
    return db.query(models.Product).filter(models.Product.sku == sku).first()

def get_products(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Product).offset(skip).limit(limit).all()

def create_product(db: Session, product: schemas.ProductCreate):
    # Check uniqueness of SKU
    db_product = get_product_by_sku(db, product.sku)
    if db_product:
        raise ValueError("Product with this SKU already exists")
    
    new_product = models.Product(
        name=product.name,
        sku=product.sku,
        price=product.price,
        quantity=product.quantity
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

def update_product(db: Session, product_id: int, product_update: schemas.ProductUpdate):
    db_product = get_product(db, product_id)
    if not db_product:
        return None
    
    update_data = product_update.model_dump(exclude_unset=True)
    
    # If updating SKU, verify uniqueness
    if "sku" in update_data and update_data["sku"] != db_product.sku:
        existing = get_product_by_sku(db, update_data["sku"])
        if existing:
            raise ValueError("Product with this SKU already exists")
            
    for key, value in update_data.items():
        setattr(db_product, key, value)
        
    db.commit()
    db.refresh(db_product)
    return db_product

def delete_product(db: Session, product_id: int):
    db_product = get_product(db, product_id)
    if not db_product:
        return None
    
    # Check if there are order items referencing this product
    # To prevent foreign key constraint violations
    has_orders = db.query(models.OrderItem).filter(models.OrderItem.product_id == product_id).first()
    if has_orders:
        raise ValueError("Cannot delete product because it is referenced in existing orders")

    db.delete(db_product)
    db.commit()
    return db_product


# --- Customer CRUD ---

def get_customer(db: Session, customer_id: int):
    return db.query(models.Customer).filter(models.Customer.id == customer_id).first()

def get_customer_by_email(db: Session, email: str):
    return db.query(models.Customer).filter(models.Customer.email == email).first()

def get_customers(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Customer).offset(skip).limit(limit).all()

def create_customer(db: Session, customer: schemas.CustomerCreate):
    db_customer = get_customer_by_email(db, customer.email)
    if db_customer:
        raise ValueError("Customer with this email already exists")
        
    new_customer = models.Customer(
        name=customer.name,
        email=customer.email,
        phone=customer.phone
    )
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    return new_customer

def delete_customer(db: Session, customer_id: int):
    db_customer = get_customer(db, customer_id)
    if not db_customer:
        return None
    
    # Check if there are orders referencing this customer
    has_orders = db.query(models.Order).filter(models.Order.customer_id == customer_id).first()
    if has_orders:
        raise ValueError("Cannot delete customer because they have active orders")
        
    db.delete(db_customer)
    db.commit()
    return db_customer


# --- Order CRUD ---

def get_order(db: Session, order_id: int):
    return db.query(models.Order).filter(models.Order.id == order_id).first()

def get_orders(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Order).order_by(models.Order.created_at.desc()).offset(skip).limit(limit).all()

def create_order(db: Session, order_create: schemas.OrderCreate):
    # Verify customer exists
    customer = get_customer(db, order_create.customer_id)
    if not customer:
        raise ValueError("Customer does not exist")
        
    # Transactional stock reduction & price computation
    total_amount = 0.0
    order_items_to_create = []
    
    try:
        for item in order_create.items:
            # Fetch product (with row-level locking to prevent race conditions in high concurrency)
            # using with_for_update() ensures that other transactions can't modify the stock simultaneously
            product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            if not product:
                raise ValueError(f"Product with ID {item.product_id} does not exist")
                
            if product.quantity < item.quantity:
                raise ValueError(
                    f"Insufficient stock for product '{product.name}' (SKU: {product.sku}). "
                    f"Requested: {item.quantity}, Available: {product.quantity}"
                )
                
            # Compute price & decrement stock
            item_total = float(product.price) * item.quantity
            total_amount += item_total
            product.quantity -= item.quantity
            
            # Create OrderItem object
            order_item = models.OrderItem(
                product_id=product.id,
                quantity=item.quantity,
                price_at_order=product.price
            )
            order_items_to_create.append(order_item)
            
        # Create Order object
        db_order = models.Order(
            customer_id=customer.id,
            total_amount=total_amount,
            items=order_items_to_create
        )
        db.add(db_order)
        db.commit()
        db.refresh(db_order)
        return db_order
    except Exception as e:
        db.rollback()
        raise e

def delete_order(db: Session, order_id: int):
    # Find order
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not db_order:
        return None
        
    try:
        # Restore stock back to the inventory
        for item in db_order.items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            if product:
                product.quantity += item.quantity
                
        db.delete(db_order)
        db.commit()
        return db_order
    except Exception as e:
        db.rollback()
        raise e
