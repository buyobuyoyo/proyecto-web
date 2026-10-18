// Configuración del entorno de desarrollo. Los servicios la importan para saber a dónde llamar.
export const environment = {
  production: false,
  // URL del backend (backend/server.js). Todos los servicios la usan como base.
  apiUrl: 'http://localhost:3200/api',
};
