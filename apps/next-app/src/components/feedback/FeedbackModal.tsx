'use client';

import { useState } from 'react';
import { X, Send, MessageSquare } from 'lucide-react';
import StarRating from './StarRating';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: FeedbackData) => void;
  conversationTitle?: string;
  lawyerName?: string;
}

export interface FeedbackData {
  rating: number;
  responses: {
    satisfaction: number;
    responseTime: number;
    professionalism: number;
    understanding: number;
    recommendation: number;
  };
  comment: string;
}

const questions = [
  {
    key: 'satisfaction' as const,
    label: 'Qual sua satisfação geral com o atendimento?',
    description: 'Avalie a qualidade geral do serviço'
  },
  {
    key: 'responseTime' as const,
    label: 'Velocidade de resposta',
    description: 'O profissional respondeu rapidamente?'
  },
  {
    key: 'professionalism' as const,
    label: 'Profissionalismo',
    description: 'O atendimento foi profissional e ético?'
  },
  {
    key: 'understanding' as const,
    label: 'Compreensão do problema',
    description: 'O profissional entendeu bem sua situação?'
  },
  {
    key: 'recommendation' as const,
    label: 'Você recomendaria?',
    description: 'Em uma escala de 0-10, quão provável você recomendaria?'
  }
];

export default function FeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  conversationTitle,
  lawyerName
}: FeedbackModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackData>({
    rating: 0,
    responses: {
      satisfaction: 0,
      responseTime: 0,
      professionalism: 0,
      understanding: 0,
      recommendation: 0
    },
    comment: ''
  });

  const handleRatingChange = (key: keyof FeedbackData['responses'], value: number) => {
    setFeedback(prev => ({
      ...prev,
      responses: {
        ...prev.responses,
        [key]: value
      }
    }));
  };

  const handleNext = () => {
    if (currentStep < questions.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    onSubmit(feedback);
    handleClose();
  };

  const handleClose = () => {
    setCurrentStep(0);
    setFeedback({
      rating: 0,
      responses: {
        satisfaction: 0,
        responseTime: 0,
        professionalism: 0,
        understanding: 0,
        recommendation: 0
      },
      comment: ''
    });
    onClose();
  };

  const isStepValid = () => {
    if (currentStep === 0) return feedback.rating > 0;
    if (currentStep <= questions.length) {
      const question = questions[currentStep - 1];
      return feedback.responses[question.key] > 0;
    }
    return true;
  };

  if (!isOpen) return null;

  const currentQuestion = currentStep > 0 ? questions[currentStep - 1] : null;
  const progress = ((currentStep + 1) / (questions.length + 2)) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Avaliação do Atendimento
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Passo {currentStep + 1} de {questions.length + 2}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {conversationTitle && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Conversa:</p>
              <p className="font-medium text-gray-900">{conversationTitle}</p>
              {lawyerName && (
                <p className="text-sm text-gray-600 mt-1">Advogado: {lawyerName}</p>
              )}
            </div>
          )}

          {/* Step 0: Overall Rating */}
          {currentStep === 0 && (
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Como foi sua experiência?
              </h3>
              <p className="text-gray-600 mb-6">
                Avalie o atendimento geral em estrelas
              </p>
              <StarRating
                value={feedback.rating}
                onChange={(rating) => setFeedback(prev => ({ ...prev, rating }))}
                size="lg"
              />
            </div>
          )}

          {/* Steps 1-N: Individual Questions */}
          {currentStep > 0 && currentStep <= questions.length && currentQuestion && (
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {currentQuestion.label}
              </h3>
              <p className="text-gray-600 mb-6">
                {currentQuestion.description}
              </p>
              <StarRating
                value={feedback.responses[currentQuestion.key]}
                onChange={(value) => handleRatingChange(currentQuestion.key, value)}
                size="lg"
              />
            </div>
          )}

          {/* Final Step: Comment */}
          {currentStep === questions.length + 1 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Comentários adicionais (opcional)
              </h3>
              <p className="text-gray-600 mb-4">
                Conte-nos mais sobre sua experiência ou deixe sugestões
              </p>
              <textarea
                value={feedback.comment}
                onChange={(e) => setFeedback(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="Sua opinião é muito importante para nós..."
                className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={500}
              />
              <p className="text-sm text-gray-500 mt-1">
                {feedback.comment.length}/500 caracteres
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <button
            onClick={currentStep === 0 ? handleClose : handlePrevious}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            {currentStep === 0 ? 'Pular' : 'Voltar'}
          </button>

          <div className="flex gap-3">
            {currentStep < questions.length + 1 ? (
              <button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                Próximo
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Enviar Avaliação
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}