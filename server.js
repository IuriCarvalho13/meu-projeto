require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const knexLib = require('knex');

const app = express();
app.use(cors());
app.use(express.json());

// Configuração knex
const knex = knexLib({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  }
});

// Servir arquivos estáticos da pasta "public"
app.use(express.static(path.join(__dirname, 'public')));

// Quando acessar http://localhost:3000, abrir login.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Rota para buscar funcionários, com filtro opcional
app.get('/funcionarios', async (req, res) => {
  try {
    const search = req.query.search || '';
    let query = knex('funcionarios')
      .select(
        'id', 
        'nome', 
        'cargo', 
        'email', 
        'cpf', 
        knex.raw("DATE_FORMAT(data_nascimento, '%Y-%m-%d') AS dataNascimento"), 
        'telefone'
      );

    if (search) {
      query = query.whereRaw('LOWER(nome) LIKE ?', [`%${search.toLowerCase()}%`]);
    }

    const funcionarios = await query;
    res.json({ success: true, funcionarios });
  } catch (err) {
    console.error('Erro ao buscar funcionários:', err);
    res.status(500).json({ success: false, message: 'Erro ao buscar funcionários' });
  }
});

// Rota para adicionar funcionário
app.post('/funcionarios', async (req, res) => {
  try {
    const { nome, cargo, email, cpf, dataNascimento, telefone } = req.body;
    await knex('funcionarios').insert({
      nome,
      cargo,
      email,
      cpf,
      data_nascimento: dataNascimento,
      telefone
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao adicionar funcionário:', err);
    res.status(500).json({ success: false, message: 'Erro ao adicionar funcionário' });
  }
});

// Rota para atualizar funcionário
app.put('/funcionarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dados = {};

    // Só adiciona os campos que existem no corpo da requisição
    ['nome', 'cargo', 'email', 'cpf', 'dataNascimento', 'telefone'].forEach(field => {
      if (req.body[field]) {
        dados[field === 'dataNascimento' ? 'data_nascimento' : field] = req.body[field];
      }
    });

    if (Object.keys(dados).length === 0) {
      return res.status(400).json({ success: false, message: 'Nenhum dado para atualizar' });
    }

    const affectedRows = await knex('funcionarios').where({ id }).update(dados);

    if (affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Funcionário não encontrado' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar funcionário:', err);
    res.status(500).json({ success: false, message: 'Erro ao atualizar funcionário' });
  }
});

// Rota para excluir funcionário
app.delete('/funcionarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const affectedRows = await knex('funcionarios').where({ id }).del();

    if (affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Funcionário não encontrado' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir funcionário:', err);
    res.status(500).json({ success: false, message: 'Erro ao excluir funcionário' });
  }
});

// Registro de usuário
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    await knex('usuarios').insert({ username, password: hashedPassword });
    res.json({ success: true, message: 'Usuário registrado com sucesso!' });
  } catch (err) {
    console.error('Erro ao registrar usuário:', err);
    res.status(500).json({ success: false, message: 'Erro ao registrar usuário' });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = await knex('usuarios').where({ username }).select('*');

    if (users.length === 0) {
      return res.json({ success: false, message: 'Usuário não encontrado' });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (passwordMatch) {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: 'Senha incorreta' });
    }
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});