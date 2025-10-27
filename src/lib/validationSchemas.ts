import { z } from "zod";

// Phone validation: accepts various formats, 10-15 digits
const phoneRegex = /^[\d\s\-\(\)]{10,20}$/;

// Lead validation schema
export const leadSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras"),
  telefone: z
    .string()
    .trim()
    .regex(phoneRegex, "Telefone inválido. Use formato: (11) 99999-9999"),
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .max(255, "Email deve ter no máximo 255 caracteres")
    .optional()
    .or(z.literal("")),
});

export type LeadFormData = z.infer<typeof leadSchema>;

// User validation schema
export const userSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .max(255, "Email deve ter no máximo 255 caracteres"),
  telefone: z
    .string()
    .trim()
    .regex(phoneRegex, "Telefone inválido")
    .optional()
    .or(z.literal("")),
  role: z.enum(["admin", "gestor", "corretor"]),
  gestorId: z.string().uuid("ID do gestor inválido").optional().or(z.literal("")),
  status: z.enum(["ativo", "inativo"]),
});

export type UserFormData = z.infer<typeof userSchema>;

// Campaign validation schema
export const campanhaSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .regex(/^[a-zA-Z0-9À-ÿ\s\-_]+$/, "Nome contém caracteres inválidos"),
});

export type CampanhaFormData = z.infer<typeof campanhaSchema>;
