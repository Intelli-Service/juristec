import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  IVerificationCode,
  VerificationCodeSchema,
} from '../models/VerificationCode';

@Injectable()
export class VerificationService {
  constructor(
    @InjectModel('VerificationCode')
    private verificationModel: Model<IVerificationCode>,
  ) {}

  /**
   * Gera código de verificação para email ou telefone
   */
  async generateCode(contact: {
    email?: string;
    phone?: string;
  }): Promise<string> {
    const code = Math.random().toString().substr(2, 6); // 6 dígitos
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    await this.verificationModel.create({
      ...contact,
      code,
      expiresAt,
      maxAttempts: 3,
    });

    return code;
  }

  /**
   * Verifica código fornecido pelo usuário
   */
  async verifyCode(
    contact: { email?: string; phone?: string },
    code: string,
  ): Promise<boolean> {
    const query = contact.email
      ? { email: contact.email }
      : { phone: contact.phone };

    const verification = await this.verificationModel
      .findOne({
        ...query,
        verified: false,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 });

    if (!verification) {
      return false;
    }

    if (verification.attempts >= verification.maxAttempts) {
      return false;
    }

    verification.attempts += 1;

    if (verification.code === code) {
      verification.verified = true;
      await verification.save();
      return true;
    }

    await verification.save();
    return false;
  }

  /**
   * Verifica se contato já foi verificado recentemente
   */
  async isVerified(contact: {
    email?: string;
    phone?: string;
  }): Promise<boolean> {
    const query = contact.email
      ? { email: contact.email }
      : { phone: contact.phone };

    const verification = await this.verificationModel.findOne({
      ...query,
      verified: true,
      expiresAt: { $gt: new Date() },
    });

    return !!verification;
  }
}
