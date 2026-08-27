import easyocr
import re
import statistics
import logging
import warnings
import cv2
import os

# ==========================================
# ENVIRONMENT CLEANUP (Silence Warnings)
# ==========================================
logging.getLogger('easyocr').setLevel(logging.ERROR)
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

# ==========================================
# INITIALIZE EASYOCR
# EasyOCR downloads its weights automatically
# on first run — no .pt file needed
# ==========================================
reader = easyocr.Reader(['en'], gpu=False)  # Set gpu=True if server has a GPU

ALLOWED_THERMAL_EXTS = {'.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff', '.webp'}


# ==========================================
# SEVERITY LOGIC
# Based on IEC 62446-3 & Raptor Maps Standards
# ==========================================
def get_solar_severity(delta_T, critical_limit=20):
    """
    Returns severity level and color based on temperature difference.
    critical_limit: user-configurable ΔT threshold for HIGH severity (default 20°C)
    """
    if delta_T < 3:
        return "NORMAL", "#2ecc71"   # Green
    elif delta_T < 10:
        return "LOW", "#3498db"      # Blue
    elif delta_T < critical_limit:
        return "MEDIUM", "#f39c12"   # Orange
    else:
        return "HIGH", "#e74c3c"     # Red


# ==========================================
# MAIN THERMAL ANALYSIS FUNCTION
# ==========================================
def analyze_thermal_image(image_path, settings=None):
    """
    Takes a thermal image path and returns analysis results.
    settings dict keys:
        - rated_power_kw: panel rated power in kW (default 0.55)
        - avg_sun_hours: average daily sun hours (default 5.0)
        - electricity_tariff: SAR per kWh (default 0.20)
        - critical_limit: ΔT threshold for HIGH severity in °C (default 20)

    Args:
        image_path (str): Path to the thermal image file
        settings (dict): Optional user-configurable settings

    Returns:
        dict: Analysis results or None if analysis failed
    """
    # Default settings (aligned with Frontend SettingsPage defaults)
    defaults = {
        'rated_power_kw': 0.54,      # 540 W
        'avg_sun_hours': 6.5,
        'electricity_tariff': 0.18,
        'critical_limit': 15,
    }
    if settings:
        defaults.update(settings)

    rated_power_kw = float(defaults['rated_power_kw'])
    avg_sun_hours = float(defaults['avg_sun_hours'])
    electricity_tariff = float(defaults['electricity_tariff'])
    critical_limit = float(defaults['critical_limit'])

    # Validate file extension
    ext = os.path.splitext(image_path)[1].lower()
    if ext not in ALLOWED_THERMAL_EXTS:
        print(f"Unsupported thermal image format: {ext}. Allowed: {ALLOWED_THERMAL_EXTS}")
        return None

    # Step 1: Read image with OpenCV and pass numpy array to EasyOCR
    # (avoids path-related bugs in some EasyOCR versions)
    try:
        img = cv2.imread(image_path)
        if img is None:
            print(f"Could not read thermal image: {image_path}")
            return None
        result = reader.readtext(img)
    except Exception as e:
        print(f"OCR Error on {image_path}: {e}")
        return None

    # Step 2: Extract temperature values from OCR text
    temps = []
    for (bbox, text, prob) in result:
        cleaned = text.replace(",", ".").replace("o", "0").replace("O", "0").replace("_", "")
        cleaned = re.sub("[^0-9.]", "", cleaned)
        try:
            val = float(cleaned)
            if 15 < val < 150:
                temps.append(val)
        except:
            continue

    # Step 3: Need at least 2 temperatures
    if len(temps) < 2:
        return None

    temps = sorted(temps)
    T_hot = temps[-1]

    potential_refs = [t for t in temps if 30 < t < T_hot]
    if potential_refs:
        T_ref = statistics.median(potential_refs)
    else:
        T_ref = temps[0] if len(temps) < 3 else temps[1]

    # Step 4: Calculate metrics
    delta_T = T_hot - T_ref
    severity_label, color = get_solar_severity(delta_T, critical_limit)

    # Efficiency loss: ~0.4% per °C (standard silicon PV coefficient)
    eff_loss = delta_T * 0.004

    # Energy loss = panel power × sun hours × efficiency loss
    daily_energy_kwh = (rated_power_kw * avg_sun_hours) * eff_loss

    # Cost loss = energy loss × electricity tariff
    daily_cost_sar = daily_energy_kwh * electricity_tariff

    return {
        "hot": round(T_hot, 1),
        "ref": round(T_ref, 1),
        "delta": round(delta_T, 1),
        "sev": severity_label,
        "color": color,
        "ef_loss": round(eff_loss * 100, 2),
        "en_loss": round(daily_energy_kwh, 3),
        "riyal": round(daily_cost_sar, 3)
    }
