from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel as PydanticBaseModel

from db.database import get_db
from db.models import (
    ChartOfAccount, TaxCode, Currency, Bank,
    JournalLine, Expense, FixedAsset, Customer, Vendor
)
from schemas.financials import (
    COACreate, COAUpdate, COAResponse,
    TaxCodeCreate, TaxCodeUpdate, TaxCodeResponse,
    CurrencyCreate, CurrencyUpdate, CurrencyResponse,
    BankCreate, BankUpdate, BankResponse
)

router = APIRouter()

class RelinkRequest(PydanticBaseModel):
    target_account_id: str
    delete_source: Optional[bool] = False

def create_crud(router: APIRouter, model, create_schema, update_schema, response_schema, prefix: str):
    @router.post(prefix, response_model=response_schema, status_code=status.HTTP_201_CREATED)
    def create_item(item: create_schema, db: Session = Depends(get_db)):
        new_item = model(**item.model_dump())
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        return new_item

    @router.get(prefix, response_model=List[response_schema])
    def read_items(skip: int = 0, limit: int = 1000, db: Session = Depends(get_db)):
        query = db.query(model)
        if hasattr(model, 'account_code'):
            query = query.order_by(model.account_code.asc())
        elif hasattr(model, 'code'):
            query = query.order_by(model.code.asc())
        return query.offset(skip).limit(limit).all()

    @router.get(f"{prefix}/{{item_id}}", response_model=response_schema)
    def read_item(item_id: str, db: Session = Depends(get_db)):
        item = db.query(model).filter(model.id == item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        return item

    @router.put(f"{prefix}/{{item_id}}", response_model=response_schema)
    def update_item(item_id: str, item_update: update_schema, db: Session = Depends(get_db)):
        db_item = db.query(model).filter(model.id == item_id).first()
        if not db_item:
            raise HTTPException(status_code=404, detail="Item not found")
        for key, value in item_update.model_dump(exclude_unset=True).items():
            setattr(db_item, key, value)
        db.commit()
        db.refresh(db_item)
        return db_item

    @router.delete(f"{prefix}/{{item_id}}")
    def delete_item(item_id: str, db: Session = Depends(get_db)):
        db_item = db.query(model).filter(model.id == item_id).first()
        if not db_item:
            raise HTTPException(status_code=404, detail="Item not found")
            
        # Enterprise Safety Guard specifically for ChartOfAccount
        if model == ChartOfAccount:
            journal_count = db.query(JournalLine).filter(JournalLine.account_id == item_id).count()
            expense_count = db.query(Expense).filter(
                (Expense.expense_account_id == item_id) | 
                (Expense.payment_account_id == item_id) | 
                (Expense.admin_fee_account_id == item_id)
            ).count()
            asset_count = db.query(FixedAsset).filter(
                (FixedAsset.asset_account_id == item_id) | 
                (FixedAsset.accumulated_depreciation_account_id == item_id) | 
                (FixedAsset.depreciation_expense_account_id == item_id)
            ).count()
            total_usage = journal_count + expense_count + asset_count
            
            if total_usage > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Akun [{db_item.account_code} - {db_item.account_name}] TIDAK DAPAT DIHAPUS karena memiliki "
                        f"{total_usage} riwayat transaksi aktif ({journal_count} baris jurnal, {expense_count} pengeluaran). "
                        "Gunakan opsi Nonaktifkan Akun (Soft Deactivate) atau Pindahkan Transaksi (Re-Link) ke akun lain terlebih dahulu."
                    )
                )

        db.delete(db_item)
        db.commit()
        return {"ok": True}

# Register generic routes
create_crud(router, ChartOfAccount, COACreate, COAUpdate, COAResponse, "/coas")
create_crud(router, TaxCode, TaxCodeCreate, TaxCodeUpdate, TaxCodeResponse, "/taxes")
create_crud(router, Currency, CurrencyCreate, CurrencyUpdate, CurrencyResponse, "/currencies")
create_crud(router, Bank, BankCreate, BankUpdate, BankResponse, "/banks")


# =========================================================================
# ADVANCED COA SAFETY & RE-LINK ENDPOINTS
# =========================================================================

