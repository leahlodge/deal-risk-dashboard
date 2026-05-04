from fastapi import FastAPI,  Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import engine, SessionLocal
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt
from auth import verify_password, create_token, hash_password
from auth import SECRET_KEY
from pydantic import BaseModel
from fastapi import UploadFile, File
import pandas as pd



class DealRequest(BaseModel):
    company: str
    sector: str
    revenue: float
    ebitda: float
    debt: float
    interest: float

app = FastAPI()
import models
security = HTTPBearer()
models.Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
#  SECURITY SETUP 

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload["sub"]
    except:
        raise HTTPException(status_code=401, detail="Invalid token")
# LOGIN REQUEST
            
class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/login")
def login(data: LoginRequest):
    db = SessionLocal()

    user = db.query(models.User).filter(
        models.User.username == data.username
    ).first()

    print(" INPUT:", data.username, data.password)

    if not user:
        print(" USER NOT FOUND")
        db.close()
        raise HTTPException(status_code=401, detail="Invalid credentials")

    print("USER FOUND:", user.username)
    print("HASH IN DB:", user.password_hash)

    if not verify_password(data.password, user.password_hash):
        print("PASSWORD DOES NOT MATCH")
        db.close()
        raise HTTPException(status_code=401, detail="Invalid credentials")

    print(" PASSWORD MATCH")

    token = create_token({
        "sub": user.username,
        "role": user.role
    })

    db.close()
    return {"access_token": token}
class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


# MAIN
@app.get("/")
def home():
    return {"message": "Dashboard API is working"}
# HEALTH CHECK
@app.get("/health")
def health_check():
    return {"status": "ok"}

# GET ALL DEALS (PROTECTED)
@app.get("/deals")
def get_deals(user: str = Depends(get_current_user)):
    db = SessionLocal()
    deals = db.query(models.Deal).all()

    result = []

    for d in deals:

        # GET COMPANY
        company = db.query(models.Company).filter(
            models.Company.company_id == d.company_id
        ).first()

        # CALCULATE Debt / EBITDA
        ebitda = d.ebitda if d.ebitda else 0
        debt = d.debt if d.debt else 0

        if ebitda != 0:
            debt_ebitda = round(debt / ebitda, 2)
        else:
            debt_ebitda = None

        # RISK ENGINE
        risk = calculate_risk(
            debt=d.debt if d.debt else 0,
            ebitda=d.ebitda if d.ebitda else 0,
            interest_expense=d.interest_rate if d.interest_rate else 0,
            current_assets=d.current_assets if d.current_assets else 0,
            current_liabilities=d.current_liabilities if d.current_liabilities else 0,
            ebit=d.ebit if d.ebit else 0,
            revenue=d.revenue if d.revenue else 0
        )

        # FINAL RISK VALUES
        risk_score = risk["overall"]["risk_score"]   # numeric score
        risk_level = risk["overall"]["risk"]         # green / yellow / red

        result.append({
            "id": d.deal_id,
            "company": company.name if company else "Unknown Company",
            "sector": company.sector if company else "Unknown Sector",
            "region": company.region if company else "Unknown Region",
            "revenue": d.revenue,
            "deal_size": d.deal_size,
            "debt_ebitda": debt_ebitda,

            # SCORE + TRAFFIC LIGHT
            "risk_score": risk_score,
            "risk_level": risk_level,

            "status": d.status
        })

    db.close()
    return result
@app.post("/add-deal")
def add_deal(data: DealRequest, user: str = Depends(get_current_user)):
    db = SessionLocal()

    # CREATE COMPANY FIRST
    new_company = models.Company(
        name=data.company,
        sector=data.sector,
        region="UK"
    )

    db.add(new_company)
    db.commit()
    db.refresh(new_company)

    # CREATE DEAL USING REAL company_id
    new_deal = models.Deal(
        company_id=new_company.company_id,
        deal_size=data.revenue,
        instrument="Manual Input",
        maturity="5 years",
        interest_rate=data.interest,
        purpose="Uploaded",
        risk_level="pending",
        status="new",
        debt=data.debt,
        ebitda=data.ebitda,
        revenue=data.revenue,
        ebit=data.ebitda * 0.8,
        current_assets=50,
        current_liabilities=30
    )

    db.add(new_deal)
    db.commit()
    db.close()

    return {
        "message": "Deal added successfully"
    }
