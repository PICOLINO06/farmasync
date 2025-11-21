// server.js (COMPLETO E CORRIGIDO PARA POSTGRESQL)

const express = require('express');
const { Pool } = require('pg'); // <-- MUDANÇA: Sai sqlite3, entra pg
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path'); // <-- NOVO: Para servir arquivos
const multer = require('multer');
const csv = require('csv-parse');
const fs = require('fs');

// <-- MUDANÇA: Usa variáveis de ambiente para produção
const JWT_SECRET = process.env.JWT_SECRET || 'Farma_Sync123';
const port = process.env.PORT || 3000;
const upload = multer({ dest: 'uploads/' });

// --- MIDDLEWARES (Sem alteração) ---
function verificaToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) {
    return res.status(401).json({ error: 'Acesso negado: token não fornecido' });
  }
  jwt.verify(token, JWT_SECRET, (err, usuario) => {
    if (err) {
      return res.status(403).json({ error: 'Acesso proibido: token inválido' });
    }
    req.usuario = usuario;
    next();
  });
}
function checkStockManager(req, res, next) {
  const tipo = req.usuario.tipo;
  if (tipo === 'admin' || tipo === 'farmaceutico') {
    next();
  } else {
    return res.status(403).json({ error: 'Acesso proibido: você não tem permissão para gerenciar o estoque.' });
  }
}
function checkClinicStaff(req, res, next) {
  const tipo = req.usuario.tipo;
  if (tipo === 'admin' || tipo === 'medico') {
    next();
  } else {
    return res.status(403).json({ error: 'Acesso proibido: esta ação é restrita a administradores e médicos.' });
  }
}

const app = express();
app.use(cors());
app.use(express.json());

// --- MUDANÇA: CONEXÃO COM POSTGRESQL ---
// O Render (ou outra plataforma) fornecerá esta URL
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necessário para conexões em produção no Render/Heroku
  }
});

// Teste de conexão
db.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error("ERRO AO CONECTAR AO BANCO DE DADOS:", err.message);
  } else {
    console.log(`Conectado ao PostgreSQL com sucesso em: ${res.rows[0].now}`);
  }
});

// --- NOVO: SERVIR OS ARQUIVOS DO FRONTEND ---
// Instrução: Crie uma pasta 'public' e mova seus arquivos
// (login.html, dashboard.html, style.css, login.js, dashboard.js) para dentro dela.
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// =============================
// ROTA DE IMPORTAÇÃO CSV 
// =============================
app.post('/api/upload-csv', verificaToken, checkStockManager, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  const filePath = req.file.path;
  let inseridosCount = 0; 

  // LER O ARQUIVO COMO TEXTO PRIMEIRO
  fs.readFile(filePath, 'utf8', async (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Erro ao ler arquivo físico." });
    }

    // === CORREÇÃO CRÍTICA: REMOVER BOM E ESPAÇOS INVISÍVEIS ===
    // Remove o caractere BOM (Byte Order Mark) que o Excel/Windows coloca no início
    const cleanData = fileData.replace(/^\uFEFF/, ''); 
    
    // Detecta separador (; ou ,)
    const firstLine = cleanData.split('\n')[0];
    const countSemi = (firstLine.match(/;/g) || []).length;
    const countComma = (firstLine.match(/,/g) || []).length;
    const separator = countSemi > countComma ? ';' : ',';

    console.log(`CSV Upload: Separador detectado [ ${separator} ]`);

    // Transforma o texto limpo em Stream para o csv-parser
    const { Readable } = require('stream'); // Importação interna rápida
    const stream = Readable.from(cleanData);

    const results = [];

    stream
      .pipe(csv({
        separator: separator,
        mapHeaders: ({ header }) => header.trim().toLowerCase() // Força headers minúsculos
      }))
      .on('data', (row) => results.push(row))
      .on('end', async () => {
        
        console.log(`CSV Lido: ${results.length} linhas encontradas.`);
        if(results.length > 0) {
            console.log("Exemplo da primeira linha lida:", results[0]);
        }
        const client = await db.connect();
        try {
          await client.query('BEGIN');
          
          const sql = `
            INSERT INTO medicamentos (nome, quantidade, validade, lote, tipo, formato, vencido)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `;

          for (const row of results) {
            // Como normalizamos os headers no .pipe, agora podemos confiar em 'nome', 'quantidade', etc.
            
            // Validação forçada: converte quantidade para numero para garantir
            const qtd = parseInt(row.quantidade);
            
            if (row.nome && !isNaN(qtd)) {
              await client.query(sql, [
                row.nome,
                qtd,
                row.validade, // Espera formato AAAA-MM-DD
                row.lote || '',
                row.tipo || 'Geral',
                row.formato || 'Unidade',
                row.vencido || 'Não'
              ]);
              inseridosCount++;
            } else {
              console.log("Linha ignorada (dados inválidos ou cabeçalho errado):", row);
            }
          }

          await client.query('COMMIT');
          
          // Remove o arquivo temporário
          try { fs.unlinkSync(filePath); } catch(e) {}

          res.json({ 
            message: `Processamento concluído! ${inseridosCount} medicamentos inseridos.` 
          });

        } catch (dbErr) {
          await client.query('ROLLBACK');
          console.error("Erro de Banco:", dbErr);
          res.status(500).json({ error: 'Erro ao salvar dados no banco.' });
        } finally {
          client.release();
        }
      });
  });
});

