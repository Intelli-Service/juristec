import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LGPDController } from './lgpd.controller';
import { LGPDService } from '../lib/lgpd.service';
import { AuditService } from '../lib/audit.service';
import { EncryptionService } from '../lib/encryption.service';
import Consent from '../models/Consent';
import DataSubjectRequest from '../models/DataSubjectRequest';
import AuditLog from '../models/AuditLog';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Consent', schema: Consent.schema },
      {
        name: 'DataSubjectRequest',
        schema: DataSubjectRequest.schema,
      },
      {
        name: 'AuditLog',
        schema: AuditLog.schema,
      },
    ]),
  ],
  controllers: [LGPDController],
  providers: [LGPDService, AuditService, EncryptionService],
  exports: [LGPDService, AuditService, EncryptionService],
})
export class LGPDModule {}
