import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import SmsClient, { SendSmsRequest } from "@alicloud/dysmsapi20170525";
import { $OpenApiUtil } from "@alicloud/openapi-core";
import { RuntimeOptions } from "@darabonba/typescript";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/core/prisma";
import { HttpError } from "@/core/http";
export const phoneSchema = z.string().trim().regex(/^1[3-9]\d{9}$/, "请输入有效的 11 位手机号");
export function smsConfigured() {
  return Boolean(process.env.SMS_ACCESS_KEY_ID && process.env.SMS_ACCESS_KEY_SECRET && process.env.SMS_SIGN_NAME && process.env.SMS_TEMPLATE_CODE);
}
export function smsCodeHash(phone: string, code: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new HttpError(503, "短信验证暂不可用");
  return createHmac("sha256", secret).update(`register:${phone}:${code}`).digest("hex");
}
export async function sendRegistrationCode(phone: string) {
  if (!smsConfigured()) throw new HttpError(503, "手机验证暂未开通，请使用 GitHub 登录或稍后再试");
  if (await prisma.user.findUnique({ where: { phone }, select: { id: true } })) throw new HttpError(409, "该手机号已注册，请直接登录");
  const code = String(randomInt(100000, 1000000));
  const codeHash = smsCodeHash(phone, code);
  const now = new Date();
  await prisma.$transaction(async tx => {
    const previous = await tx.smsChallenge.findUnique({ where: { phone } });
    if (previous && now.getTime() - previous.createdAt.getTime() < 60_000) throw new HttpError(429, "验证码已发送，请 60 秒后再试");
    await tx.smsChallenge.upsert({ where: { phone }, create: { phone, codeHash, expiresAt: new Date(now.getTime() + 300_000), createdAt: now }, update: { codeHash, expiresAt: new Date(now.getTime() + 300_000), createdAt: now, attempts: 0 } });
  });
  try {
    const client = new SmsClient(new $OpenApiUtil.Config({
      accessKeyId: process.env.SMS_ACCESS_KEY_ID, accessKeySecret: process.env.SMS_ACCESS_KEY_SECRET,
      endpoint: "dysmsapi.aliyuncs.com", regionId: "cn-hangzhou", protocol: "HTTPS",
    }));
    const response = await client.sendSmsWithOptions(new SendSmsRequest({
      phoneNumbers: phone, signName: process.env.SMS_SIGN_NAME, templateCode: process.env.SMS_TEMPLATE_CODE,
      templateParam: JSON.stringify({ code }),
    }), new RuntimeOptions({ connectTimeout: 5000, readTimeout: 10000, autoretry: false }));
    if (response.body?.code !== "OK") {
      console.warn("SMS send rejected", { code: response.body?.code, requestId: response.body?.requestId });
      throw new HttpError(502, response.body?.code === "isv.BUSINESS_LIMIT_CONTROL" ? "短信发送较频繁，请稍后重试" : "验证码发送失败，请稍后重试");
    }
  } catch (error) {
    await prisma.smsChallenge.deleteMany({ where: { phone, codeHash } });
    if (error instanceof HttpError) throw error;
    // SDK errors can contain signed requests. Never log the full error or request.
    throw new HttpError(502, "短信服务暂时不可用，请稍后重试");
  }
}
// Return failures instead of throwing inside the transaction so attempt counts persist.
export async function checkRegistrationCode(tx: Prisma.TransactionClient, phone: string, code: string): Promise<string | null> {
  const challenge = await tx.smsChallenge.findUnique({ where: { phone } });
  if (!challenge || challenge.expiresAt.getTime() <= Date.now()) return "验证码已过期或尚未获取，请重新获取";
  if (challenge.attempts >= 5) return "验证码尝试次数过多，请重新获取";
  await tx.smsChallenge.update({ where: { phone }, data: { attempts: { increment: 1 } } });
  const expected = Buffer.from(challenge.codeHash, "hex");
  const actual = Buffer.from(smsCodeHash(phone, code), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return "验证码不正确，请检查后重试";
  return null;
}
