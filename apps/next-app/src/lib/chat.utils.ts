import { CaseAssignment } from '@/types/chat.types';

export const getRespondentInfo = (sender: string, caseAssigned: CaseAssignment) => {
  if (sender === 'user') {
    return { name: 'Você', role: '', color: 'text-slate-600' };
  }

  if (sender === 'lawyer' || (caseAssigned.assigned && sender === 'ai')) {
    return {
      name: caseAssigned.lawyerName || 'Advogado Responsável',
      role: 'Advogado Especialista',
      color: 'text-purple-600',
      icon: '👨‍⚖️'
    };
  }

  return {
    name: 'Assistente Jurídico',
    role: 'IA Inteligente',
    color: 'text-emerald-600',
    icon: '🤖'
  };
};
