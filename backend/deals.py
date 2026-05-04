from database import SessionLocal
import models

db = SessionLocal()


if db.query(models.Company).first():
    print("Data already exists, skipping seed")
    db.close()
    exit()


# 30 COMPANIES

companies = [

    {"name": "Phils Manufacturing", "sector": "Industrials", "region": "Europe"},
    {"name": "Digitech Ltd", "sector": "Software", "region": "Europe"},
    {"name": "Green Energy Corp", "sector": "Energy", "region": "Europe"},
    {"name": "CariMed Pharma", "sector": "Healthcare", "region": "North America"},
    {"name": "Mcmaster Wholesale", "sector": "Consumer", "region": "Europe"},
    {"name": "Prime Logistics", "sector": "Logistics", "region": "Europe"},
    {"name": "Asset GLobal Ltd", "sector": "Financial Services", "region": "Europe"},
    {"name": "Healthway", "sector": "Healthcare", "region": "Europe"},
    {"name": "CloudCamp", "sector": "Software", "region": "North America"},
    {"name": "Urban Retail", "sector": "Consumer", "region": "Europe"},

    {"name": "Scotia Foods", "sector": "Consumer", "region": "North America"},
    {"name": "Sharjah Telecom", "sector": "Telecom", "region": "Middle East"},
    {"name": "CrossOcean Shipping", "sector": "Logistics", "region": "Asia"},
    {"name": "Ultra Steel", "sector": "Industrials", "region": "Asia"},
    {"name": "Vision Health", "sector": "Healthcare", "region": "Middle East"},
    {"name": "Capital Edge", "sector": "Financial Services", "region": "North America"},
    {"name": "SmartGrid Energy", "sector": "Energy", "region": "Europe"},
    {"name": "Beta Systems", "sector": "Software", "region": "Europe"},
    {"name": "Fresh Harvest", "sector": "Consumer", "region": "Asia"},
    {"name": "Quest Logistics", "sector": "Logistics", "region": "Middle East"},

    {"name": "Lane Pharma", "sector": "Healthcare", "region": "Europe"},
    {"name": "EcoBuild", "sector": "Industrials", "region": "Europe"},
    {"name": "Elizabeth Mutual", "sector": "Financial Services", "region": "Europe"},
    {"name": "Skyline Tech", "sector": "Software", "region": "North America"},
    {"name": "Global Energy Ltd", "sector": "Energy", "region": "Europe"},
    {"name": "Sub Retail", "sector": "Consumer", "region": "Europe"},
    {"name": "FastLane Freight", "sector": "Logistics", "region": "Europe"},
    {"name": "Flex Medical", "sector": "Healthcare", "region": "North America"},
    {"name": "NextGen Finance", "sector": "Financial Services", "region": "Asia"},
    {"name": "SteelWorks Ltd", "sector": "Industrials", "region": "Europe"},
]

company_objects = []

for c in companies:
    company = models.Company(**c)
    db.add(company)
    company_objects.append(company)

db.commit()

for company in company_objects:
    db.refresh(company)

# DEALS


for i, company in enumerate(company_objects):

    # Revenue grows across deals
    revenue = 70 + (i * 5)

  
    #  Risk Distribution
    
    # 0–9   = GREEN (Low Risk)
    # 10–19 = YELLOW (Moderate Risk)
    # 20–29 = RED (High Risk)
    
for i, company in enumerate(company_objects):

    # Revenue varies 
    revenue = 70 + (i * 7)

    #  EBITDA variation
    ebitda_margin = [
        0.11, 0.14, 0.17, 0.19, 0.22,
        0.25, 0.28, 0.31, 0.34, 0.38
    ][i % 10]

    ebitda = round(revenue * ebitda_margin, 1)

    # varied debt ratios
    if i % 3 == 0:
        # LOW RISK = green
        debt_multiple = 2.2 + (i % 2) * 0.4

    elif i % 3 == 1:
        # MODERATE RISK = yellow
        debt_multiple = 3.6 + (i % 2) * 0.6

    else:
        # HIGH RISK = red
        debt_multiple = 5.4 + (i % 2) * 0.8

    debt = round(ebitda * debt_multiple, 1)

    # Interest expense 
    interest_rate = round(5 + (i % 7), 1)

    # Status 
    if i % 3 == 0:
        status = "approved"
    elif i % 3 == 1:
        status = "under_review"
    else:
        status = "new"

    new_deal = models.Deal(
        company_id=company.company_id,
        deal_size=revenue,
        instrument="Senior Secured Loan",
        maturity="5 years",
        interest_rate=interest_rate,
        purpose="LBO",
        risk_level="pending",
        status=status,

        debt=debt,
        ebitda=ebitda,
        revenue=revenue,
        ebit=round(ebitda * 0.8, 1),

        current_assets=45 + (i * 3),
        current_liabilities=25 + (i % 15)
    )

    db.add(new_deal)

db.commit()
db.close()

print("30 deals seeded successfully")