import { z } from "zod";

export const registrationCredentials = z.object({
  username: z.string().trim().toLowerCase().min(3, "用户名至少 3 位").max(20, "用户名最多 20 位").regex(/^[a-z0-9_]+$/, "用户名使用字母、数字和下划线"),
  password: z.string().min(8, "密码至少 8 位").max(72, "密码最多 72 位").refine(value => new TextEncoder().encode(value).length <= 72, "密码 UTF-8 长度不能超过 72 字节"),
  confirmPassword: z.string().min(1, "请再次输入密码").max(72, "确认密码最多 72 位"),
}).refine(value => value.password === value.confirmPassword, { message: "两次输入的密码不一致，请重新确认", path: ["confirmPassword"] });
export type RegistrationCredentials = z.infer<typeof registrationCredentials>;
export type RegistrationChallenge = { id: string; image: string; expiresAt: number };
