from sqlalchemy import Column, Integer, String, Float, ForeignKey
from database import Base
from database import engine

Base.metadata.create_all(bind=engine)

# COMPANY TABLE
class Company(Base):
    __tablename__ = "companies"

    company_id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    sector = Column(String)
    region = Column(String)


# DEAL TABLE
class Deal(Base):
    __tablename__ = "deals"

    deal_id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.company_id"))
    deal_size = Column(Float)
    instrument = Column(String)
    maturity = Column(String)       
    interest_rate = Column(Float)    
    purpose = Column(String)        
    risk_level = Column(String)     
    status = Column(String) 
    debt = Column(Float)
    ebitda = Column(Float)
    revenue = Column(Float)
    ebit = Column(Float)
    current_assets = Column(Float)
    current_liabilities = Column(Float)         


# FINANCIALS TABLE
class Financials(Base):
    __tablename__ = "financials"

    financial_id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.company_id"))
    revenue = Column(Float)
    ebitda = Column(Float)
    net_income = Column(Float)
    debt = Column(Float) 
    cash_flow = Column(Float) 
    year = Column(Integer)

# RISK TABLE
class RiskAssessment(Base):
    __tablename__ = "risk_assessment"

    risk_id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.deal_id"))
    risk_score = Column(Float)
    leverage_risk_flag = Column(String)
    coverage_risk_flag = Column(String)
    liquidity_risk_flag = Column(String)
    overall_risk_level = Column(String)

#USER TABLE
class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    email = Column(String(100), unique=True)
    password_hash = Column(String(255))
    role = Column(String(20))
   