import { z } from "zod";
import { normalizarTelefone } from "@/lib/phoneNormalization";

// Phone validation using normalization
const phoneRefine = (val: string) => {
  if (!val) return false;
  const result = normalizarTelefone(val);
  return result.validacao !== "invalido";
};

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
    .refine(phoneRefine, {
      message: "Telefone inválido. Use formato: (11) 99999-9999 ou similar"
    }),
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
    .refine(phoneRefine, {
      message: "Telefone inválido"
    })
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
