import os
import hdbcli.dbapi as dbapi

conn = dbapi.connect(
    address='70ddf6e8-ee91-4a59-aa45-f2009a7e6ff9.hna1.prod-us10.hanacloud.ondemand.com',
    port=443,
    user='DBADMIN',
    password=os.environ['HANA_DBADMIN_PASSWORD'],
    encrypt=True
)

cur = conn.cursor()
try:
    cur.execute("""
CREATE TABLE "RUNMYFRANCHISE_MF"."M_ARTICLE_IMAGE" (
  MATNR     NVARCHAR(40)  NOT NULL,
  COLOR     NVARCHAR(30)  NOT NULL,
  IMAGE_URL NVARCHAR(500),
  PRIMARY KEY (MATNR, COLOR)
)
""")
    conn.commit()
    print("M_ARTICLE_IMAGE created")
except Exception as e:
    if 'already exists' in str(e) or '386' in str(e):
        print("M_ARTICLE_IMAGE already exists")
    else:
        raise
cur.close()
conn.close()
