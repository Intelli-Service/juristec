import { CaseAssignment } from '@/types/chat.types';

export const getRespondentInfo = (sender: string, caseAssigned: CaseAssignment, message?: { lawyerLicenseNumber?: string }) => {
  if (sender === 'user') {
    return { name: 'Você', role: '', color: 'text-slate-600' };
  }

  if (sender === 'lawyer') {
    const lawyerName = caseAssigned.lawyerName || 'Advogado Responsável';
    const licenseNumber = caseAssigned.lawyerLicenseNumber || message?.lawyerLicenseNumber;
    const role = licenseNumber ? `OAB ${licenseNumber}` : 'Advogado Especialista';
    
    return {
      name: lawyerName,
      role: role,
      color: 'text-purple-600',
      icon: '👨‍⚖️'
    };
  }

  if (sender === 'ai') {
    return {
      name: 'Assistente Jurídico',
      role: 'IA Inteligente',
      color: 'text-emerald-600',
      icon: '🤖'
    };
  }

  return {
    name: 'Sistema',
    role: '',
    color: 'text-slate-600',
    icon: '⚙️'
  };
};
