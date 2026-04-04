import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

function goBack(navigate: ReturnType<typeof useNavigate>) {
  if (window.history.state?.idx > 0) {
    navigate(-1);
  } else {
    navigate("/");
  }
}

interface LegalTextViewerProps {
  title: string;
  content: string;
}

export default function LegalTextViewer({ title, content }: LegalTextViewerProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => goBack(navigate)}
            aria-label="Go back"
            className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-2"
          >
            <ArrowLeft size={20} className="text-slate-400" />
          </button>
          <h1 className="text-sm font-semibold text-white truncate">{title}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto p-4 pb-12">
        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
          {content}
        </div>
      </div>
    </div>
  );
}
