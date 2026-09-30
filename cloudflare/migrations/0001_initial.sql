CREATE TABLE IF NOT EXISTS mural_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    likes INTEGER NOT NULL DEFAULT 0,
    time TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS health_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    UNIQUE(name, address)
);

INSERT INTO mural_messages (text, likes, time) VALUES
    ('Você merece ser ouvido. Procure alguém de confiança.', 14, 'Mensagem de apoio'),
    ('Pedir ajuda é um passo importante. Você não precisa passar por isso sozinho.', 29, 'Mensagem de apoio'),
    ('Um dia de cada vez. Sua vida importa.', 8, 'Mensagem de apoio');