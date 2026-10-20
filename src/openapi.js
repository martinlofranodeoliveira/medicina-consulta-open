export function createOpenApiDocument() {
  const idParam = () => ({
    name: 'id',
    in: 'path',
    required: true,
    description: 'Appointment identifier matching the current router pattern.',
    schema: { type: 'string', pattern: '^[a-f0-9-]{36}$' }
  });
  const errorResponse = (description) => ({
    description,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' }
      }
    }
  });
  const inputStartsAt = () => ({
    type: 'string',
    format: 'date-time',
    pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:00(?:\\.000)?(?:Z|[+-]\\d{2}:\\d{2})$',
    description: 'Valid calendar date with explicit timezone (Z or +-HH:MM), 15-minute grid required both local and in normalized UTC, input and normalized UTC year must stay 0000..9999. Regex alone does not enforce those semantic rules.'
  });
  const durationMinutes = () => ({
    type: 'integer',
    minimum: 15,
    maximum: 120,
    multipleOf: 15,
    description: 'Length in minutes; integer multiple of 15 between 15 and 120.'
  });
  return {
    openapi: '3.1.1',
    info: {
      title: 'Medicina Consulta Open',
      version: '0.1.0',
      description: 'Local prototype of the synthetic scheduling API. Contains synthetic data only. No authentication or authorization and no production suitability; local demo only, do not expose beyond loopback.',
      license: { name: 'ISC' }
    },
    servers: [
      {
        url: 'http://127.0.0.1:3334',
        description: 'Default local loopback port 3334; the demo listens only on 127.0.0.1 and uses this port unless configured otherwise locally.'
      }
    ],
    security: [],
    paths: {
      '/': {
        get: {
          operationId: 'getRoot',
          summary: 'Service info',
          description: 'Returns local service info.',
          'x-body-limit-bytes': 8192,
          responses: {
            200: {
              description: 'Service info.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['name', 'version', 'mode', 'warning', 'routes'],
                    properties: {
                      name: { type: 'string', example: 'Medicina Consulta Open' },
                      version: { type: 'string', example: '0.1.0' },
                      mode: { type: 'string', example: 'local-demo' },
                      warning: { type: 'string', example: 'Somente dados sintéticos. Sem autenticação ou prontuário.' },
                      routes: { type: 'array', items: { type: 'string' }, example: ['/health', '/api/practitioners', '/api/appointments'] }
                    }
                  }
                }
              }
            },
            403: errorResponse('Forbidden host or origin.'),
            500: errorResponse('Internal error.')
          }
        }
      },
      '/health': {
        get: {
          operationId: 'getHealth',
          summary: 'Health check',
          description: 'Returns server health.',
          'x-body-limit-bytes': 8192,
          responses: {
            200: {
              description: 'Server is healthy.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['status'],
                    properties: {
                      status: { type: 'string', enum: ['ok'] }
                    }
                  }
                }
              }
            },
            403: errorResponse('Forbidden host or origin.'),
            500: errorResponse('Internal error.')
          }
        }
      },
      '/api/practitioners': {
        get: {
          operationId: 'listPractitioners',
          summary: 'List practitioners',
          description: 'Returns the synthetic practitioner catalog.',
          'x-body-limit-bytes': 8192,
          responses: {
            200: {
              description: 'Synthetic catalog.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['data'],
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Practitioner' } }
                    }
                  }
                }
              }
            },
            403: errorResponse('Forbidden host or origin.'),
            500: errorResponse('Internal error.')
          }
        }
      },
      '/api/appointments': {
        get: {
          operationId: 'listAppointments',
          summary: 'List appointments',
          description: 'Lists appointments ordered by start; optional filters.',
          'x-body-limit-bytes': 8192,
          parameters: [
            {
              name: 'date',
              in: 'query',
              required: false,
              description: 'Filter by UTC day in YYYY-MM-DD format; matches the UTC day of startsAt.',
              schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
            },
            {
              name: 'practitionerId',
              in: 'query',
              required: false,
              description: 'Filter by catalog practitioner ID.',
              schema: { type: 'string', pattern: '^demo-[a-z0-9-]{1,40}$' }
            }
          ],
          responses: {
            200: {
              description: 'Ordered appointment list.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['data'],
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Appointment' } }
                    }
                  }
                }
              }
            },
            400: errorResponse('Invalid filter.'),
            403: errorResponse('Forbidden host or origin.'),
            404: errorResponse('Practitioner not found.'),
            500: errorResponse('Internal error.')
          }
        },
        post: {
          operationId: 'createAppointment',
          summary: 'Create appointment',
          description: 'Creates a synthetic appointment.',
          'x-body-limit-bytes': 8192,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AppointmentInput' },
                example: {
                  practitionerId: 'demo-clinica-geral',
                  patientRef: 'synthetic_001',
                  startsAt: '2030-04-08T09:00:00-03:00',
                  durationMinutes: 30
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Appointment created.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['data'],
                    properties: {
                      data: { $ref: '#/components/schemas/Appointment' }
                    }
                  }
                }
              }
            },
            400: errorResponse('Invalid input.'),
            403: errorResponse('Forbidden host or origin.'),
            404: errorResponse('Practitioner not found.'),
            409: errorResponse('Schedule conflict.'),
            413: errorResponse('Body too large.'),
            415: errorResponse('JSON body required.'),
            500: errorResponse('Internal error.')
          }
        }
      },
      '/api/appointments/{id}': {
        patch: {
          operationId: 'updateAppointmentStatus',
          summary: 'Complete or cancel appointment',
          description: 'Changes status of a scheduled appointment.',
          'x-body-limit-bytes': 8192,
          parameters: [idParam()],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StatusInput' },
                example: { status: 'cancelled' }
              }
            }
          },
          responses: {
            200: {
              description: 'Appointment with updated status.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['data'],
                    properties: {
                      data: { $ref: '#/components/schemas/Appointment' }
                    }
                  }
                }
              }
            },
            400: errorResponse('Invalid input.'),
            403: errorResponse('Forbidden host or origin.'),
            404: errorResponse('Appointment not found.'),
            409: errorResponse('Invalid transition.'),
            413: errorResponse('Body too large.'),
            415: errorResponse('JSON body required.'),
            500: errorResponse('Internal error.')
          }
        },
        delete: {
          operationId: 'deleteAppointment',
          summary: 'Delete appointment',
          description: 'Removes an appointment.',
          'x-body-limit-bytes': 8192,
          parameters: [idParam()],
          responses: {
            204: { description: 'Appointment removed.' },
            403: errorResponse('Forbidden host or origin.'),
            404: errorResponse('Appointment not found.'),
            500: errorResponse('Internal error.')
          }
        }
      },
      '/api/appointments/{id}/reschedule': {
        post: {
          operationId: 'rescheduleAppointment',
          summary: 'Reschedule appointment',
          description: 'Reschedules a scheduled appointment preserving identity.',
          'x-body-limit-bytes': 8192,
          parameters: [idParam()],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RescheduleInput' },
                example: { startsAt: '2030-04-08T10:00:00-03:00', durationMinutes: 45 }
              }
            }
          },
          responses: {
            200: {
              description: 'Rescheduled appointment.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['data'],
                    properties: {
                      data: { $ref: '#/components/schemas/Appointment' }
                    }
                  }
                }
              }
            },
            400: errorResponse('Invalid input.'),
            403: errorResponse('Forbidden host or origin.'),
            404: errorResponse('Appointment not found.'),
            409: errorResponse('Schedule conflict or invalid transition.'),
            413: errorResponse('Body too large.'),
            415: errorResponse('JSON body required.'),
            500: errorResponse('Internal error.')
          }
        }
      }
    },
    components: {
      schemas: {
        AppointmentInput: {
          type: 'object',
          additionalProperties: false,
          required: ['practitionerId', 'patientRef', 'startsAt', 'durationMinutes'],
          properties: {
            practitionerId: { type: 'string', pattern: '^demo-[a-z0-9-]{1,40}$', description: 'Catalog practitioner ID.' },
            patientRef: { type: 'string', pattern: '^[a-zA-Z0-9_-]{1,48}$', description: 'Synthetic patient reference.' },
            startsAt: inputStartsAt(),
            durationMinutes: durationMinutes()
          }
        },
        RescheduleInput: {
          type: 'object',
          additionalProperties: false,
          required: ['startsAt', 'durationMinutes'],
          properties: {
            startsAt: inputStartsAt(),
            durationMinutes: durationMinutes()
          }
        },
        StatusInput: {
          type: 'object',
          additionalProperties: false,
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['completed', 'cancelled'], description: 'Target status.' }
          }
        },
        Appointment: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'practitionerId', 'patientRef', 'startsAt', 'durationMinutes', 'status', 'createdAt'],
          properties: {
            id: { type: 'string', pattern: '^[a-f0-9-]{36}$', description: 'Appointment identifier.' },
            practitionerId: { type: 'string', pattern: '^demo-[a-z0-9-]{1,40}$', description: 'Catalog practitioner ID.' },
            patientRef: { type: 'string', pattern: '^[a-zA-Z0-9_-]{1,48}$', description: 'Synthetic patient reference.' },
            startsAt: { type: 'string', format: 'date-time', pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:00\\.000Z$', description: 'Canonical UTC timestamp .000Z with zero seconds.' },
            durationMinutes: durationMinutes(),
            status: { type: 'string', enum: ['scheduled', 'completed', 'cancelled'], description: 'Current status.' },
            createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp; generic date-time not constrained to the scheduling grid.' }
          }
        },
        Practitioner: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'name', 'specialty'],
          properties: {
            id: { type: 'string', pattern: '^demo-[a-z0-9-]{1,40}$', description: 'Catalog ID.' },
            name: { type: 'string', description: 'Display name.' },
            specialty: { type: 'string', description: 'Specialty.' }
          }
        },
        Error: {
          type: 'object',
          additionalProperties: false,
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              additionalProperties: false,
              required: ['code', 'message'],
              properties: {
                code: {
                  type: 'string',
                  enum: ['validation_error', 'invalid_json', 'json_required', 'host_forbidden', 'origin_forbidden', 'not_found', 'practitioner_not_found', 'appointment_not_found', 'schedule_conflict', 'invalid_transition', 'body_too_large', 'internal_error']
                },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  };
}
