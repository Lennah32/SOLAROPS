import sqlite3
conn = sqlite3.connect('solar.db')
c = conn.cursor()

c.execute("SELECT name FROM sqlite_master WHERE type='table'")
print('Tables:', [r[0] for r in c.fetchall()])

try:
    c.execute("SELECT email, name FROM farms")
    rows = c.fetchall()
    print('Farms:', rows if rows else 'No farms')
except Exception as e:
    print('Farms error:', e)

try:
    c.execute("SELECT email, panel_id FROM panels")
    rows = c.fetchall()
    print('Panels:', rows if rows else 'No panels')
except Exception as e:
    print('Panels error:', e)

conn.close()
