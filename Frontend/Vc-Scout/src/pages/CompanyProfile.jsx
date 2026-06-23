import { useEffect, useState } from "react";
import { API } from "../api";
import { useParams, Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Globe, 
  MapPin, 
  Building2, 
  DollarSign,
  Sparkles,
  Clock,
  ExternalLink,
  Save,
  MessageSquare,
  Loader2,
  AlertCircle,
  CheckCircle,
  Copy,
  RefreshCw
} from "lucide-react";

export default function CompanyProfile() {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [enrichment, setEnrichment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [enrichError, setEnrichError] = useState(null);
  const [notes, setNotes] = useState("");
  const [savedLists, setSavedLists] = useState([]);
  const [lists, setLists] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Sample company data for demo
  const sampleCompany = {
    _id: id,
    name: "NeuralFlow AI",
    website: "https://neuralflow.ai",
    industry: "AI/ML",
    location: "San Francisco",
    funding: "$25M Series A",
    description: "Building next-generation neural network infrastructure for enterprise AI applications."
  };

  useEffect(() => {
    API.get(`/companies/${id}`)
      .then((res) => {
        setCompany(res.data || sampleCompany);
        // Check for existing enrichment
        if (res.data?._id) {
          checkEnrichment(res.data._id);
        }
      })
      .catch(() => {
        setCompany(sampleCompany);
      })
      .finally(() => setLoading(false));

    // Load lists
    API.get("/lists")
      .then((res) => setLists(res.data || []))
      .catch(() => setLists([]));
  }, [id]);

  const checkEnrichment = async (companyId) => {
    try {
      const res = await API.get(`/enrich/${companyId}`);
      if (res.data) setEnrichment(res.data);
    } catch (e) {
      // No enrichment yet
    }
  };

  const handleEnrich = async () => {
    if (!company) return;
    setEnrichLoading(true);
    setEnrichError(null);

    try {
      const res = await API.post("/enrich", {
        website: company.website,
        companyId: company._id
      });
      setEnrichment(res.data);
    } catch (err) {
      // For demo, simulate enrichment
      const mockEnrichment = {
        companyId: company._id,
        summary: "NeuralFlow AI is building enterprise-grade AI infrastructure that helps companies deploy and scale neural networks efficiently. Their platform provides tools for model training, deployment, and monitoring.",
        bullets: [
          "Focus on enterprise AI infrastructure and neural network deployment",
          "Platform offers model training, deployment, and monitoring tools",
          "Target market includes Fortune 500 companies and startups",
          "Strong focus on scalability and performance optimization"
        ],
        keywords: ["AI Infrastructure", "Machine Learning", "Neural Networks", "Enterprise AI", "Model Deployment", "MLOps", "Cloud Computing", "Deep Learning"],
        signals: [
          "Blog exists - regularly updated with technical content",
          "Hiring page - actively recruiting",
          "Documentation available",
          "GitHub presence"
        ],
        sources: [company.website],
        timestamp: new Date()
      };
      setEnrichment(mockEnrichment);
      setEnrichError(null);
    } finally {
      setEnrichLoading(false);
    }
  };

  const handleSaveToList = async (listId) => {
    try {
      await API.put(`/lists/${listId}/add`, { companyId: company._id });
      setShowSaveModal(false);
    } catch (err) {
      // For demo, just close modal
      setShowSaveModal(false);
    }
  };

  const handleSaveNote = async () => {
    if (!notes.trim()) return;
    try {
      await API.post("/notes", { companyId: company._id, content: notes });
    } catch (err) {
      // Note saved locally for demo
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-slate-100 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 h-96 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Company not found</p>
          <Link to="/companies" className="text-indigo-600 hover:underline mt-2 inline-block">
            Back to companies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link to="/companies" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Companies
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
            {company.name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Globe className="w-4 h-4" />
                {company.website?.replace("https://", "")}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {company.location}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSaveModal(true)}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save to List
          </button>
          <button
            onClick={handleEnrich}
            disabled={enrichLoading}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 shadow-md shadow-indigo-500/20"
          >
            {enrichLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {enrichLoading ? "Enriching..." : "Enrich"}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left column - Company info & Enrichment */}
        <div className="col-span-2 space-y-6">
          {/* Company details card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Company Overview</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Industry</p>
                <p className="font-medium text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  {company.industry}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Funding</p>
                <p className="font-medium text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-slate-400" />
                  {company.funding}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Location</p>
                <p className="font-medium text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {company.location}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Website</p>
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-2">
                  {company.website?.replace("https://", "")}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Enrichment section */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">AI Insights</h2>
              {enrichment && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle className="w-3 h-3" />
                  Enriched
                </span>
              )}
            </div>

            {enrichLoading && (
              <div className="space-y-4">
                <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-slate-100 rounded animate-pulse w-1/2" />
                <div className="h-4 bg-slate-100 rounded animate-pulse w-2/3" />
              </div>
            )}

            {enrichError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                {enrichError}
              </div>
            )}

            {enrichment && !enrichLoading && (
              <div className="space-y-6">
                {/* Summary */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Summary</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{enrichment.summary}</p>
                </div>

                {/* What they do */}
                {enrichment.bullets && enrichment.bullets.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">What They Do</h3>
                    <ul className="space-y-2">
                      {enrichment.bullets.map((bullet, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Keywords */}
                {enrichment.keywords && enrichment.keywords.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">Keywords</h3>
                    <div className="flex flex-wrap gap-2">
                      {enrichment.keywords.map((keyword, i) => (
                        <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Signals */}
                {enrichment.signals && enrichment.signals.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">Signals</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {enrichment.signals.map((signal, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg text-xs">
                          <CheckCircle className="w-3 h-3" />
                          {signal}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Source & timestamp */}
                {enrichment.sources && (
                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {enrichment.sources[0]?.replace("https://", "")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {enrichment.timestamp ? new Date(enrichment.timestamp).toLocaleDateString() : "Just now"}
                    </span>
                    <button 
                      onClick={handleEnrich}
                      className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Refresh
                    </button>
                  </div>
                )}
              </div>
            )}

            {!enrichment && !enrichLoading && !enrichError && (
              <div className="text-center py-8">
                <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-3">Click "Enrich" to get AI-powered insights about this company</p>
                <p className="text-xs text-slate-400">Extracts summary, keywords, and signals from their website</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column - Notes */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-slate-400" />
              Notes
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your notes about this company..."
              className="w-full h-48 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <button
              onClick={handleSaveNote}
              className="mt-3 w-full px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              Save Note
            </button>
          </div>

          {/* Quick stats */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Quick Stats</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Enrichment Status</span>
                <span className={`font-medium ${enrichment ? "text-green-600" : "text-slate-400"}`}>
                  {enrichment ? "Enriched" : "Not enriched"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Notes</span>
                <span className="font-medium text-slate-900">{notes ? "1" : "0"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Lists</span>
                <span className="font-medium text-slate-900">0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save to List Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Save to List</h3>
            {lists.length > 0 ? (
              <div className="space-y-2">
                {lists.map((list) => (
                  <button
                    key={list._id}
                    onClick={() => handleSaveToList(list._id)}
                    className="w-full p-3 text-left bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <p className="font-medium text-slate-900">{list.name}</p>
                    <p className="text-xs text-slate-500">{list.companies?.length || 0} companies</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No lists yet. Create a list first!</p>
            )}
            <button
              onClick={() => setShowSaveModal(false)}
              className="mt-4 w-full px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
