# Ansa Enterprise ERP & Finance 💼

Ansa Enterprise ERP & Finance is a comprehensive, full-stack management system tailored for tracking and managing projects, financial records, inventory, fixed assets, human resources, and equipment.

## ✨ Features
- **📊 Executive Dashboard**: High-level metrics, cash positions, net profit, and year-to-date tracking.
- **💰 Finance & Accounting**: Comprehensive general ledger, AP/AR invoicing, journal entries, and consolidated project financial reports.
- **🏗️ Project Management**: Contract value tracking, RAB (budget vs actuals), timeline monitoring, and project dashboards.
- **📦 Inventory & Assets**: Stock balances, warehouse tracking, fixed asset depreciation, and equipment dispatching.
- **👥 Human Resources**: Employee directory, crew management, and organizational setup.
- **⚙️ Master Data**: End-to-end management for vendors, customers, COA (Chart of Accounts), taxes, currencies, and branches.

## 🛠️ Technology Stack
### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS + Lucide Icons
- **State Management**: Zustand
- **Routing**: React Router DOM
- **Charts**: Recharts
- **PDF Generation**: jsPDF + autoTable

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite (SQLAlchemy ORM)
- **Routing**: Modular APIRouter
- **Features**: RESTful API endpoints for all modules (finance, projects, inventory, HR)

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Python (v3.8 or higher)

### Installation & Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/syababamin5-lab/ansa-finance-project.git
   cd ansa-finance-project
   ```

2. **Run Backend (FastAPI):**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```

3. **Run Frontend (Vite):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the Application:**
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend API Docs (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)

## 🔒 Security & Privacy
The primary production database (`ansa_erp.db`) and user uploads are ignored by default via `.gitignore` to protect sensitive company data.

## 📄 License
All rights reserved. PT Ansa.
