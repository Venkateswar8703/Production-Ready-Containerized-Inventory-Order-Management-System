# StockFlow - Inventory & Order Management System

StockFlow is a production-ready, full-stack, fully containerized Inventory & Order Management System. It allows businesses to register and manage products, customers, and order placement with automatic inventory stock deductions, transactional guarantees, and live dashboard statistics.

## Tech Stack
- **Backend API**: Python 3.10 + FastAPI
- **Frontend SPA**: React (JavaScript) + Vite + Vanilla CSS (Glassmorphism design)
- **Database**: PostgreSQL 15 (ORM: SQLAlchemy 2.0)
- **Containerization**: Docker & Docker Compose
- **Local Testing**: SQLite (in-memory) for validation checks

---

## Directory Structure
```
inventory-order-system/
├── backend/
│   ├── app/
│   │   ├── config.py         # Config & env validation
│   │   ├── database.py       # DB connection lifecycle
│   │   ├── models.py         # SQLAlchemy tables definition
│   │   ├── schemas.py        # Pydantic serialization schemas
│   │   ├── crud.py           # DB CRUD actions & transaction logic
│   │   └── main.py           # API routing & endpoints
│   ├── Dockerfile
│   ├── requirements.txt
│   └── test_integration.py   # Integration constraint test suite
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main React component
│   │   ├── main.jsx          # React mounting
│   │   └── index.css         # Theme stylesheet
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── DEPLOYMENT.md             # Cloud deployment instructions
├── docker-compose.yml        # Services orchestration
├── .env.example              # Env configuration template
└── README.md                 # Project README
```

---

## Features & Business Rules
1. **Product SKU Uniqueness**: Prevent registration of products sharing duplicate SKU/code identifiers.
2. **Customer Email Uniqueness**: Enforces unique email formatting and addresses.
3. **Inventory Non-Negativity**: Product quantities and prices are validated as non-negative at both the database level (Check Constraints) and API level (Pydantic validations).
4. **Transactional Stock Deductions**: During order creation:
   - Evaluates availability of all items requested.
   - Rejects the entire order (all items) with an HTTP 400 Bad Request if any item is out-of-stock.
   - Automatically decrements stock levels of selected products.
   - Auto-computes grand totals.
5. **Stock Restoration**: Cancelling/deleting an order automatically restores all items back to the product stock inventory.

---

## Getting Started

### Local Docker Compose Build
To compile and spin up the entire multi-container service locally, run:
```bash
docker compose up --build
```
- Access the frontend dashboard at: `http://localhost`
- Access Swagger API documentation at: `http://localhost:8000/docs`

### Developer Testing
To run the automated validation tests checking business rule constraints:
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Set up virtual environment and install packages:
   ```bash
   python -m venv venv
   # On Windows PowerShell:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   
   pip install -r requirements.txt
   ```
3. Execute the integration test script:
   ```bash
   python test_integration.py
   ```
