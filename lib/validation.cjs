function fail(message, status = 422) { throw Object.assign(new Error(message), { status }); }
function text(value, label, min = 1, max = 150) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) fail(`${label}: debe contener entre ${min} y ${max} caracteres.`);
  return value.trim();
}
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value + 'T12:00:00Z')) || new Date(value + 'T12:00:00Z').toISOString().slice(0,10) !== value) fail('La fecha no es válida.');
  return value;
}
function number(value, min, max, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || value * 2 % 1) fail(`${label}: usa incrementos de 0.5 entre ${min} y ${max}.`);
  return value;
}
function email(value) { const v = text(value,'Correo',5,180).toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) fail('El correo no es válido.'); return v; }
function password(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128 || !/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) fail('La contraseña debe tener entre 12 y 128 caracteres e incluir mayúscula, minúscula y número.');
  return value;
}
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
module.exports = { fail, text, date, number, email, password, today };
