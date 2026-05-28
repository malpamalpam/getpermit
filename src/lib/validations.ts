import { z } from "zod";

export const contactFormSchema = z
  .object({
    senderType: z.enum(["firma", "cudzoziemiec"], {
      required_error: "required",
      invalid_type_error: "required",
    }),
    companyName: z.string().optional().or(z.literal("")),
    fullName: z.string().optional().or(z.literal("")),
    email: z.string().email("email"),
    phone: z.string().optional().or(z.literal("")),
    service: z.string().optional().or(z.literal("")),
    message: z.string().min(10, "min:10"),
    consent: z.literal(true, {
      errorMap: () => ({ message: "consent" }),
    }),
    // Honeypot — must be empty
    website: z.string().max(0).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.senderType === "firma" && !data.companyName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "required",
        path: ["companyName"],
      });
    }
    if (data.senderType === "cudzoziemiec" && !data.fullName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "required",
        path: ["fullName"],
      });
    }
  });

export type ContactFormValues = z.infer<typeof contactFormSchema>;