// =============================
// ROTAS DE MEDICAMENTOS (ESTOQUE)
// =============================

app.get('/api/medicamentos', verificaToken, async (req, res) => {
  // Busca tudo (o filtro será feito no Front, mas poderia ser aqui via WHERE)
  const sql = "SELECT * FROM medicamentos ORDER BY nome";
  try {
    const result = await db.query(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar medicamentos' });
  }
});

app.post('/api/medicamentos', verificaToken, checkStockManager, async (req, res) => {
  // Recebe os novos campos
  const { nome, quantidade, validade, lote, tipo, formato, vencido } = req.body;
  
  if (!nome || !quantidade || !validade) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  }

  const sql = `
    INSERT INTO medicamentos (nome, quantidade, validade, lote, tipo, formato, vencido)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const params = [nome, quantidade, validade, lote || '', tipo || 'Outros', formato || 'Unidade', vencido || 'Não'];
  
  try {
    const result = await db.query(sql, params);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cadastrar.' });
  }
});

app.put('/api/medicamentos/:id', verificaToken, checkStockManager, async (req, res) => {
  const { id } = req.params;
  const { nome, quantidade, validade, lote, tipo, formato, vencido } = req.body;

  const sql = `
    UPDATE medicamentos 
    SET nome=$1, quantidade=$2, validade=$3, lote=$4, tipo=$5, formato=$6, vencido=$7
    WHERE id=$8
  `;
  const params = [nome, quantidade, validade, lote, tipo, formato, vencido, id];

  try {
    const result = await db.query(sql, params);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Não encontrado' });
    res.json({ message: "Atualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar.' });
  }
});

app.delete('/api/medicamentos/:id', verificaToken, checkStockManager, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM medicamentos WHERE id = $1", [id]);
    res.json({ message: 'Removido.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover.' });
  }
});

// =============================
// ROTAS DE PACIENTES
// =============================

// [GET] /api/pacientes - LISTAR
app.get('/api/pacientes', verificaToken, checkClinicStaff, async (req, res) => {
  const sql = "SELECT * FROM pacientes ORDER BY nome";
  try {
    const result = await db.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao buscar pacientes' });
  }
});

// [POST] /api/pacientes - CADASTRAR
app.post('/api/pacientes', verificaToken, checkClinicStaff, async (req, res) => {
  const { nome, cpf, data_nascimento } = req.body;
  if (!nome) {
    return res.status(400).json({ error: 'O nome do paciente é obrigatório' });
  }
  const sql = `
    INSERT INTO pacientes (nome, cpf, data_nascimento)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const params = [nome, cpf || null, data_nascimento || null];
  try {
    const result = await db.query(sql, params);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.message.includes("unique constraint")) {
      return res.status(409).json({ error: 'Este CPF já está cadastrado.' });
    }
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao cadastrar paciente' });
  }
});

// ===================================
// ROTAS DE PROFISSIONAIS E AUTENTICAÇÃO
// ===================================

// [POST] /api/profissionais - CADASTRAR (Rota pública)
app.post('/api/profissionais', async (req, res) => {
  const { nome, crm_coren, senha, tipo } = req.body;
  const saltRounds = 10;
  if (!nome || !crm_coren || !senha) {
    return res.status(400).json({ error: 'Nome, CRM/Coren e Senha são obrigatórios' });
  }
  try {
    const hashedSenha = await bcrypt.hash(senha, saltRounds);
    const sql = `
      INSERT INTO profissionais (nome, crm_coren, senha, tipo) 
      VALUES ($1, $2, $3, $4)
      RETURNING id, nome, crm_coren, tipo
    `;
    const params = [nome, crm_coren, hashedSenha, tipo || 'farmaceutico'];
    const result = await db.query(sql, params);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.message.includes("unique constraint")) {
      return res.status(409).json({ error: 'Este CRM/Coren já está cadastrado.' });
    }
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao cadastrar profissional' });
  }
});

