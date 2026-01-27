/**
 * OpenAPI 3.1 specification for TIREApp API
 * Serves as both documentation and contract for API consumers
 */

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'TIREApp API',
    description: 'API for managing TIRE (Tolerate, Invest, Retire, Eliminate) application assessments',
    version: '1.0.0',
  },
  servers: [
    { url: '/api', description: 'Current server' },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        description: 'Returns service health status including database connectivity',
        operationId: 'getHealth',
        tags: ['System'],
        security: [],
        responses: {
          200: {
            description: 'Service is healthy',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } },
          },
          503: { description: 'Service is degraded' },
        },
      },
    },
    '/customers': {
      get: {
        summary: 'List customers',
        operationId: 'listCustomers',
        tags: ['Customers'],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Filter by name (case-insensitive)' },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['name', 'createdAt'] }, description: 'Sort field' },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] }, description: 'Sort direction' },
        ],
        responses: {
          200: {
            description: 'List of customers',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Customer' } } } },
            headers: {
              ETag: { schema: { type: 'string' }, description: 'Entity tag for conditional requests' },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
      post: {
        summary: 'Create a customer',
        operationId: 'createCustomer',
        tags: ['Customers'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCustomer' } } },
        },
        responses: {
          201: { description: 'Customer created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Customer' } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/applications': {
      get: {
        summary: 'List applications (paginated)',
        operationId: 'listApplications',
        tags: ['Applications'],
        parameters: [
          { name: 'customerId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['name', 'createdAt', 'status'] } },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Paginated list of applications',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedApplications' } } },
            headers: { ETag: { schema: { type: 'string' } } },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
      post: {
        summary: 'Create application(s)',
        operationId: 'createApplications',
        tags: ['Applications'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  { $ref: '#/components/schemas/CreateApplication' },
                  { $ref: '#/components/schemas/BatchCreateApplications' },
                ],
              },
            },
          },
        },
        responses: {
          201: { description: 'Application(s) created' },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/applications/{id}': {
      get: {
        summary: 'Get application details',
        operationId: 'getApplication',
        tags: ['Applications'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: {
            description: 'Application with questionnaires and history',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApplicationDetail' } } },
            headers: { ETag: { schema: { type: 'string' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { description: 'Application not found' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
      patch: {
        summary: 'Update application',
        operationId: 'updateApplication',
        tags: ['Applications'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateApplication' } } },
        },
        responses: {
          200: { description: 'Updated application' },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { description: 'Application not found' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
      delete: {
        summary: 'Delete application',
        operationId: 'deleteApplication',
        tags: ['Applications'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Application deleted' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { description: 'Application not found' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/questionnaires': {
      get: {
        summary: 'Get questionnaire answers',
        operationId: 'getQuestionnaires',
        tags: ['Questionnaires'],
        parameters: [
          { name: 'applicationId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['app_questions', 'strategy_questions'] } },
        ],
        responses: {
          200: {
            description: 'Questionnaire answers',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Questionnaire' } } } },
            headers: { ETag: { schema: { type: 'string' } } },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
      post: {
        summary: 'Save questionnaire answers',
        operationId: 'saveQuestionnaire',
        tags: ['Questionnaires'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SaveQuestionnaire' } } },
        },
        responses: {
          201: { description: 'Questionnaire saved (with optional TIRE placement result)' },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/thresholds': {
      get: {
        summary: 'Get TIRE thresholds',
        operationId: 'getThresholds',
        tags: ['Admin'],
        responses: {
          200: {
            description: 'Threshold configuration',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Thresholds' } } },
            headers: { ETag: { schema: { type: 'string' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
      put: {
        summary: 'Update thresholds (admin only)',
        operationId: 'updateThresholds',
        tags: ['Admin'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateThresholds' } } },
        },
        responses: {
          200: { description: 'Thresholds updated' },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/users': {
      get: {
        summary: 'List users (admin only)',
        operationId: 'listUsers',
        tags: ['Admin'],
        responses: {
          200: {
            description: 'List of users',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } },
            headers: { ETag: { schema: { type: 'string' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
      patch: {
        summary: 'Update user role (admin only)',
        operationId: 'updateUserRole',
        tags: ['Admin'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateUserRole' } } },
        },
        responses: {
          200: { description: 'User role updated' },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/upload': {
      post: {
        summary: 'Upload Excel file with applications',
        operationId: 'uploadExcel',
        tags: ['Import/Export'],
        requestBody: {
          required: true,
          content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } },
        },
        responses: {
          200: { description: 'Upload result', content: { 'application/json': { schema: { $ref: '#/components/schemas/UploadResponse' } } } },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/export': {
      get: {
        summary: 'Export assessment data as Excel',
        operationId: 'exportExcel',
        tags: ['Import/Export'],
        parameters: [
          { name: 'customerId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Excel file download',
            content: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { schema: { type: 'string', format: 'binary' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      session: {
        type: 'apiKey',
        in: 'cookie',
        name: 'authjs.session-token',
        description: 'Auth.js session cookie (Microsoft Entra ID)',
      },
    },
    schemas: {
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'degraded'] },
          timestamp: { type: 'string', format: 'date-time' },
          database: { type: 'string', enum: ['connected', 'disconnected', 'unknown'] },
          uptime: { type: 'number', description: 'Process uptime in seconds' },
        },
        required: ['status', 'timestamp', 'database', 'uptime'],
      },
      Customer: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', maxLength: 500 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          _count: { type: 'object', properties: { applications: { type: 'integer' } } },
        },
        required: ['id', 'name', 'createdAt', 'updatedAt'],
      },
      CreateCustomer: {
        type: 'object',
        properties: { name: { type: 'string', minLength: 1, maxLength: 500 } },
        required: ['name'],
      },
      Application: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          customerId: { type: 'string', format: 'uuid' },
          assessmentScope: { type: 'string' },
          status: { type: 'string' },
          initialTirePlacement: { type: 'string', nullable: true },
          confirmedTirePlacement: { type: 'string', nullable: true },
          appQuestionsCompleted: { type: 'boolean' },
          strategyCompleted: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'name', 'customerId', 'assessmentScope', 'status'],
      },
      ApplicationDetail: {
        allOf: [
          { $ref: '#/components/schemas/Application' },
          {
            type: 'object',
            properties: {
              questionnaires: { type: 'array', items: { $ref: '#/components/schemas/Questionnaire' } },
              customer: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } },
            },
          },
        ],
      },
      CreateApplication: {
        type: 'object',
        properties: {
          customerId: { type: 'string', format: 'uuid' },
          name: { type: 'string', minLength: 1, maxLength: 500 },
          assessmentScope: { type: 'string' },
        },
        required: ['customerId', 'name'],
      },
      BatchCreateApplications: {
        type: 'object',
        properties: {
          customerId: { type: 'string', format: 'uuid' },
          applications: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } },
        },
        required: ['customerId', 'applications'],
      },
      UpdateApplication: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          assessmentScope: { type: 'string' },
          status: { type: 'string' },
        },
      },
      PaginatedApplications: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Application' } },
          pagination: { $ref: '#/components/schemas/Pagination' },
        },
        required: ['data', 'pagination'],
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
        required: ['page', 'limit', 'total', 'totalPages'],
      },
      Questionnaire: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          applicationId: { type: 'string', format: 'uuid' },
          type: { type: 'string', enum: ['app_questions', 'strategy_questions'] },
          answers: {},
          summary: { nullable: true },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'applicationId', 'type'],
      },
      SaveQuestionnaire: {
        type: 'object',
        properties: {
          applicationId: { type: 'string', format: 'uuid' },
          type: { type: 'string', enum: ['app_questions', 'strategy_questions'] },
          answers: {},
          completed: { type: 'boolean' },
        },
        required: ['applicationId', 'type', 'answers'],
      },
      Thresholds: {
        type: 'object',
        properties: {
          distributionThreshold: { type: 'number', minimum: 0, maximum: 100 },
          tiebreakThreshold: { type: 'number', minimum: 0, maximum: 100 },
        },
      },
      UpdateThresholds: {
        type: 'object',
        properties: {
          distributionThreshold: { type: 'number', minimum: 0, maximum: 100 },
          tiebreakThreshold: { type: 'number', minimum: 0, maximum: 100 },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', nullable: true },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['Admin', 'Consultant', 'Viewer'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'email', 'role'],
      },
      UpdateUserRole: {
        type: 'object',
        properties: {
          userId: { type: 'string', format: 'uuid' },
          role: { type: 'string', enum: ['Admin', 'Consultant', 'Viewer'] },
        },
        required: ['userId', 'role'],
      },
      UploadResponse: {
        type: 'object',
        properties: {
          created: { type: 'integer' },
          total: { type: 'integer' },
          duplicatesRemoved: { type: 'integer' },
          warnings: { type: 'array', items: { type: 'string' } },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          code: { type: 'string' },
          details: { type: 'array', items: { type: 'string' } },
        },
        required: ['error'],
      },
    },
    responses: {
      Unauthorized: {
        description: 'Authentication required',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
      },
      Forbidden: {
        description: 'Insufficient permissions (admin required)',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
      },
      ValidationError: {
        description: 'Request validation failed',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
      },
      RateLimited: {
        description: 'Rate limit exceeded',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
      },
    },
  },
  security: [{ session: [] }],
  tags: [
    { name: 'System', description: 'Health check and system status' },
    { name: 'Customers', description: 'Customer management' },
    { name: 'Applications', description: 'Application CRUD and assessment management' },
    { name: 'Questionnaires', description: 'App Questions and Strategy Questions' },
    { name: 'Admin', description: 'Thresholds and user management (admin only)' },
    { name: 'Import/Export', description: 'Excel import and export' },
  ],
}
