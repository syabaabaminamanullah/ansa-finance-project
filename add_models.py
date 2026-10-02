with open('backend/db/models.py', 'a') as f:
    f.write('''

class TaxWorker(BaseModel):
    __tablename__ = "tax_workers"

    name = Column(String, nullable=False)
    npwp = Column(String, nullable=True)
    ptkp_status = Column(String, nullable=True) # e.g. "TK/0", "K/1"
    base_salary = Column(Float, default=0.0)
    join_date = Column(String, nullable=True)
    exit_date = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

class TaxWorkerHistory(BaseModel):
    __tablename__ = "tax_worker_history"

    worker_id = Column(String, ForeignKey("tax_workers.id"), nullable=False)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    period_month = Column(String, nullable=False) # e.g. "2026-08"
    gross_salary = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    net_salary = Column(Float, default=0.0)

    worker = relationship("TaxWorker")
    project = relationship("Project")
''')