// [POST] /api/login - AUTENTICAR
app.post('/api/login', async (req, res) => {
  const { crm_coren, senha } = req.body;
  if (!crm_coren || !senha) {
    return res.status(400).json({ error: 'CRM/Coren e Senha são obrigatórios' });
  }
  const sql = "SELECT * FROM profissionais WHERE crm_coren = $1";
  try {
    const result = await db.query(sql, [crm_coren]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profissional não encontrado' });
    }
    const profissional = result.rows[0];
    const isMatch = await bcrypt.compare(senha, profissional.senha);
    if (!isMatch) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }
    const payload = {
      id: profissional.id,
      nome: profissional.nome,
      tipo: profissional.tipo
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    res.json({
      message: 'Login bem-sucedido!',
      token: token,
      usuario: payload
    });
  } catch (err) {
    console.error("Erro no login:", err.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// [GET] /api/profissionais - LISTAR
app.get('/api/profissionais', verificaToken, async (req, res) => {
  if (req.usuario.tipo !== 'admin') {
    return res.status(403).json({ error: 'Acesso proibido: somente administradores.' });
  }
  const sql = "SELECT id, nome, crm_coren, tipo FROM profissionais";
  try {
    const result = await db.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao buscar profissionais' });
  }
});

// [DELETE] /api/profissionais/:id - REMOVER
app.delete('/api/profissionais/:id', verificaToken, async (req, res) => {
  const { id } = req.params;
  const usuarioLogado = req.usuario;
  if (usuarioLogado.tipo !== 'admin') {
    return res.status(403).json({ error: 'Acesso proibido: somente administradores.' });
  }
  if (Number(usuarioLogado.id) === Number(id)) {
    return res.status(400).json({ error: 'Um administrador não pode remover a própria conta.' });
  }
  const sql = "DELETE FROM profissionais WHERE id = $1";
  try {
    const result = await db.query(sql, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Profissional não encontrado com este ID' });
    }
    res.json({ message: 'Profissional removido com sucesso' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao remover profissional' });
  }
});

// [PUT] /api/trocar-senha - TROCAR A PRÓPRIA SENHA
app.put('/api/trocar-senha', verificaToken, async (req, res) => {
  const { id: idUsuarioLogado } = req.usuario;
  const { senhaAntiga, senhaNova } = req.body;
  const saltRounds = 10;
  if (!senhaAntiga || !senhaNova) {
    return res.status(400).json({ error: 'Senha antiga e nova senha são obrigatórias' });
  }
  try {
    const sqlSelect = "SELECT * FROM profissionais WHERE id = $1";
    const resultSelect = await db.query(sqlSelect, [idUsuarioLogado]);
    if (resultSelect.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const profissional = resultSelect.rows[0];
    const isMatch = await bcrypt.compare(senhaAntiga, profissional.senha);
    if (!isMatch) {
      return res.status(401).json({ error: 'Senha antiga incorreta' });
    }
    const hashedNovaSenha = await bcrypt.hash(senhaNova, saltRounds);
    const sqlUpdate = "UPDATE profissionais SET senha = $1 WHERE id = $2";
    await db.query(sqlUpdate, [hashedNovaSenha, idUsuarioLogado]);
    res.json({ message: 'Senha alterada com sucesso!' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao processar troca de senha' });
  }
});

// [POST] /api/prescricoes - SALVAR PRESCRIÇÃO
app.post('/api/prescricoes', verificaToken, checkClinicStaff, async (req, res) => {
  const { paciente_id, itens } = req.body;
  const medico_id = req.usuario.id;
  const data_emissao = new Date().toISOString().split('T')[0];
  if (!paciente_id || !itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ error: "Dados da prescrição inválidos. Paciente e ao menos um item são obrigatórios." });
  }
  
  // --- MUDANÇA: LÓGICA DE TRANSAÇÃO do PostgreSQL ---
  const client = await db.connect(); // Pega um cliente do pool
  
  try {
    await client.query('BEGIN'); // Inicia a transação
    
    // 1. Insere a "capa" da prescrição
    const sqlPrescricao = `
      INSERT INTO prescricoes (paciente_id, medico_id, data_emissao) 
      VALUES ($1, $2, $3)
      RETURNING id
    `;
    const prescricaoResult = await client.query(sqlPrescricao, [paciente_id, medico_id, data_emissao]);
    const prescricao_id = prescricaoResult.rows[0].id;
    
    // 2. Insere os itens
    const sqlItem = `
      INSERT INTO prescricao_itens (prescricao_id, medicamento_id, dosagem) 
      VALUES ($1, $2, $3)
    `;
    
    // Cria um array de "promessas" para inserir todos os itens
    const itemPromises = itens.map(item => {
      if (!item.medicamento_id || !item.dosagem) {
        throw new Error("Cada item da prescrição deve ter 'medicamento_id' e 'dosagem'.");
      }
      return client.query(sqlItem, [prescricao_id, item.medicamento_id, item.dosagem]);
    });
    
    await Promise.all(itemPromises); // Espera todas as inserções terminarem
    
    await client.query('COMMIT'); // Finaliza a transação
    
    res.status(201).json({
      message: "Prescrição salva com sucesso!",
      prescricao_id: prescricao_id
    });
    
  } catch (err) {
    await client.query('ROLLBACK'); // Desfaz tudo em caso de erro
    console.error("Erro na transação de prescrição:", err.message);
    res.status(500).json({ error: "Erro ao salvar prescrição", details: err.message });
  } finally {
    client.release(); // Libera o cliente de volta para o pool
  }
});

// --- ROTA DE PARTIDA ---
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);

});



