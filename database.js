// Este é um SCRIPT DE SETUP, rode ele uma vez com 'node database.js'

// 1. Importa as bibliotecas
const { Pool } = require('pg');
require('dotenv').config(); // Carrega as variáveis do arquivo .env

// 2. Pega a URL de conexão do arquivo .env
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("ERRO: A variável de ambiente DATABASE_URL não foi definida.");
  console.log("Por favor, crie um arquivo .env e adicione sua URL de conexão do PostgreSQL.");
  process.exit(1);
}

const db = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

// 3. Define as queries para criar as tabelas (com sintaxe PostgreSQL)
const createTablesQueries = [
  `
    CREATE TABLE IF NOT EXISTS profissionais (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      quantidade INTEGER NOT NULL,
      validade TEXT NOT NULL,
      lote TEXT,
      tipo TEXT, 
      formato TEXT, 
      vencido TEXT DEFAULT 'Não'
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS medicamentos (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      quantidade INTEGER NOT NULL,
      validade TEXT NOT NULL,
      vencido TEXT DEFAULT 'Não'
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS pacientes (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      cpf TEXT UNIQUE,
      data_nascimento TEXT
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS prescricoes (
      id SERIAL PRIMARY KEY,
      paciente_id INTEGER NOT NULL,
      medico_id INTEGER NOT NULL,
      data_emissao TEXT NOT NULL,
      FOREIGN KEY (paciente_id) REFERENCES pacientes (id),
      FOREIGN KEY (medico_id) REFERENCES profissionais (id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS prescricao_itens (
      id SERIAL PRIMARY KEY,
      prescricao_id INTEGER NOT NULL,
      medicamento_id INTEGER NOT NULL,
      dosagem TEXT NOT NULL,
      quantidade INTEGER,
      FOREIGN KEY (prescricao_id) REFERENCES prescricoes (id) ON DELETE CASCADE,
      FOREIGN KEY (medicamento_id) REFERENCES medicamentos (id)
    )
  `
];

// 4. Função assíncrona para rodar o setup
async function setupDatabase() {
  console.log("Conectando ao banco de dados...");
  try {
    // Roda cada query de criação de tabela, uma por uma
    for (const query of createTablesQueries) {
      await db.query(query);
      // Pega o nome da tabela da query para o log
      const tableName = query.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
      console.log(`Tabela '${tableName}' criada ou já existe.`);
    }
    
    console.log("\nSetup do banco de dados concluído com sucesso!");
    
  } catch (err) {
    console.error("\nERRO DURANTE O SETUP DO BANCO:", err.message);
  } finally {
    // Fecha a conexão
    await db.end();
    console.log("Conexão com o banco fechada.");
  }
}

// 5. Roda a função
setupDatabase();