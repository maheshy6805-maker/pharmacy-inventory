// swagger.js
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const path = require("path");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Pharmalogy API documentation",
      version: "1.0.0",
      description: "Swagger documentation for all APIs in Pharmalogy",
    },
    servers: [
      {
        url: "http://localhost:5000", // ✅ match your console log port
        description: "Local server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  // ✅ Use absolute paths
  apis: [
    path.join(__dirname, "./routes/*.js"),
    path.join(__dirname, "./models/*.js"),
  ],
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = { swaggerSpec, swaggerUi };
