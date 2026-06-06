import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pydantic import ValidationError

# Add app directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import models, schemas, crud
from app.database import Base

# Setup in-memory SQLite database for test runs
engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def setup_db():
    Base.metadata.create_all(bind=engine)

def teardown_db():
    Base.metadata.drop_all(bind=engine)

def test_sku_uniqueness():
    db = TestingSessionLocal()
    try:
        # Create first product
        p1 = schemas.ProductCreate(name="Widget A", sku="WDG-001", price=19.99, quantity=50)
        crud.create_product(db, p1)
        
        # Try to create second product with duplicate SKU
        p2 = schemas.ProductCreate(name="Widget B", sku="WDG-001", price=29.99, quantity=100)
        try:
            crud.create_product(db, p2)
            assert False, "SKU uniqueness constraint violated but no exception was raised!"
        except ValueError as e:
            assert "already exists" in str(e), f"Expected 'already exists' error, got: {e}"
            print("[OK] SKU uniqueness validation verified successfully.")
    finally:
        db.close()

def test_email_uniqueness():
    db = TestingSessionLocal()
    try:
        # Create first customer
        c1 = schemas.CustomerCreate(name="Alice Smith", email="alice@example.com", phone="123456789")
        crud.create_customer(db, c1)
        
        # Try to create second customer with duplicate email
        c2 = schemas.CustomerCreate(name="Bob Jones", email="alice@example.com", phone="987654321")
        try:
            crud.create_customer(db, c2)
            assert False, "Email uniqueness constraint violated but no exception was raised!"
        except ValueError as e:
            assert "already exists" in str(e), f"Expected 'already exists' error, got: {e}"
            print("[OK] Customer email uniqueness validation verified successfully.")
    finally:
        db.close()

def test_pydantic_validations():
    # Test negative price
    try:
        schemas.ProductCreate(name="Negative Price", sku="NEG-001", price=-5.0, quantity=10)
        assert False, "Pydantic allowed negative price!"
    except ValidationError as e:
        print("[OK] Pydantic blocked negative product price correctly.")

    # Test negative quantity
    try:
        schemas.ProductCreate(name="Negative Qty", sku="NEG-002", price=5.0, quantity=-10)
        assert False, "Pydantic allowed negative stock quantity!"
    except ValidationError as e:
        print("[OK] Pydantic blocked negative product quantity correctly.")

    # Test invalid email format
    try:
        schemas.CustomerCreate(name="Invalid Email", email="bademailaddress", phone="123456")
        assert False, "Pydantic allowed invalid email format!"
    except ValidationError as e:
        print("[OK] Pydantic blocked invalid email format correctly.")

def test_order_creation_and_stock_deduction():
    db = TestingSessionLocal()
    try:
        # Register product
        p_data = schemas.ProductCreate(name="Laptop", sku="LAP-001", price=999.99, quantity=10)
        product = crud.create_product(db, p_data)
        
        # Register customer
        c_data = schemas.CustomerCreate(name="Charlie Brown", email="charlie@example.com", phone="555-555")
        customer = crud.create_customer(db, c_data)
        
        # Create valid order
        order_items = [schemas.OrderItemCreate(product_id=product.id, quantity=3)]
        order_data = schemas.OrderCreate(customer_id=customer.id, items=order_items)
        
        order = crud.create_order(db, order_data)
        
        # Verify automatic calculation of total amount
        expected_total = 999.99 * 3
        assert abs(float(order.total_amount) - expected_total) < 0.01, f"Expected total: {expected_total}, got: {order.total_amount}"
        print(f"[OK] Order total calculation verified: ${order.total_amount}")
        
        # Verify stock decrement
        updated_product = crud.get_product(db, product.id)
        assert updated_product.quantity == 7, f"Expected quantity to be 7, got: {updated_product.quantity}"
        print("[OK] Inventory quantity reduced correctly after order placement.")
        
        return order.id, product.id
    finally:
        db.close()

def test_insufficient_stock_rejection(product_id, customer_id):
    db = TestingSessionLocal()
    try:
        # Try ordering more than available stock (current stock should be 7)
        order_items = [schemas.OrderItemCreate(product_id=product_id, quantity=10)]
        order_data = schemas.OrderCreate(customer_id=customer_id, items=order_items)
        
        try:
            crud.create_order(db, order_data)
            assert False, "Order was created despite insufficient stock!"
        except ValueError as e:
            assert "Insufficient stock" in str(e), f"Expected 'Insufficient stock' error, got: {e}"
            print("[OK] Order placement rejected correctly due to insufficient stock.")
            
        # Verify stock remains unchanged (7)
        p = crud.get_product(db, product_id)
        assert p.quantity == 7, f"Expected stock to remain 7, got: {p.quantity}"
        print("[OK] Inventory quantity remained untouched on rollback.")
    finally:
        db.close()

def test_order_cancellation_restores_stock(order_id, product_id):
    db = TestingSessionLocal()
    try:
        # Cancel order
        crud.delete_order(db, order_id)
        print("[OK] Order cancellation successfully completed.")
        
        # Verify stock restored to original 10
        p = crud.get_product(db, product_id)
        assert p.quantity == 10, f"Expected stock restored to 10, got: {p.quantity}"
        print("[OK] Inventory quantity correctly restored to database on cancellation.")
    finally:
        db.close()

if __name__ == "__main__":
    print("Initializing Integration Constraints Tests...")
    setup_db()
    try:
        test_sku_uniqueness()
        test_email_uniqueness()
        test_pydantic_validations()
        order_id, product_id = test_order_creation_and_stock_deduction()
        
        # We need customer id which we created in previous test, charlie's id is 1
        test_insufficient_stock_rejection(product_id=product_id, customer_id=1)
        test_order_cancellation_restores_stock(order_id=order_id, product_id=product_id)
        
        print("\nAll integration test assertions passed successfully! [SUCCESS]")
    finally:
        teardown_db()