#UPLOAD FILE
@app.post("/upload-file")
def upload_file(
    file: UploadFile = File(...),
    user: str = Depends(get_current_user)
):
    db = SessionLocal()

    try:
        filename = file.filename.lower()

        # READ FILE
        if filename.endswith(".csv"):
            df = pd.read_csv(file.file)

        elif filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(file.file)

        else:
            db.close()
            raise HTTPException(
                status_code=400,
                detail="Only CSV and Excel files are supported"
            )

        required_columns = [
            "company",
            "sector",
            "revenue",
            "ebitda",
            "debt",
            "interest"
        ]

        for col in required_columns:
            if col not in df.columns:
                db.close()
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required column: {col}"
                )

        # LOOP THROUGH ROWS
        for _, row in df.iterrows():

            # CREATE COMPANY
            new_company = models.Company(
                name=str(row["company"]),
                sector=str(row["sector"]),
                region="UK"
            )

            db.add(new_company)
            db.commit()
            db.refresh(new_company)

            # CREATE DEAL
            new_deal = models.Deal(
                company_id=new_company.company_id,
                deal_size=float(row["revenue"]),
                instrument="Spreadsheet Upload",
                maturity="5 years",
                interest_rate=float(row["interest"]),
                purpose="Uploaded via Excel/CSV",
                risk_level="pending",
                status="new",
                debt=float(row["debt"]),
                ebitda=float(row["ebitda"]),
                revenue=float(row["revenue"]),
                ebit=float(row["ebitda"]) * 0.8,
                current_assets=50,
                current_liabilities=30
            )

            db.add(new_deal)

        db.commit()
        db.close()

        return {
            "message": "Spreadsheet uploaded successfully"
        }

    except Exception as e:
        db.close()
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
# ADD A COMPANY
@app.post("/add-company")
def add_company(user: str = Depends(get_current_user)):
    db = SessionLocal()
    new_company = models.Company(
        name="ABC Ltd",
        sector="Technology",
        region="UK"
    )
    db.add(new_company)
    db.commit()
    db.close()
    return {"message": "Company added"}
# SEARCH BY COMPANY NAME
@app.get("/deals/company/{name}")
def get_deals_by_company(name: str):
    deals = [
        {"id": 1, "company": "ABC Ltd", "sector": "Technology", "region": "UK"}
    ]
    results = [d for d in deals if name.lower() in d["company"].lower()]
    if results:
        return results
    return {"error": "No deals found for company: {name}"}

@app.get("/deals/{id}/risk")
def get_risk(id: int):
    db = SessionLocal()

    deal = db.query(models.Deal).filter(
        models.Deal.deal_id == id
    ).first()

    if not deal:
        db.close()
        return {"error": "Deal not found"}

    risk = calculate_risk(
        debt=deal.debt if deal.debt else 0,
        ebitda=deal.ebitda if deal.ebitda else 0,
        interest_expense=deal.interest_rate if deal.interest_rate else 0,
        current_assets=deal.current_assets if deal.current_assets else 0,
        current_liabilities=deal.current_liabilities if deal.current_liabilities else 0,
        ebit=deal.ebit if deal.ebit else 0,
        revenue=deal.revenue if deal.revenue else 0
    )

    db.close()

    return {
        "deal_id": deal.deal_id,
        "risk_score": risk["overall"]["risk_score"],
        "risk_level": risk["overall"]["risk"],
        "risk_label": risk["overall"]["label"],
        "covenant_flags": risk["covenant"]["flags"]
    }
# FILTER BY SECTOR
@app.get("/deals/sector/{sector}")
def get_deals_by_sector(sector: str):
    deals = [
        {"id": 1, "company": "ABC Ltd", "sector": "Technology", "region": "UK"}
    ]
    results = [d for d in deals if d["sector"].lower() == sector.lower()]
    if results:
        return results
    return {"error": "No deals found for sector: {sector}"}

# FILTER BY RISK LEVEL
@app.get("/deals/risk/{level}")
def get_deals_by_risk(level: str):
    deals = [
        {"id": 1, "company": "ABC Ltd", "ebitda": 30, "debt": 100, "risk": "yellow"}
    ]
    results = [d for d in deals if d["risk"].lower() == level.lower()]
    if results:
        return results
    return {"error": "No deals found for risk level: {level}"}

# FILTER BY REGION
@app.get("/deals/region/{region}")
def get_deals_by_region(region: str):
    deals = [
        {"id": 1, "company": "ABC Ltd", "sector": "Technology", "region": "UK"}
    ]
    results = [d for d in deals if d["region"].lower() == region.lower()]
    if results:
        return results
    return {"error": "No deals found for region: {region}"}