@router.get("/coas/{account_id}/usage")
def get_coa_usage(account_id: str, db: Session = Depends(get_db)):
    """Cek jumlah transaksi yang terhubung ke akun ini."""
    coa = db.query(ChartOfAccount).filter(ChartOfAccount.id == account_id).first()
    if not coa:
        raise HTTPException(status_code=404, detail="Akun COA tidak ditemukan")

    journal_count = db.query(JournalLine).filter(JournalLine.account_id == account_id).count()
    expense_count = db.query(Expense).filter(
        (Expense.expense_account_id == account_id) | 
        (Expense.payment_account_id == account_id) | 
        (Expense.admin_fee_account_id == account_id)
    ).count()
    asset_count = db.query(FixedAsset).filter(
        (FixedAsset.asset_account_id == account_id) | 
        (FixedAsset.accumulated_depreciation_account_id == account_id) | 
        (FixedAsset.depreciation_expense_account_id == account_id)
    ).count()

    total_usage = journal_count + expense_count + asset_count

    return {
        "account_id": account_id,
        "account_code": coa.account_code,
        "account_name": coa.account_name,
        "total_usage": total_usage,
        "details": {
            "journal_lines": journal_count,
            "expenses": expense_count,
            "fixed_assets": asset_count
        },
        "can_delete_safely": total_usage == 0
    }


@router.post("/coas/{account_id}/relink")
def relink_and_migrate_coa(account_id: str, req: RelinkRequest, db: Session = Depends(get_db)):
    """Pindahkan semua relasi transaksi dari satu akun ke akun lain secara aman (Atomic Transaction)."""
    source_coa = db.query(ChartOfAccount).filter(ChartOfAccount.id == account_id).first()
    if not source_coa:
        raise HTTPException(status_code=404, detail="Akun sumber tidak ditemukan")

    target_coa = db.query(ChartOfAccount).filter(ChartOfAccount.id == req.target_account_id).first()
    if not target_coa:
        raise HTTPException(status_code=404, detail="Akun target pemindahan tidak ditemukan")

    if source_coa.id == target_coa.id:
        raise HTTPException(status_code=400, detail="Akun target tidak boleh sama dengan akun sumber")

    try:
        # 1. Pindahkan Journal Lines
        j_lines = db.query(JournalLine).filter(JournalLine.account_id == source_coa.id).update(
            {"account_id": target_coa.id}, synchronize_session=False
        )

        # 2. Pindahkan Expenses
        exp_1 = db.query(Expense).filter(Expense.expense_account_id == source_coa.id).update(
            {"expense_account_id": target_coa.id}, synchronize_session=False
        )
        exp_2 = db.query(Expense).filter(Expense.payment_account_id == source_coa.id).update(
            {"payment_account_id": target_coa.id}, synchronize_session=False
        )
        exp_3 = db.query(Expense).filter(Expense.admin_fee_account_id == source_coa.id).update(
            {"admin_fee_account_id": target_coa.id}, synchronize_session=False
        )

        # 3. Pindahkan Fixed Assets
        fa_1 = db.query(FixedAsset).filter(FixedAsset.asset_account_id == source_coa.id).update(
            {"asset_account_id": target_coa.id}, synchronize_session=False
        )
        fa_2 = db.query(FixedAsset).filter(FixedAsset.accumulated_depreciation_account_id == source_coa.id).update(
            {"accumulated_depreciation_account_id": target_coa.id}, synchronize_session=False
        )
        fa_3 = db.query(FixedAsset).filter(FixedAsset.depreciation_expense_account_id == source_coa.id).update(
            {"depreciation_expense_account_id": target_coa.id}, synchronize_session=False
        )

        # 4. Pindahkan Customers & Vendors
        db.query(Customer).filter(Customer.receivable_account_id == source_coa.id).update(
            {"receivable_account_id": target_coa.id}, synchronize_session=False
        )
        db.query(Vendor).filter(Vendor.payable_account_id == source_coa.id).update(
            {"payable_account_id": target_coa.id}, synchronize_session=False
        )

        total_moved = j_lines + exp_1 + exp_2 + exp_3 + fa_1 + fa_2 + fa_3

        if req.delete_source:
            db.delete(source_coa)
            msg = f"Berhasil memindahkan {total_moved} transaksi ke [{target_coa.account_code} - {target_coa.account_name}], dan akun lama telah dihapus."
        else:
            source_coa.is_active = False
            msg = f"Berhasil memindahkan {total_moved} transaksi ke [{target_coa.account_code} - {target_coa.account_name}], dan akun lama dinonaktifkan."

        db.commit()
        return {
            "success": True,
            "message": msg,
            "moved_count": total_moved,
            "target_account": f"{target_coa.account_code} - {target_coa.account_name}"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal memindahkan relasi transaksi: {str(e)}")
