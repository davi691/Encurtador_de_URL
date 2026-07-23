// Servidor mínimo para o encurtador funcionar de verdade no seu domínio.
// Guarda os links em um arquivo JSON (troque por um banco de dados real
// se for usar em produção com muito tráfego).
//
// Instalar:  npm install express
// Rodar:     node server.js
// Testar:    http://localhost:3000

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "links.json");
const CODE_CHARS = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

app.use(express.json());
app.use(express.static(path.join(__dirname))); // serve index.html, style.css, script.js

// ---------- "banco de dados" em arquivo ----------
function readDB() {
  if (!fs.existsSync(DB_FILE)) return {};
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function generateCode(existing, length = 6) {
  let code;
  do {
    code = Array.from({ length }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join("");
  } while (existing[code]);
  return code;
}

// ---------- API ----------

// Cria um link curto novo
app.post("/api/shorten", (req, res) => {
  const { url, slug } = req.body;

  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: "Envie uma URL válida começando com http:// ou https://" });
  }

  const db = readDB();
  let code = slug ? slug.trim() : null;

  if (code) {
    if (!/^[a-zA-Z0-9-_]+$/.test(code)) {
      return res.status(400).json({ error: "O apelido só pode ter letras, números, - e _" });
    }
    if (db[code]) {
      return res.status(409).json({ error: "Esse apelido já está em uso" });
    }
  } else {
    code = generateCode(db);
  }

  db[code] = {
    original: url,
    createdAt: new Date().toISOString(),
    clicks: 0,
  };
  writeDB(db);

  res.json({ code, short: `${req.protocol}://${req.get("host")}/${code}` });
});

// Lista todos os links (para um painel simples, se quiser expandir)
app.get("/api/links", (_req, res) => {
  res.json(readDB());
});

// Remove um link
app.delete("/api/links/:code", (req, res) => {
  const db = readDB();
  if (!db[req.params.code]) {
    return res.status(404).json({ error: "Link não encontrado" });
  }
  delete db[req.params.code];
  writeDB(db);
  res.json({ ok: true });
});

// Redireciona: precisa vir DEPOIS das rotas /api e ANTES do fallback estático
app.get("/:code", (req, res, next) => {
  const db = readDB();
  const entry = db[req.params.code];

  if (!entry) return next(); // deixa cair no 404 padrão / index

  entry.clicks += 1;
  writeDB(db);
  res.redirect(302, entry.original);
});

app.listen(PORT, () => {
  console.log(`Encurtador rodando em http://localhost:${PORT}`);
});
