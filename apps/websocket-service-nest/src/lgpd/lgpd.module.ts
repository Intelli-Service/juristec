import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LGPDController } from './lgpd.controller';
import { LGPDService } from '../lib/lgpd.service';
import { AuditService } from '../lib/audit.service';
import { EncryptionService } from '../lib/encryption.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Consent', schema: require('../models/Consent').default.schema },
      { name: 'DataSubjectRequest', schema: require('../models/DataSubjectRequest').default.schema },
      { name: 'AuditLog', schema: require('../models/AuditLog').default.schema },
    ]),
  ],
  controllers: [LGPDController],
  providers: [LGPDService, AuditService, EncryptionService],
  exports: [LGPDService, AuditService, EncryptionService],
})
export class LGPDModule {}