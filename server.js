const express = require('express')
const mysql = require('mysql2')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cors = require('cors')
require('dotenv').config()

const app = express()

app.use(cors())
app.use(express.json())

// Conexão com MySQL
const db = mysql.createConnection({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
})

db.connect((err) => {
    if (err) {
        console.log('Erro ao conectar:', err)
    } else {
        console.log('Conectado ao MySQL!')
    }
})

// ------------------ ROTAS CRUD ------------------

// Listar todos os jogadores
app.get('/players', (req, res) => {
    db.query('SELECT * FROM players', (err, results) => {
        if (err) return res.status(500).send(err)
        res.json(results)
    })
})

// Inserir novo jogador
app.post('/players', (req, res) => {
    const { name, score } = req.body
    db.query('INSERT INTO players (name, score) VALUES (?, ?)', [name, score], (err, result) => {
        if (err) return res.status(500).send(err)
        res.json({ id: result.insertId, name, score })
    })
})

// Atualizar jogador por ID
app.put('/players/:id', (req, res) => {
    const { id } = req.params
    const { name, score } = req.body
    db.query('UPDATE players SET name = ?, score = ? WHERE id = ?', [name, score, id], (err) => {
        if (err) return res.status(500).send(err)
        res.json({ id, name, score })
    })
})

// Deletar jogador por ID
app.delete('/players/:id', (req, res) => {
    const { id } = req.params
    db.query('DELETE FROM players WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).send(err)
        res.json({ message: `Jogador ${id} deletado` })
    })
})

app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body

    try {
        const hashedPassword = await bcrypt.hash(password, 10)

        db.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword], (err, result) => {
            if (err) {
                console.log(err)
                return res.status(500).json({ error: err.message })
            }

            const token = jwt.sign({ id: result.insertId }, process.env.JWT_SECRET || 'SECRET', { expiresIn: '1d' })

            res.json({ token })
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Erro no servidor' })
    }
})

app.post('/login', (req, res) => {
    const { email, password } = req.body

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Erro no servidor' })

        if (results.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' })
        }

        const user = results[0]

        const valid = await bcrypt.compare(password, user.password)

        if (!valid) {
            return res.status(401).json({ error: 'Senha inválida' })
        }

        const token = jwt.sign({ id: user.id }, 'SECRET', {
            expiresIn: '1d',
        })

        res.json({ token })
    })
})

// ------------------ INICIAR SERVIDOR ------------------
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log('Servidor rodando')
})
