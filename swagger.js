const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'BandMates API',
    version: '1.0.0',
    description: 'API per la piattaforma BandMates',
  },
  servers: [
    {
      url: 'http://localhost:3000', // URL base
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./api.js'], // Percorso corretto per il file delle API
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec,
};