def calculate_risk(
    debt,
    ebitda,
    interest_expense,
    current_assets,
    current_liabilities,
    ebit,
    revenue
):

    results = {}

    
    # LEVERAGE (Debt / EBITDA)
    if ebitda and ebitda != 0:
        leverage = debt / ebitda

        if leverage < 3:
            leverage_risk = "green"
            leverage_label = "Low Risk"
            leverage_score = 20

        elif leverage < 5:
            leverage_risk = "yellow"
            leverage_label = "Moderate Risk"
            leverage_score = 60

        else:
            leverage_risk = "red"
            leverage_label = "High Risk"
            leverage_score = 90

    else:
        leverage = None
        leverage_risk = "red"
        leverage_label = "Unable to calculate"
        leverage_score = 100

    results["leverage"] = {
        "ratio": round(leverage, 2) if leverage is not None else None,
        "risk": leverage_risk,
        "label": leverage_label,
        "metric": "Debt/EBITDA"
    }


    # COVERAGE (EBITDA / Interest) 
    if interest_expense and interest_expense != 0:
        coverage = ebitda / interest_expense

        if coverage > 2.5:
            coverage_risk = "green"
            coverage_label = "Strong Coverage"
            coverage_score = 20

        elif coverage >= 1.5:
            coverage_risk = "yellow"
            coverage_label = "Marginal Coverage"
            coverage_score = 60

        else:
            coverage_risk = "red"
            coverage_label = "Weak Coverage"
            coverage_score = 90

    else:
        coverage = None
        coverage_risk = "red"
        coverage_label = "Unable to calculate"
        coverage_score = 100

    results["coverage"] = {
        "ratio": round(coverage, 2) if coverage is not None else None,
        "risk": coverage_risk,
        "label": coverage_label,
        "metric": "EBITDA / Interest Expense"
    }

   
    # LIQUIDITY (Current Ratio)
    if current_liabilities and current_liabilities != 0:
        liquidity = current_assets / current_liabilities

        if liquidity > 2:
            liquidity_risk = "green"
            liquidity_label = "Strong Liquidity"
            liquidity_score = 20

        elif liquidity >= 1:
            liquidity_risk = "yellow"
            liquidity_label = "Adequate Liquidity"
            liquidity_score = 60

        else:
            liquidity_risk = "red"
            liquidity_label = "Liquidity Risk"
            liquidity_score = 90

    else:
        liquidity = None
        liquidity_risk = "red"
        liquidity_label = "Unable to calculate"
        liquidity_score = 100

    results["liquidity"] = {
        "ratio": round(liquidity, 2) if liquidity is not None else None,
        "risk": liquidity_risk,
        "label": liquidity_label,
        "metric": "Current Ratio"
    }


    # PROFITABILITY (EBIT Margin) 
    if revenue and revenue != 0:
        ebit_margin = (ebit / revenue) * 100

        if ebit_margin > 15:
            profitability_risk = "green"
            profitability_label = "Strong Profitability"

        elif ebit_margin >= 5:
            profitability_risk = "yellow"
            profitability_label = "Moderate Profitability"

        else:
            profitability_risk = "red"
            profitability_label = "Weak Profitability"

    else:
        ebit_margin = None
        profitability_risk = "red"
        profitability_label = "Unable to calculate"

    results["profitability"] = {
        "ratio": round(ebit_margin, 2) if ebit_margin is not None else None,
        "risk": profitability_risk,
        "label": profitability_label,
        "metric": "EBIT / Revenue %"
    }

  
    # REVENUE GROWTH 
    previous_revenue = revenue * 0.92  
    if previous_revenue and previous_revenue != 0:
        revenue_growth = (
            (revenue - previous_revenue) / previous_revenue
        ) * 100

        if revenue_growth > 10:
            growth_score = 20
            growth_risk = "green"
            growth_label = "Strong Growth"

        elif revenue_growth >= 0:
            growth_score = 60
            growth_risk = "yellow"
            growth_label = "Stable Growth"

        else:
            growth_score = 90
            growth_risk = "red"
            growth_label = "Revenue Decline"

    else:
        revenue_growth = None
        growth_score = 100
        growth_risk = "red"
        growth_label = "Unable to calculate"

    results["growth"] = {
        "ratio": round(revenue_growth, 2) if revenue_growth is not None else None,
        "risk": growth_risk,
        "label": growth_label,
        "metric": "Revenue Growth %"
    }


    # EBITDA Margin Score
    if revenue and revenue != 0:
        margin = (ebitda / revenue) * 100

        if margin > 20:
            margin_score = 20
        elif margin > 10:
            margin_score = 60
        else:
            margin_score = 90

    else:
        margin_score = 100

    
     # FINAL WEIGHTED RISK SCORE
    risk_score = round(
        (leverage_score * 0.35) +
        (coverage_score * 0.25) +
        (liquidity_score * 0.15) +
        (growth_score * 0.10) +
        (margin_score * 0.15)
    )

   
    # COVENANT BREACH CHECK
    covenant_flags = []

    if leverage is not None and leverage > 5:
        covenant_flags.append(
            "Debt/EBITDA exceeds covenant threshold"
        )

    if coverage is not None and coverage < 1.5:
        covenant_flags.append(
            "Interest coverage below minimum threshold"
        )

    if liquidity is not None and liquidity < 1:
        covenant_flags.append(
            "Liquidity covenant breach risk"
        )

    if covenant_flags:
        covenant_status = "red"
        covenant_label = "Potential Covenant Breach"
    else:
        covenant_status = "green"
        covenant_label = "No Immediate Covenant Breach"

    results["covenant"] = {
        "flags": covenant_flags,
        "risk": covenant_status,
        "label": covenant_label,
        "metric": "Covenant Monitoring"
    }

    # FINAL TRAFFIC LIGHT
    if risk_score < 35:
        overall_risk = "green"
        overall_label = "Low Risk"

    elif risk_score < 70:
        overall_risk = "yellow"
        overall_label = "Moderate Risk"

    else:
        overall_risk = "red"
        overall_label = "High Risk"

    results["overall"] = {
        "risk": overall_risk,
        "label": overall_label,
        "risk_score": risk_score
    }

    results["flags"] = covenant_flags if covenant_flags else [
        "No major risk flags"
    ]

    return results
    
