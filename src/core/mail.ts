import nodemailer from "nodemailer";
import { HttpError } from "@/core/http";

function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM?.trim() || user;
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE !== "false";
  const loopback = host === "127.0.0.1" || host === "localhost" || host === "::1";
  if (!host || !from || !Number.isInteger(port) || port < 1 || port > 65535 || /[\r\n]/.test(from) || (!loopback && (!user || !pass))) return null;
  return { host, port, secure, from, auth: user && pass ? { user, pass } : undefined,
    // Require encrypted SMTP off-host; the loopback exception supports local relays and isolated tests.
    requireTLS: !secure && !loopback,
    connectionTimeout: 12_000, greetingTimeout: 12_000, socketTimeout: 20_000,
    disableFileAccess: true, disableUrlAccess: true, logger: false as const, debug: false };
}

export function mailConfigured() { return smtpConfig() !== null; }

export async function sendPasswordCode(email: string, code: string) {
  const config = smtpConfig();
  if (!config) throw new HttpError(503, "邮件验证服务尚未配置，请联系站点管理员完成发信设置");
  const transport = nodemailer.createTransport(config);
  try {
    await transport.sendMail({ from: config.from, to: email, subject: "不说再见 · 修改密码验证码",
      text: `你的修改密码验证码是：${code}\nVerification code: ${code}\n\n验证码 10 分钟内有效，只能使用一次。请勿将验证码转告他人。\n如果不是你本人操作，请忽略此邮件，当前密码不会发生变化。`,
      disableFileAccess: true, disableUrlAccess: true });
  } catch {
    // Transport diagnostics can contain credentials or mail content; never log them.
    throw new HttpError(502, "验证码邮件未能发送，请稍后重试或联系站点管理员");
  } finally { transport.close(); }
}
