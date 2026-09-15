const validarContraseña = (password) => {
    if (password.length < 8) {

        return { valido: false, error: 'La contraseña debe de tener mínimo 6 caracteres' };

    } else if (password.length > 50) {

        return { valido: false, error: 'La contraseña no debe de tener más de 50 caracteres' };

    } else if (!/[A-Z]/.test(password)) {

        return { valido: false, error: 'La contraseña debe de tener al menos una letra mayúscula' };

    } else if (!/[0-9]/.test(password)) {

        return { valido: false, error: 'La contraseña debe de tener al menos un número' };

    } else if (!/[^A-Za-z0-9]/.test(password)) {

        return { valido: false, error: 'La contraseña debe de tener al menos un carácter especial (#$%&*^)' };

    }
    return { valido: true, error: null };
};

module.exports = {validarContraseña};