@app.get("/deal-analysis")
def analyse_deals(user: str = Depends(get_current_user)):
    db = SessionLocal()
    deals = db.query(models.Deal).all()
    results = []

    for d in deals:
        # GET COMPANY DETAILS
        company = db.query(models.Company).filter(
            models.Company.company_id == d.company_id
        ).first()

        # CALCULATE RISK
        risk = calculate_risk(
            debt=d.debt if d.debt else 0,
            ebitda=d.ebitda if d.ebitda else 0,
            interest_expense=d.interest_rate if d.interest_rate else 0,
            current_assets=50,
            current_liabilities=30,
            ebit=d.ebitda * 0.8 if d.ebitda else 0,
            revenue=d.revenue if d.revenue else 0
        )

        results.append({
            "deal_id": d.deal_id,

            # COMPANY INFO
            "company_id": d.company_id,
            "company_name": company.name if company else "Unknown",
            "company_sector": company.sector if company else "Unknown",
            "company_region": company.region if company else "Unknown",

            # DEAL INFO
            "instrument": d.instrument,
            "deal_size": d.deal_size,
            "maturity": d.maturity,
            "interest_rate": d.interest_rate,
            "purpose": d.purpose,
            "status": d.status,
            "revenue": d.revenue,
            "ebitda": d.ebitda,
            "debt": d.debt,

            # TRAFFIC LIGHTS
            "leverage_risk": risk["leverage"]["risk"],
            "leverage_label": risk["leverage"]["label"],
            "leverage_ratio": risk["leverage"]["ratio"],

            "coverage_risk": risk["coverage"]["risk"],
            "coverage_label": risk["coverage"]["label"],
            "coverage_ratio": risk["coverage"]["ratio"],

            "liquidity_risk": risk["liquidity"]["risk"],
            "liquidity_label": risk["liquidity"]["label"],
            "liquidity_ratio": risk["liquidity"]["ratio"],

            "profitability_risk": risk["profitability"]["risk"],
            "profitability_label": risk["profitability"]["label"],
            "profitability_ratio": risk["profitability"]["ratio"],

            # OVERALL RISK
            "overall_risk": risk["overall"]["risk"],
            "overall_label": risk["overall"]["label"],
            "risk_score": risk["overall"]["risk_score"],

            # RISK FLAGS
            "flags": risk["flags"]
        })

    db.close()
    return results

@app.get("/debug")
def debug():
    db = SessionLocal()
    users = db.query(models.User).all()
    deals = db.query(models.Deal).all()
    db.close()
    return {"users": len(users), "deals": len(deals)}


