# SolarOps - Solar Panel Defect Detection System

An advanced, economics-aware AI platform designed to detect solar panel defects using YOLOv9, supporting both normal (RGB) and thermal images.

---

> ## ⚠️ Attribution Required
>
> SolarOps was built by a team of **five builders**.
>
> **Using this platform in any competition, hackathon, or judged event without
> crediting the five builders is prohibited.** This covers the models, the
> inference pipelines, the backend, the frontend, and the notebooks.
>
> See **[ATTRIBUTION.md](ATTRIBUTION.md)** for the full terms and the credit
> notice to include in your submission.

---

## 📋 Table of Contents
- [Problem Statement](#problem-statement)
- [Project Architecture](#project-architecture)
- [Classes](#classes)
- [Results](#results)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Prerequisites](#prerequisites)
- [Project Setup](#project-setup)
- [How to Run](#how-to-run)
- [Troubleshooting](#troubleshooting)

---

## 📌 Problem Statement

Solar panels can develop several defects — like bird droppings, dust accumulation, physical or electrical damage — that reduce their efficiency. The goal of this project is to automatically detect and segment such defects using YOLOv9c-seg, improving maintenance workflows and power-output monitoring.

---

## 🏗️ Project Architecture

```
User uploads image (Frontend)
        ↓
Backend receives image → loads fine-tuned YOLOv9 model
        ↓
Model runs prediction → returns defect class + confidence
        ↓
Result saved to SQLite database
        ↓
Result displayed to user (Frontend)
```

---

## 🏷️ Classes

The model detects and segments **6 defect types**:

1. 🐦 Bird-drop
2. ⚠️ Defective
3. 🌫️ Dusty
4. ⚡ Electrical-Damage
5. ✅ Non-Defective
6. 💥 Physical-Damage

---

## 📊 Results

After training the YOLOv9c-seg model on the custom Solar Panel Defect Detection dataset from Roboflow:

| Metric | Bounding Box | Segmentation Mask |
|--------|-------------|-------------------|
| Precision | 0.786 | 0.779 |
| Recall | 0.715 | 0.689 |
| mAP@50 | 0.776 | 0.736 |
| mAP@50–95 | 0.583 | 0.501 |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Model** | YOLOv9c-seg (Ultralytics) |
| **Training** | Google Colab (GPU T4) |
| **Dataset** | Roboflow |
| **Backend** | Python, Flask |
| **Database** | SQLite |
| **Frontend** | React, Vite, Tailwind CSS, shadcn/ui |
| **Version Control** | GitHub |

---

## 📁 Folder Structure

```
SolarOps/
│
├── backend/                           # Flask API + AI inference
│   ├── Models/                        # YOLOv9 model weights (.pt)
│   ├── app.py                         # Main Flask server
│   ├── normal_inference.py            # YOLOv9 normal image prediction
│   ├── thermal_inference.py           # EasyOCR thermal image analysis
│   ├── db.py                          # Database wrapper for app.py
│   └── requirements.txt               # Python dependencies
│
├── Database/                          # SQLite database logic
│   ├── Database.py                    # DB schema & CRUD functions
│   ├── db.py                          # Wrapper to expose functions
│   └── Schema.sql                     # SQL schema
│
├── Frontend/                          # React + Vite frontend
│   ├── src/                           # React components & pages
│   ├── api/                           # API helpers
│   ├── guidelines/                    # UI guidelines
│   ├── index.html                     # Entry HTML
│   ├── package.json                   # Node dependencies
│   └── vite.config.ts                 # Vite config
│
├── notebooks/                         # Training notebooks
│   ├── normal/                        # Normal image training
│   └── thermal/                       # Thermal image training
│
├── .venv/                             # Python virtual environment
├── .gitignore
└── README.md
```

---

## Prerequisites

### Backend
- Python 3.10 – 3.14 (tested on 3.14)
- pip

### Frontend
- Node.js 18+ with npm

---

## Project Setup

### 1. Clone the repo
```bash
git clone <your-repo-url>
cd SolarOps
```

### 2. Backend Setup

**Option A — Use the existing virtual environment (`.venv`)**
```bash
# On Windows PowerShell
.\.venv\Scripts\activate

# On Windows CMD
.venv\Scripts\activate.bat

# On macOS/Linux
source .venv/bin/activate

cd backend
```

**Option B — Create a new virtual environment**
```bash
python -m venv .venv

# Activate it (Windows PowerShell)
.\.venv\Scripts\activate

cd backend
pip install -r requirements.txt
```

> **Note:** The first time you run the backend, EasyOCR will automatically download its language model weights (~100 MB). This is normal and only happens once.

### 3. Frontend Setup

```bash
cd Frontend

# Install dependencies (only needed once)
# The project uses pnpm — if you don't have it, install via: npm install -g pnpm
pnpm install

# If pnpm is not available, npm works too:
npm install
```

---

## How to Run

You need ** TWO terminals** running simultaneously.

### Terminal 1 — Backend (Flask API)
```bash
cd backend
python app.py
```

You should see:
```
Normal model loaded successfully
 * Serving Flask app 'app'
 * Running on http://127.0.0.1:5000
```

### Terminal 2 — Frontend (Vite Dev Server)
```bash
cd Frontend
pnpm dev
```

If `pnpm dev` fails with "vite is not recognized", run Vite directly:
```bash
cd Frontend
node node_modules/vite/bin/vite.js
```

You should see:
```
VITE v6.3.5  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### Open the App
Open your browser and go to **http://localhost:5173**

The backend runs on port `5000` and the frontend on port `5173`. They communicate automatically via CORS.

---

## Usage Flow

1. **Sign up / Log in** — create an account or log in with your email
2. **Panel Farm View** — click **Generate Farm** to create a grid of solar panels (all start gray/unanalyzed)
3. **Upload** — select an Area, Row, and Column, enter a Panel ID, and upload both a **Normal (RGB)** and **Thermal** image
4. **Run AI Analysis** — the images are sent to the backend where:
   - YOLOv9 analyzes the normal image for physical defects
   - EasyOCR reads temperature values from the thermal image
5. **View Results** — the specific panel in Farm View updates with its real status color, and the analysis appears in **Panels & Defects** and **History**

### Supported Image Formats
| Type | Extensions |
|------|-----------|
| Normal (RGB) | `.jpg` `.jpeg` `.png` `.bmp` `.tif` `.tiff` `.webp` `.dng` `.mpo` |
| Thermal | `.jpg` `.jpeg` `.png` `.bmp` `.tif` `.tiff` `.webp` |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `ModuleNotFoundError: No module named 'db'` | Make sure `backend/db.py` exists. If not, copy `Database/db.py` to `backend/db.py` |
| `Failed to fetch` when uploading | Check that the backend is running on port 5000 and CORS is not blocked |
| `Unsupported image format` | Upload `.jpg`, `.png`, `.jpeg`, `.bmp`, `.tif`, `.tiff`, `.webp` files — `.rgb` and other raw formats are not supported |
| `OCR Error: too many values to unpack` | This was a version bug. The backend now loads images through OpenCV first to avoid it |
| EasyOCR downloads weights on first run | This is normal — wait for it to finish (~30–60 seconds) |
| Frontend shows blank page | Make sure you ran `pnpm install` (or `npm install`) in the `Frontend/` folder |
| `vite` command not found | Run `node node_modules/vite/bin/vite.js` instead of `npm run dev` |

---

## ⚠️ Important Notes

- `.pt` model files are stored in `backend/Models/` (Git LFS or shared separately if too large)
- The SQLite database (`solar.db`) is created automatically on first backend startup
- `uploads/` folder is created automatically for temporary image storage
- Always run `git pull` before making changes to avoid conflicts

---

## 📎 Resources

- [Ultralytics YOLOv9 Docs](https://docs.ultralytics.com)
- [Roboflow Dataset](https://roboflow.com)
- [Flask Docs](https://flask.palletsprojects.com)
- [Vite Docs](https://vitejs.dev)
