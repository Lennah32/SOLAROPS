import sqlite3
import os

# Always use the project-root solar.db, regardless of working directory
DB_NAME = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "solar.db")

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS panels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_path TEXT,
        defect_class TEXT,
        confidence REAL,
        image_type TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(email) REFERENCES users(email)
    );

    CREATE TABLE IF NOT EXISTS inspections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        area TEXT,
        row INTEGER,
        col INTEGER,
        panel_id TEXT,
        defect_class TEXT,
        status TEXT,
        priority TEXT,
        coverage REAL,
        max_temp REAL,
        delta_t REAL,
        efficiency_loss REAL,
        energy_loss_per_day REAL,
        cost_loss_per_day REAL,
        crew_type TEXT,
        people_required INTEGER,
        maintenance_decision TEXT,
        maintenance_cost REAL,
        rgb_image TEXT,
        thermal_image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(email) REFERENCES users(email)
    );

    CREATE TABLE IF NOT EXISTS farms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        rows INTEGER NOT NULL,
        cols INTEGER NOT NULL,
        grid TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(email) REFERENCES users(email)
    );

    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        settings_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(email) REFERENCES users(email)
    );
    """)

    conn.commit()
    conn.close()

def create_user(email):
    """Register a user if not exists"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    try:
        cursor.execute("INSERT INTO users (email) VALUES (?)", (email,))
        conn.commit()
    except sqlite3.IntegrityError:
        # user already exists (ignore)
        pass
    finally:
        conn.close()


def verify_user(email):
    """Simple auth: user exists in DB"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("SELECT email FROM users WHERE email=?", (email,))
    user = cursor.fetchone()

    conn.close()
    return user is not None


def save_prediction(email, filename, file_path, defect_class, confidence, image_type):
    """Store ML prediction result"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # ensure user exists
    create_user(email)

    cursor.execute("""
        INSERT INTO panels (
            email,
            filename,
            file_path,
            defect_class,
            confidence,
            image_type
        )
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        email,
        filename,
        file_path,
        defect_class,
        confidence,
        image_type
    ))

    conn.commit()
    conn.close()

def get_user_predictions(email):
    """Fetch all predictions for a user"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT filename, defect_class, confidence, image_type, created_at
        FROM panels
        WHERE email=?
        ORDER BY created_at DESC
    """, (email,))

    data = cursor.fetchall()
    conn.close()

    return data


def save_inspection(data):
    """Store a full panel inspection record"""
    print(f"DEBUG save_inspection: maintenance_cost = {data.get('maintenance_cost')!r}")
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    create_user(data['email'])

    cursor.execute("""
        INSERT INTO inspections (
            email, area, row, col, panel_id, defect_class, status, priority,
            coverage, max_temp, delta_t, efficiency_loss, energy_loss_per_day,
            cost_loss_per_day, crew_type, people_required, maintenance_decision,
            maintenance_cost, rgb_image, thermal_image
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data['email'], data.get('area'), data.get('row'), data.get('col'),
        data.get('panel_id'), data.get('defect_class'), data.get('status'),
        data.get('priority'), data.get('coverage'), data.get('max_temp'),
        data.get('delta_t'), data.get('efficiency_loss'), data.get('energy_loss_per_day'),
        data.get('cost_loss_per_day'), data.get('crew_type'), data.get('people_required'),
        data.get('maintenance_decision'), data.get('maintenance_cost'),
        data.get('rgb_image'), data.get('thermal_image')
    ))

    conn.commit()
    conn.close()


def get_inspections(email):
    """Fetch all inspections for a user with full details"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            area, row, col, panel_id, defect_class, status, priority,
            coverage, max_temp, delta_t, efficiency_loss, energy_loss_per_day,
            cost_loss_per_day, crew_type, people_required, maintenance_decision,
            maintenance_cost, rgb_image, thermal_image, created_at
        FROM inspections
        WHERE email=?
        ORDER BY created_at DESC
    """, (email,))

    rows = cursor.fetchall()
    conn.close()

    columns = [
        'area', 'row', 'col', 'panel_id', 'defect_class', 'status', 'priority',
        'coverage', 'max_temp', 'delta_t', 'efficiency_loss', 'energy_loss_per_day',
        'cost_loss_per_day', 'crew_type', 'people_required', 'maintenance_decision',
        'maintenance_cost', 'rgb_image', 'thermal_image', 'created_at'
    ]

    return [dict(zip(columns, row)) for row in rows]


def save_settings(email, settings_json):
    """Store or update user settings."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    create_user(email)

    cursor.execute("DELETE FROM settings WHERE email=?", (email,))
    cursor.execute("""
        INSERT INTO settings (email, settings_json)
        VALUES (?, ?)
    """, (email, settings_json))

    conn.commit()
    conn.close()


def get_settings(email):
    """Fetch user settings."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("SELECT settings_json FROM settings WHERE email=?", (email,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return row[0]
    return None


def save_farm(email, name, rows, cols, grid):
    """Store or update a farm grid for a user."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    create_user(email)

    # Upsert: delete existing farm with same email+name, then insert
    cursor.execute("DELETE FROM farms WHERE email=? AND name=?", (email, name))
    cursor.execute("""
        INSERT INTO farms (email, name, rows, cols, grid)
        VALUES (?, ?, ?, ?, ?)
    """, (email, name, rows, cols, grid))

    conn.commit()
    conn.close()


def get_farms(email):
    """Fetch all farms for a user."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, name, rows, cols, grid, created_at
        FROM farms
        WHERE email=?
        ORDER BY created_at DESC
    """, (email,))

    rows = cursor.fetchall()
    conn.close()

    columns = ['id', 'name', 'rows', 'cols', 'grid', 'created_at']
    return [dict(zip(columns, row)) for row in rows]


def delete_farm(email, farm_id):
    """Delete a specific farm by id (verifying ownership)."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("DELETE FROM farms WHERE email=? AND id=?", (email, farm_id))
    conn.commit()
    conn.close()