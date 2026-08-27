from flask import Flask, request, jsonify
from flask_cors import CORS
from normal_inference import predict_normal_image
from thermal_inference import analyze_thermal_image
from db import save_prediction, verify_user, init_db, create_user, save_inspection, get_inspections, save_farm, get_farms, delete_farm, save_settings, get_settings
import os
import uuid
import secrets

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:5174"])

# Initialize SQLite database on startup
init_db()

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_NORMAL_EXTS = {'.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff', '.webp', '.dng', '.mpo'}
ALLOWED_THERMAL_EXTS = {'.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff', '.webp'}


@app.route('/predict/normal', methods=['POST'])
def predict_normal():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    file = request.files['image']
    if not file.filename:
        return jsonify({'error': 'No file selected'}), 400

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_NORMAL_EXTS:
        return jsonify({'error': f'Unsupported image format: {ext}. Allowed: {", ".join(ALLOWED_NORMAL_EXTS)}'}), 400

    filename = str(uuid.uuid4()) + "_" + file.filename
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)

    predictions = predict_normal_image(file_path)

    if isinstance(predictions, dict) and 'error' in predictions:
        return jsonify({'error': predictions['error']}), 500

    for p in predictions:
        save_prediction(
            filename=filename,
            file_path=file_path,
            defect_class=p['defect_class'],
            confidence=p['confidence'],
            uploaded_by=request.form.get('uploaded_by', 'unknown'),
            image_type='normal'
        )

    return jsonify({'predictions': predictions})


@app.route('/predict/thermal', methods=['POST'])
def predict_thermal():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    file = request.files['image']
    if not file.filename:
        return jsonify({'error': 'No file selected'}), 400

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_THERMAL_EXTS:
        return jsonify({'error': f'Unsupported image format: {ext}. Allowed: {", ".join(ALLOWED_THERMAL_EXTS)}'}), 400

    filename = file.filename
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)

    # Parse optional settings from form data
    settings = None
    try:
        settings_raw = request.form.get('settings')
        if settings_raw:
            import json
            settings = json.loads(settings_raw)
    except Exception:
        settings = None

    result = analyze_thermal_image(file_path, settings)

    if result is None:
        return jsonify({'error': 'Could not analyze thermal image. Ensure the image contains readable temperature values.'}), 400

    save_prediction(
        filename=filename,
        file_path=file_path,
        defect_class=result['sev'],
        confidence=0.0,
        uploaded_by=request.form.get('uploaded_by', 'unknown'),
        image_type='thermal'
    )

    return jsonify({'result': result})


@app.route('/inspection', methods=['POST'])
def save_panel_inspection():
    data = request.json
    if not data or not data.get('email'):
        return jsonify({'error': 'Email is required'}), 400

    save_inspection(data)
    return jsonify({'message': 'Inspection saved successfully'}), 201


@app.route('/inspections', methods=['GET'])
def get_panel_inspections():
    email = request.args.get('email')
    if not email:
        return jsonify({'error': 'Email is required'}), 400

    inspections = get_inspections(email)
    return jsonify({'inspections': inspections})


@app.route('/', methods=['GET'])
def health_check():
    return jsonify({'status': 'SolarOps backend is running ✅'})


@app.route('/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')

    if not email:
        return jsonify({"error": "Email is required"}), 400

    create_user(email)
    return jsonify({"message": "User registered successfully"}), 201


@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')

    if not email:
        return jsonify({"error": "Email is required"}), 400

    if verify_user(email):
        token = secrets.token_urlsafe(32)
        return jsonify({"message": "Login success", "token": token})
    else:
        return jsonify({"error": "Invalid credentials"}), 401


@app.route('/farm', methods=['POST'])
def create_or_update_farm():
    data = request.json
    if not data or not data.get('email') or not data.get('name'):
        return jsonify({'error': 'Email and farm name are required'}), 400

    save_farm(
        email=data['email'],
        name=data['name'],
        rows=data.get('rows', 0),
        cols=data.get('cols', 0),
        grid=data.get('grid', '[]')
    )
    return jsonify({'message': 'Farm saved successfully'}), 201


@app.route('/farms', methods=['GET'])
def list_farms():
    email = request.args.get('email')
    if not email:
        return jsonify({'error': 'Email is required'}), 400

    farms = get_farms(email)
    return jsonify({'farms': farms})


@app.route('/farm', methods=['DELETE'])
def remove_farm():
    email = request.args.get('email')
    farm_id = request.args.get('id')
    if not email or not farm_id:
        return jsonify({'error': 'Email and farm id are required'}), 400

    delete_farm(email, int(farm_id))
    return jsonify({'message': 'Farm deleted successfully'})


@app.route('/settings', methods=['POST'])
def save_user_settings():
    data = request.json
    if not data or not data.get('email'):
        return jsonify({'error': 'Email is required'}), 400

    import json
    save_settings(data['email'], json.dumps(data.get('settings', {})))
    return jsonify({'message': 'Settings saved successfully'})


@app.route('/settings', methods=['GET'])
def get_user_settings():
    email = request.args.get('email')
    if not email:
        return jsonify({'error': 'Email is required'}), 400

    import json
    settings_json = get_settings(email)
    if settings_json:
        return jsonify({'settings': json.loads(settings_json)})
    return jsonify({'settings': {}})


if __name__ == '__main__':
    app.run(debug=True, port=5000)