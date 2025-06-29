interface LoadingModalProps {
  isVisible: boolean;
  message?: string;
}

export const LoadingModal = ({ isVisible, message = "Le compagnon réfléchit à votre question" }: LoadingModalProps) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="glass-card rounded-lg p-8 max-w-sm mx-4 text-center animate-fade-in">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-slow">
          <i className="fas fa-heart text-white text-2xl"></i>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Connexion spirituelle...</h3>
        <p className="text-slate-300 text-sm">{message}</p>
      </div>
    </div>
  );
};
