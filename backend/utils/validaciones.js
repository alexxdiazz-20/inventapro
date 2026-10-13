// Validaciones compartidas entre rutas (el frontend valida también,
// pero el backend es la fuente de verdad: nunca confiar en el cliente).

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizarEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function esEmailValido(email) {
  return typeof email === 'string' && email.length <= 150 && EMAIL_REGEX.test(email);
}

// Devuelve null si la contraseña es válida, o un mensaje de error.
function validarPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (password.length > 72) {
    return 'La contraseña no puede tener más de 72 caracteres.';
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'La contraseña debe tener al menos una letra y un número.';
  }
  return null;
}

function validarNombre(nombre) {
  const n = String(nombre || '').trim();
  if (n.length < 2) return 'El nombre debe tener al menos 2 caracteres.';
  if (n.length > 100) return 'El nombre no puede pasar de 100 caracteres.';
  return null;
}

module.exports = { normalizarEmail, esEmailValido, validarPassword, validarNombre };
