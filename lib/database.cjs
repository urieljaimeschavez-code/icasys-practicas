const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, randomBytes, scryptSync } = require('node:crypto');

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
function openDatabase(directory, bootstrap = true) {
  fs.mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(path.join(directory, 'icasys.sqlite'));
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  db.exec('PRAGMA busy_timeout = 5000');
  if (bootstrap && !db.prepare('SELECT id FROM users LIMIT 1').get()) {
    const credentials = [];
    db.exec('BEGIN IMMEDIATE');
    try {
      const insert = db.prepare('INSERT INTO users(id,name,email,role,password_hash) VALUES(?,?,?,?,?)');
      for (const [id, name, email, role] of [
        ['u-admin', 'Coordinación ICASYS', 'admin@icasys.local', 'admin'],
        ['u-advisor', 'Laura Martínez', 'asesor@icasys.local', 'advisor'],
        ['u-student', 'Uriel', 'practicante@icasys.local', 'student']
      ]) {
        const password = randomBytes(12).toString('base64url') + 'aA9!';
        insert.run(id, name, email, role, hashPassword(password));
        credentials.push(`${role}: ${email}\nContraseña temporal: ${password}`);
      }
      db.prepare('INSERT INTO placements(id,student_id,advisor_id,school,project,start,end,target) VALUES(?,?,?,?,?,?,?,?)')
        .run('p1','u-student','u-advisor','Institución por confirmar','Módulo de prácticas profesionales','2026-09-01','2026-12-18',480);
      // Only bootstrap credentials are written locally; never served over HTTP.
      fs.writeFileSync(path.join(directory, 'accesos-iniciales.txt'),
        'ICASYS · Accesos iniciales de evaluación\n\n' + credentials.join('\n\n') +
        '\n\nDebes cambiar cada contraseña al ingresar. Guarda este archivo de forma privada y retíralo después de configurar las cuentas.\n', { mode: 0o600 });
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  return db;
}
function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const result = fn(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
module.exports = { openDatabase, hashPassword, transaction, id: randomUUID };
