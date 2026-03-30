import { z } from 'zod';
import {
  insertUserSchema, insertAppointmentSchema, insertMedicalRecordSchema,
  users, patients, hospitals, appointments, medicalRecords
} from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: insertUserSchema.extend({
        specialization: z.string().optional(),
        licenseNumber: z.string().optional(),
        experience: z.string().optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        dateOfBirth: z.string().optional(),
        gender: z.string().optional(),
        contactNumber: z.string().optional(),
        emergencyContact: z.string().optional(),
      }),
      responses: {
        201: z.object({ user: z.custom<any>(), token: z.string() }),
        400: errorSchemas.validation,
      }
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.object({ user: z.custom<any>(), token: z.string() }),
        401: errorSchemas.unauthorized,
      }
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.object({ user: z.custom<any>() }),
        401: errorSchemas.unauthorized,
      }
    },
    changePassword: {
      method: 'PATCH' as const,
      path: '/api/auth/change-password' as const,
      input: z.object({ currentPassword: z.string(), newPassword: z.string() }),
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    },
    resetPassword: {
      method: 'POST' as const,
      path: '/api/auth/reset-password' as const,
      input: z.object({ username: z.string(), email: z.string().email(), newPassword: z.string() }),
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      }
    },
    updateProfile: {
      method: 'PATCH' as const,
      path: '/api/user/profile' as const,
      input: z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        bloodGroup: z.string().optional(),
        specialization: z.string().optional(),
        experience: z.string().optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        dateOfBirth: z.string().optional(),
        gender: z.string().optional(),
        contactNumber: z.string().optional(),
        emergencyContact: z.string().optional(),
      }),
      responses: {
        200: z.object({ user: z.custom<any>(), message: z.string() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    }
  },
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users' as const,
      responses: {
        200: z.array(z.custom<any>()),
      }
    }
  },
  patients: {
    get: {
      method: 'GET' as const,
      path: '/api/patients/:healthId' as const,
      responses: {
        200: z.custom<any>(),
        404: errorSchemas.notFound,
      }
    }
  },
  hospitals: {
    list: {
      method: 'GET' as const,
      path: '/api/hospitals' as const,
      responses: {
        200: z.array(z.custom<any>()),
      }
    }
  },
  appointments: {
    list: {
      method: 'GET' as const,
      path: '/api/appointments' as const,
      responses: {
        200: z.array(z.custom<any>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/appointments' as const,
      input: z.object({ hospitalId: z.number(), doctorId: z.number().optional(), department: z.string().optional(), date: z.string(), time: z.string(), notes: z.string().optional() }),
      responses: {
        201: z.custom<any>(),
      }
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/appointments/:id/status' as const,
      input: z.object({ status: z.string() }),
      responses: {
        200: z.custom<any>(),
      }
    }
  },
  records: {
    list: {
      method: 'GET' as const,
      path: '/api/records' as const,
      input: z.object({ patientId: z.number().optional() }).optional(),
      responses: {
        200: z.array(z.custom<any>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/records' as const,
      input: z.object({
        patientId: z.number().optional(),
        title: z.string(),
        description: z.string().optional(),
        type: z.string(),
        fileUrl: z.string().optional()
      }),
      responses: {
        201: z.custom<any>(),
      }
    }
  },
  ai: {
    summary: {
      method: 'POST' as const,
      path: '/api/ai/summary' as const,
      input: z.object({ patientId: z.number() }),
      responses: {
        200: z.object({ summary: z.string() }),
      }
    },
    chat: {
      method: 'POST' as const,
      path: '/api/ai/chat' as const,
      input: z.object({ message: z.string() }),
      responses: {
        200: z.object({ reply: z.string() }),
      }
    },
    ocr: {
      method: 'POST' as const,
      path: '/api/ai/ocr' as const,
      input: z.object({ fileUrl: z.string() }),
      responses: {
        200: z.object({ text: z.string() }),
      }
    }
  },
  admin: {
    stats: {
      method: 'GET' as const,
      path: '/api/admin/stats' as const,
      responses: {
        200: z.object({
          patients: z.number(),
          doctors: z.number(),
          hospitals: z.number(),
          totalUsers: z.number(),
        }),
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
