# gibrig

## Prerequisites (Node.js)
Proyek ini membutuhkan **Node.js** agar `npm install` / `yarn install` bisa berjalan.

1. Install **Node.js LTS** (pastikan centang **Add to PATH**)
2. Restart terminal/VSCode
3. Verifikasi:
   - `node -v`
   - `npm -v`
   - `yarn -v` (jika belum ada yarn, jalankan `npm i -g yarn`)

## Frontend
Masuk ke folder frontend:

```bash
cd frontend
```

Install dependencies:

- Dengan Yarn (disarankan sesuai `package.json`):
  ```bash
yarn install
  ```

- Dengan npm:
  ```bash
npm install
  ```

Jalankan development server:

```bash
yarn start
# atau
npm start
```

## Backend
Masuk ke folder backend:

```bash
cd backend
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Jalankan server:

```bash
python server.py
```

